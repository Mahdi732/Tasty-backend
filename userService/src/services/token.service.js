import { v4 as uuidv4 } from 'uuid';
import { hmacSha256 } from '../security/crypto.utils.js';
import { timingSafeEqualHex } from '../security/timing-safe.js';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class TokenService {
  constructor({ env, tokenGenerator, jwtSigner, sessionRepository, redisClient, auditService }) {
    this.env = env;
    this.tokenGenerator = tokenGenerator;
    this.jwtSigner = jwtSigner;
    this.sessionRepository = sessionRepository;
    this.redis = redisClient;
    this.auditService = auditService;
  }

  hashRefreshToken(refreshToken) {
    return hmacSha256(this.env.TOKEN_HASH_SECRET, refreshToken);
  }

  parseRefreshToken(refreshToken) {
    const [sessionId, secret] = (refreshToken || '').split('.');
    if (!sessionId || !secret) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid refresh token');
    }
    return { sessionId, secret };
  }

  async issueTokensForUser(user, context, existingFamilyId = null, existingSessionId = null) {
    const sessionId = existingSessionId || this.tokenGenerator.createSessionId();
    const familyId = existingFamilyId || this.tokenGenerator.createFamilyId();

    const refreshSecret = this.tokenGenerator.createRefreshSecret();
    const refreshToken = this.tokenGenerator.buildRefreshToken(sessionId, refreshSecret);
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    if (!existingSessionId) {
      await this.sessionRepository.create({
        userId: user.id,
        sessionId,
        familyId,
        refreshTokenHash,
        tokenVersion: 1,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        deviceId: context.deviceId || null,
        lastUsedAt: now,
        expiresAt,
      });
    } else {
      const session = await this.sessionRepository.findBySessionId(existingSessionId);
      session.previousRefreshTokenHash = session.refreshTokenHash;
      session.refreshTokenHash = refreshTokenHash;
      session.tokenVersion += 1;
      session.lastUsedAt = now;
      session.expiresAt = expiresAt;
      await this.sessionRepository.save(session);

      // Security: keep recently rotated token hashes in Redis to detect replay attempts.
      await this.redis.set(
        `rt:used:${session.previousRefreshTokenHash}`,
        session.familyId,
        { EX: this.env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 }
      );
    }

    const accessToken = await this.jwtSigner.signAccessToken({
      sub: user.id,
      roles: user.roles,
      status: user.status,
      verification: {
        email: Boolean(user.isEmailVerified),
        phone: Boolean(user.isPhoneVerified),
        face: Boolean(user.isFaceVerified),
      },
      sid: sessionId,
      jti: uuidv4(),
      typ: 'access',
    });

    return {
      accessToken,
      accessTokenExpiresIn: this.env.JWT_ACCESS_TTL_SECONDS,
      refreshToken,
      session: { sessionId, familyId, expiresAt },
    };
  }

  async rotateRefreshToken(refreshToken, context) {
    const { sessionId } = this.parseRefreshToken(refreshToken);
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid refresh token');
    }

    const incomingHash = this.hashRefreshToken(refreshToken);

    const usedKey = `rt:used:${incomingHash}`;
    const usedFamily = await this.redis.get(usedKey);
    const isCurrent = timingSafeEqualHex(incomingHash, session.refreshTokenHash);
    const isPrevious = session.previousRefreshTokenHash
      ? timingSafeEqualHex(incomingHash, session.previousRefreshTokenHash)
      : false;

    if (usedFamily || isPrevious) {
      await this.sessionRepository.revokeFamily(session.familyId, 'refresh_reuse_detected');
      this.auditService.log('auth.refresh_reuse_detected', {
        userId: String(session.userId),
        sessionId: session.sessionId,
        familyId: session.familyId,
        ipAddress: context.ipAddress,
      });
      throw new ApiError(409, ERROR_CODES.AUTH_TOKEN_REUSE_DETECTED, 'Refresh token reuse detected');
    }

    if (!isCurrent) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid refresh token');
    }

    const user = context.user;
    return this.issueTokensForUser(user, context, session.familyId, session.sessionId);
  }

  async revokeBySessionId(sessionId) {
    const revoked = await this.sessionRepository.revokeSession(sessionId, 'logout');
    return Boolean(revoked);
  }
}

