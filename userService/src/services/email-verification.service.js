import crypto from 'crypto';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { hmacSha256 } from '../security/crypto.utils.js';
import { timingSafeEqualHex } from '../security/timing-safe.js';
import { USER_STATUS } from '../constants/user-status.js';

const PURPOSE = 'email_verification';

export class EmailVerificationService {
  constructor({ env, redisClient, userRepository, emailVerificationRepository, emailSender, auditService, otpGenerator }) {
    this.env = env;
    this.redis = redisClient;
    this.userRepository = userRepository;
    this.emailVerificationRepository = emailVerificationRepository;
    this.emailSender = emailSender;
    this.auditService = auditService;
    this.otpGenerator = otpGenerator || (() => String(crypto.randomInt(0, 1000000)).padStart(6, '0'));
  }

  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  identifierHash(email) {
    return hmacSha256(this.env.EMAIL_VERIFICATION_HASH_SECRET || this.env.TOKEN_HASH_SECRET, email);
  }

  otpHash(email, otp) {
    return hmacSha256(this.env.EMAIL_VERIFICATION_HASH_SECRET || this.env.TOKEN_HASH_SECRET, `${email}:${otp}`);
  }

  async incrementWindowCounter(key, windowSeconds) {
    const nextValue = await this.redis.sendCommand(['INCR', key]);
    if (Number(nextValue) === 1) {
      await this.redis.sendCommand(['EXPIRE', key, String(windowSeconds)]);
    }
    return Number(nextValue);
  }

  async enforceSendRateLimit(identifierHash, ipAddress) {
    const byIpKey = `email_verif:send:ip:${ipAddress || 'unknown'}`;
    const byEmailKey = `email_verif:send:email:${identifierHash}`;

    const [ipCount, emailCount] = await Promise.all([
      this.incrementWindowCounter(byIpKey, this.env.EMAIL_VERIFICATION_SEND_WINDOW_SECONDS),
      this.incrementWindowCounter(byEmailKey, this.env.EMAIL_VERIFICATION_SEND_WINDOW_SECONDS),
    ]);

    if (ipCount > this.env.EMAIL_VERIFICATION_SEND_MAX_PER_WINDOW || emailCount > this.env.EMAIL_VERIFICATION_EMAIL_MAX_PER_WINDOW) {
      throw new ApiError(429, ERROR_CODES.AUTH_RATE_LIMITED, 'Too many verification requests');
    }
  }

  async enforceSendCooldown(identifierHash) {
    const cooldownKey = `email_verif:cooldown:${identifierHash}`;
    const cooldownActive = await this.redis.get(cooldownKey);
    if (cooldownActive) {
      throw new ApiError(429, ERROR_CODES.AUTH_VERIFICATION_COOLDOWN, 'Verification resend cooldown active');
    }

    await this.redis.set(cooldownKey, '1', { EX: this.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS });
  }

  async startVerification(email, context = {}) {
    const normalizedEmail = this.normalizeEmail(email);
    const identifierHash = this.identifierHash(normalizedEmail);

    await this.enforceSendRateLimit(identifierHash, context.ipAddress);
    await this.enforceSendCooldown(identifierHash);

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user || user.isEmailVerified) {
      return { sent: true };
    }

    const otpCode = this.otpGenerator();
    const expiresAt = new Date(Date.now() + this.env.EMAIL_VERIFICATION_CODE_TTL_SECONDS * 1000);

    await this.emailVerificationRepository.upsertActiveCode({
      identifierHash,
      email: normalizedEmail,
      userId: user.id,
      purpose: PURPOSE,
      codeHash: this.otpHash(normalizedEmail, otpCode),
      expiresAt,
      maxAttempts: this.env.EMAIL_VERIFICATION_MAX_VERIFY_ATTEMPTS,
      lastSentAt: new Date(),
    });

    await this.emailSender.sendVerificationOtp({
      toEmail: normalizedEmail,
      otpCode,
      ttlSeconds: this.env.EMAIL_VERIFICATION_CODE_TTL_SECONDS,
    });

    this.auditService.log('auth.email_verification_sent', {
      userId: user.id,
      email: normalizedEmail,
      ipAddress: context.ipAddress,
    });

    return { sent: true };
  }

  async verifyCode(email, otpCode, context = {}) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new ApiError(400, ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE, 'Invalid verification code');
    }

    if (user.isEmailVerified) {
      return { verified: true };
    }

    const identifierHash = this.identifierHash(normalizedEmail);
    const verification = await this.emailVerificationRepository.findActiveByIdentifierHash(identifierHash, PURPOSE);

    if (!verification) {
      throw new ApiError(400, ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE, 'Invalid verification code');
    }

    if (verification.lockedUntil && verification.lockedUntil > new Date()) {
      throw new ApiError(429, ERROR_CODES.AUTH_VERIFICATION_LOCKED, 'Too many invalid verification attempts');
    }

    const providedHash = this.otpHash(normalizedEmail, otpCode);
    const validCode = timingSafeEqualHex(verification.codeHash, providedHash);

    if (!validCode) {
      const updated = await this.emailVerificationRepository.incrementAttemptsAndMaybeLock(
        verification.id,
        verification.maxAttempts,
        this.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
      );

      if (updated?.lockedUntil && updated.lockedUntil > new Date()) {
        throw new ApiError(429, ERROR_CODES.AUTH_VERIFICATION_LOCKED, 'Too many invalid verification attempts');
      }

      throw new ApiError(400, ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE, 'Invalid verification code');
    }

    await this.emailVerificationRepository.markConsumed(verification.id);

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    if (user.status === USER_STATUS.PENDING_EMAIL_VERIFICATION) {
      user.status = USER_STATUS.PENDING_FACE_ACTIVATION;
      user.activationDeadline = new Date(
        Date.now() + this.env.ACCOUNT_FACE_ACTIVATION_DEADLINE_DAYS * 24 * 60 * 60 * 1000
      );
    }
    await this.userRepository.save(user);

    this.auditService.log('auth.email_verified', {
      userId: user.id,
      email: normalizedEmail,
      ipAddress: context.ipAddress,
    });

    return { verified: true };
  }
}

