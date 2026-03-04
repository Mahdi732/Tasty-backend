import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { assertStrongPassword } from '../security/password.policy.js';
import { ROLES } from '../constants/roles.js';

export class AuthService {
  constructor({ userRepository, passwordHasher, tokenService, sessionService, auditService, emailVerificationService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.auditService = auditService;
    this.emailVerificationService = emailVerificationService;
  }

  async register(payload, context) {
    const existingUser = await this.userRepository.findByEmail(payload.email);
    if (existingUser) {
      throw new ApiError(409, ERROR_CODES.AUTH_EMAIL_EXISTS, 'Email already registered');
    }

    assertStrongPassword(payload.password);
    const passwordHash = await this.passwordHasher.hash(payload.password);

    const user = await this.userRepository.create({
      email: payload.email,
      passwordHash,
      roles: [ROLES.USER],
      isEmailVerified: false,
      emailVerifiedAt: null,
      status: 'pending_email_verification',
    });

    if (this.emailVerificationService && this.emailVerificationService.env.EMAIL_VERIFICATION_ENABLED) {
      await this.emailVerificationService.startVerification(user.email, context);
    }

    this.auditService.log('auth.register_success', { userId: user.id, email: user.email, ipAddress: context.ipAddress });

    return {
      user: { id: user.id, email: user.email, roles: user.roles },
      verificationRequired: !user.isEmailVerified,
    };
  }

  async login(payload, context) {
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user || !user.passwordHash) {
      this.auditService.log('auth.login_failed', { email: payload.email, reason: 'invalid_credentials', ipAddress: context.ipAddress });
      throw new ApiError(401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ApiError(423, ERROR_CODES.AUTH_FORBIDDEN, 'Account temporarily locked');
    }

    const validPassword = await this.passwordHasher.verify(user.passwordHash, payload.password);
    if (!validPassword) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 10) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginCount = 0;
      }
      await this.userRepository.save(user);
      this.auditService.log('auth.login_failed', { userId: user.id, email: user.email, reason: 'invalid_credentials', ipAddress: context.ipAddress });
      throw new ApiError(401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials');
    }

    if (user.status === 'pending_email_verification' || !user.isEmailVerified) {
      throw new ApiError(
        403,
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        'Verify your email',
        undefined,
        { verificationRequired: true }
      );
    }

    if (user.status !== 'active') {
      throw new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Account disabled');
    }

    user.failedLoginCount = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const tokens = await this.tokenService.issueTokensForUser(user, context);
    this.auditService.log('auth.login_success', { userId: user.id, ipAddress: context.ipAddress, sessionId: tokens.session.sessionId });

    return {
      user: { id: user.id, email: user.email, roles: user.roles },
      ...tokens,
    };
  }

  async refresh(refreshToken, context) {
    const { sessionId } = this.tokenService.parseRefreshToken(refreshToken);
    const session = await this.sessionService.getBySessionId(sessionId);
    if (!session) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid refresh token');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user || user.status !== 'active') {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid refresh token');
    }

    const tokens = await this.tokenService.rotateRefreshToken(refreshToken, {
      ...context,
      user,
    });

    this.auditService.log('auth.refresh_success', { userId: user.id, sessionId: tokens.session.sessionId, ipAddress: context.ipAddress });

    return {
      user: { id: user.id, email: user.email, roles: user.roles },
      ...tokens,
    };
  }

  async logoutByAccessSession(userId, sessionId) {
    const result = await this.sessionService.revokeSession(userId, sessionId);
    this.auditService.log('auth.logout_session', { userId, sessionId });
    return result;
  }

  async logoutByRefreshToken(userId, refreshToken) {
    const { sessionId } = this.tokenService.parseRefreshToken(refreshToken);
    const result = await this.sessionService.revokeSession(userId, sessionId);
    this.auditService.log('auth.logout_session', { userId, sessionId });
    return result;
  }

  async logoutAll(userId, exceptCurrentSession) {
    const result = await this.sessionService.revokeAll(userId, exceptCurrentSession);
    this.auditService.log('auth.logout_all', { userId, exceptCurrentSession });
    return result;
  }

  async startEmailVerification(payload, context) {
    if (!this.emailVerificationService?.env.EMAIL_VERIFICATION_ENABLED) {
      return { sent: true };
    }
    return this.emailVerificationService.startVerification(payload.email, context);
  }

  async verifyEmail(payload, context) {
    if (!this.emailVerificationService?.env.EMAIL_VERIFICATION_ENABLED) {
      return { verified: true };
    }
    return this.emailVerificationService.verifyCode(payload.email, payload.code, context);
  }

  async requestEmailChange() {
    return { scaffolded: true };
  }
}
