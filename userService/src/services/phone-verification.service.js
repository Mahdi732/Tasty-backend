import crypto from 'crypto';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { USER_STATUS } from '../constants/user-status.js';
import { hmacSha256 } from '../security/crypto.utils.js';
import { timingSafeEqualHex } from '../security/timing-safe.js';

export class PhoneVerificationService {
  constructor({ env, redisClient, userRepository, phoneVerificationRepository, smsSender, auditService, otpGenerator }) {
    this.env = env;
    this.redis = redisClient;
    this.userRepository = userRepository;
    this.phoneVerificationRepository = phoneVerificationRepository;
    this.smsSender = smsSender;
    this.auditService = auditService;
    this.otpGenerator = otpGenerator || (() => String(crypto.randomInt(0, 10000)).padStart(4, '0'));
  }

  normalizePhone(phoneNumber) {
    return String(phoneNumber || '').trim();
  }

  otpHash(phoneNumber, otpCode) {
    return hmacSha256(this.env.PHONE_VERIFICATION_HASH_SECRET || this.env.TOKEN_HASH_SECRET, `${phoneNumber}:${otpCode}`);
  }

  async incrementWindowCounter(key, windowSeconds) {
    const nextValue = await this.redis.sendCommand(['INCR', key]);
    if (Number(nextValue) === 1) {
      await this.redis.sendCommand(['EXPIRE', key, String(windowSeconds)]);
    }
    return Number(nextValue);
  }

  async enforceSendRateLimit(userId, phoneNumber, ipAddress) {
    const byIpKey = `phone_verif:send:ip:${ipAddress || 'unknown'}`;
    const byUserKey = `phone_verif:send:user:${userId}`;
    const byPhoneKey = `phone_verif:send:phone:${phoneNumber}`;

    const [ipCount, userCount, phoneCount] = await Promise.all([
      this.incrementWindowCounter(byIpKey, this.env.PHONE_VERIFICATION_SEND_WINDOW_SECONDS),
      this.incrementWindowCounter(byUserKey, this.env.PHONE_VERIFICATION_SEND_WINDOW_SECONDS),
      this.incrementWindowCounter(byPhoneKey, this.env.PHONE_VERIFICATION_SEND_WINDOW_SECONDS),
    ]);

    if (
      ipCount > this.env.PHONE_VERIFICATION_SEND_MAX_PER_WINDOW
      || userCount > this.env.PHONE_VERIFICATION_SEND_MAX_PER_WINDOW
      || phoneCount > this.env.PHONE_VERIFICATION_PHONE_MAX_PER_WINDOW
    ) {
      throw new ApiError(429, ERROR_CODES.AUTH_RATE_LIMITED, 'Too many verification requests');
    }
  }

  async enforceSendCooldown(userId) {
    const cooldownKey = `phone_verif:cooldown:${userId}`;
    const cooldownActive = await this.redis.get(cooldownKey);
    if (cooldownActive) {
      throw new ApiError(429, ERROR_CODES.AUTH_VERIFICATION_COOLDOWN, 'Phone verification resend cooldown active');
    }

    await this.redis.set(cooldownKey, '1', { EX: this.env.PHONE_VERIFICATION_RESEND_COOLDOWN_SECONDS });
  }

  async startVerification(userId, phoneNumber, context = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required');
    }

    const normalizedPhone = this.normalizePhone(phoneNumber);
    await this.enforceSendRateLimit(user.id, normalizedPhone, context.ipAddress);
    await this.enforceSendCooldown(user.id);

    // In local/dev smoke tests, use deterministic OTP to avoid relying on SMS providers.
    const otpCode = this.env.EXPOSE_VERIFICATION_CODES ? '1234' : this.otpGenerator();
    const expiresAt = new Date(Date.now() + this.env.PHONE_VERIFICATION_CODE_TTL_SECONDS * 1000);

    await this.phoneVerificationRepository.upsertActiveCode({
      userId: user.id,
      phoneNumber: normalizedPhone,
      codeHash: this.otpHash(normalizedPhone, otpCode),
      expiresAt,
      maxAttempts: this.env.PHONE_VERIFICATION_MAX_VERIFY_ATTEMPTS,
      lastSentAt: new Date(),
      requestId: context.requestId,
    });

    await this.smsSender.sendVerificationOtp({
      toPhoneNumber: normalizedPhone,
      otpCode,
      ttlSeconds: this.env.PHONE_VERIFICATION_CODE_TTL_SECONDS,
    });

    if (!user.phoneNumber || user.phoneNumber !== normalizedPhone) {
      user.phoneNumber = normalizedPhone;
      user.isPhoneVerified = false;
      user.phoneVerifiedAt = null;
      if (user.isEmailVerified && user.status !== USER_STATUS.PENDING_FACE_ACTIVATION) {
        user.status = USER_STATUS.PENDING_PHONE_VERIFICATION;
      }
      await this.userRepository.save(user);
    }

    this.auditService.log('auth.phone_verification_sent', {
      userId: user.id,
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });

    if (this.env.EXPOSE_VERIFICATION_CODES) {
      return { sent: true, code: otpCode };
    }

    return { sent: true };
  }

  async verifyCode(userId, phoneNumber, otpCode, context = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required');
    }

    const normalizedPhone = this.normalizePhone(phoneNumber);
    const verification = await this.phoneVerificationRepository.findActiveByUserAndPhone(user.id, normalizedPhone);

    if (!verification) {
      throw new ApiError(400, ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE, 'Invalid verification code');
    }

    if (verification.lockedUntil && verification.lockedUntil > new Date()) {
      throw new ApiError(429, ERROR_CODES.AUTH_VERIFICATION_LOCKED, 'Too many invalid verification attempts');
    }

    const providedHash = this.otpHash(normalizedPhone, otpCode);
    const validCode = timingSafeEqualHex(verification.codeHash, providedHash);

    if (!validCode) {
      const updated = await this.phoneVerificationRepository.incrementAttemptsAndMaybeLock(
        verification.id,
        verification.maxAttempts,
        this.env.PHONE_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
      );

      if (updated?.lockedUntil && updated.lockedUntil > new Date()) {
        throw new ApiError(429, ERROR_CODES.AUTH_VERIFICATION_LOCKED, 'Too many invalid verification attempts');
      }

      throw new ApiError(400, ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE, 'Invalid verification code');
    }

    await this.phoneVerificationRepository.markConsumed(verification.id);

    user.phoneNumber = normalizedPhone;
    user.isPhoneVerified = true;
    user.phoneVerifiedAt = new Date();
    if (user.isEmailVerified && user.status === USER_STATUS.PENDING_PHONE_VERIFICATION) {
      user.status = USER_STATUS.PENDING_FACE_ACTIVATION;
      user.activationDeadline = new Date(
        Date.now() + this.env.ACCOUNT_FACE_ACTIVATION_DEADLINE_DAYS * 24 * 60 * 60 * 1000
      );
    }
    await this.userRepository.save(user);

    this.auditService.log('auth.phone_verified', {
      userId: user.id,
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });

    return { verified: true };
  }
}
