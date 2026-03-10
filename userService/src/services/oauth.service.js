import crypto from 'crypto';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/user-status.js';

export class OAuthService {
  constructor({
    env,
    redisClient,
    oauthProviderFactory,
    oauthClientConfigResolver,
    oauthAccountRepository,
    userRepository,
    tokenService,
    auditService,
  }) {
    this.env = env;
    this.redis = redisClient;
    this.oauthProviderFactory = oauthProviderFactory;
    this.oauthClientConfigResolver = oauthClientConfigResolver;
    this.oauthAccountRepository = oauthAccountRepository;
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.auditService = auditService;
  }

  buildPkceVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  buildCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  async start(providerName, { mode, platform, currentUserId }) {
    const provider = this.oauthProviderFactory.getProvider(providerName);
    const clientConfig = this.oauthClientConfigResolver.resolve(providerName, platform);
    const state = crypto.randomBytes(24).toString('base64url');

    const statePayload = {
      provider: providerName,
      platform: clientConfig.platform,
      mode,
      currentUserId: currentUserId || null,
    };

    let codeVerifier = null;
    let codeChallenge = null;
    if (clientConfig.clientType === 'public') {
      codeVerifier = this.buildPkceVerifier();
      codeChallenge = this.buildCodeChallenge(codeVerifier);
      statePayload.codeVerifier = codeVerifier;
    }

    await this.redis.set(`oauth:state:${state}`, JSON.stringify(statePayload), {
      EX: this.env.OAUTH_STATE_TTL_SECONDS,
    });

    return {
      authorizationUrl: provider.getAuthorizationUrl({
        state,
        codeChallenge,
        clientConfig,
      }),
      state,
      mode,
      platform: clientConfig.platform,
      clientType: clientConfig.clientType,
      pkceRequired: clientConfig.clientType === 'public',
    };
  }

  async callback(providerName, { code, state }, context) {
    const stateKey = `oauth:state:${state}`;
    const stateRaw = await this.redis.get(stateKey);
    if (!stateRaw) {
      throw new ApiError(400, ERROR_CODES.OAUTH_PROVIDER_ERROR, 'Invalid OAuth state');
    }
    await this.redis.del(stateKey);

    const stateData = JSON.parse(stateRaw);
    if (stateData.provider !== providerName) {
      throw new ApiError(400, ERROR_CODES.OAUTH_PROVIDER_ERROR, 'OAuth state/provider mismatch');
    }

    const provider = this.oauthProviderFactory.getProvider(providerName);
    const clientConfig = this.oauthClientConfigResolver.resolve(providerName, stateData.platform);

    let profile;
    try {
      profile = await provider.exchangeCodeForProfile({
        code,
        codeVerifier: stateData.codeVerifier,
        clientConfig,
      });
    } catch (error) {
      this.auditService.log('oauth.exchange_failed', {
        provider: providerName,
        platform: stateData.platform,
        ipAddress: context.ipAddress,
        reason: error.message,
      });
      throw new ApiError(401, ERROR_CODES.OAUTH_PROVIDER_ERROR, 'OAuth authentication failed');
    }

    if (stateData.mode === 'link') {
      if (!stateData.currentUserId) {
        throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Linking requires authenticated user');
      }
      return this.linkProviderAccount(stateData.currentUserId, profile);
    }

    return this.loginOrRegister(profile, context);
  }

  async linkProviderAccount(userId, profile) {
    const existingProviderAccount = await this.oauthAccountRepository.findByProviderAndProviderUserId(
      profile.provider,
      profile.providerUserId
    );

    if (existingProviderAccount && String(existingProviderAccount.userId) !== String(userId)) {
      throw new ApiError(409, ERROR_CODES.OAUTH_LINK_CONFLICT, 'Provider account already linked to another user');
    }

    const alreadyLinked = await this.oauthAccountRepository.findByUserAndProvider(userId, profile.provider);
    if (alreadyLinked) {
      return { linked: true, provider: profile.provider };
    }

    await this.oauthAccountRepository.create({
      userId,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      providerEmail: profile.email,
      emailVerifiedAt: profile.emailVerified ? new Date() : null,
      profile: profile.profile,
    });

    return { linked: true, provider: profile.provider };
  }

  async loginOrRegister(profile, context) {
    let user = null;
    const existingProviderAccount = await this.oauthAccountRepository.findByProviderAndProviderUserId(
      profile.provider,
      profile.providerUserId
    );

    if (existingProviderAccount) {
      user = await this.userRepository.findById(existingProviderAccount.userId);
      await this.oauthAccountRepository.updateLoginMeta(existingProviderAccount.id, { lastLoginAt: new Date() });
    } else if (profile.email) {
      const userByEmail = await this.userRepository.findByEmail(profile.email);
      if (userByEmail) {
        if (!(this.env.ALLOW_AUTO_LINK_VERIFIED_OAUTH_EMAIL && profile.emailVerified)) {
          throw new ApiError(
            409,
            ERROR_CODES.OAUTH_LINK_CONFLICT,
            'Existing account found. Use authenticated linking flow to connect provider.'
          );
        }
        user = userByEmail;
      }
    }

    if (!user) {
      const emailVerified = Boolean(profile.emailVerified);
      user = await this.userRepository.create({
        email: profile.email || `${profile.providerUserId}@${profile.provider}.oauth.local`,
        passwordHash: null,
        roles: [ROLES.USER],
        isEmailVerified: emailVerified,
        emailVerifiedAt: emailVerified ? new Date() : null,
        isFaceVerified: false,
        faceIdentityId: null,
        activationDeadline: emailVerified
          ? new Date(Date.now() + this.env.ACCOUNT_FACE_ACTIVATION_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
          : null,
        status: emailVerified
          ? USER_STATUS.PENDING_FACE_ACTIVATION
          : USER_STATUS.PENDING_EMAIL_VERIFICATION,
      });
    }

    if (!existingProviderAccount) {
      await this.oauthAccountRepository.create({
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: profile.email,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        profile: profile.profile,
      });
    }

    const tokens = await this.tokenService.issueTokensForUser(user, context);
    this.auditService.log('oauth.login_success', {
      provider: profile.provider,
      userId: user.id,
      sessionId: tokens.session.sessionId,
      ipAddress: context.ipAddress,
    });

    return {
      user: { id: user.id, email: user.email, roles: user.roles },
      ...tokens,
    };
  }

  async unlinkProvider(userId, providerName) {
    const deleted = await this.oauthAccountRepository.deleteByUserAndProvider(userId, providerName);
    if (!deleted) {
      throw new ApiError(404, ERROR_CODES.OAUTH_NOT_SUPPORTED, 'Linked provider account not found');
    }
    return { unlinked: true, provider: providerName };
  }
}
