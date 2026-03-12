import { env, logger, JwksConfig } from '../config/index.js';
import { UserModel } from '../models/user.model.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';
import { EmailVerificationModel } from '../models/email-verification.model.js';
import { PhoneVerificationModel } from '../models/phone-verification.model.js';
import { UserRepository } from '../repositories/user.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { EmailVerificationRepository } from '../repositories/email-verification.repository.js';
import { PhoneVerificationRepository } from '../repositories/phone-verification.repository.js';
import { PasswordHasher } from '../security/password.hasher.js';
import { TokenGenerator } from '../security/token.generator.js';
import { JwtSigner } from '../security/jwt.signer.js';
import { KeyService } from '../services/key.service.js';
import { AuditService } from '../services/audit.service.js';
import { TokenService } from '../services/token.service.js';
import { SessionService } from '../services/session.service.js';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { FaceRecognitionClient } from '../services/face-recognition.client.js';
import { IdCardVaultService } from '../services/id-card-vault.service.js';
import { EmailVerificationService } from '../services/email-verification.service.js';
import { PhoneVerificationService } from '../services/phone-verification.service.js';
import { NoopEmailSender } from '../services/email/noop-email.sender.js';
import { NoopSmsSender } from '../services/sms/noop-sms.sender.js';
import { AuthMetaController } from '../controllers/auth-meta.controller.js';

export const createGrpcContainer = async ({ redisClient, otpGenerator }) => {
  const keyService = new KeyService(env);
  await keyService.init();

  const jwtSigner = new JwtSigner({
    privateKey: keyService.getSignKey(),
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    activeKid: env.JWT_ACTIVE_KID,
  });

  const userRepository = new UserRepository(UserModel);
  const sessionRepository = new SessionRepository(RefreshSessionModel);
  const emailVerificationRepository = new EmailVerificationRepository(EmailVerificationModel);
  const phoneVerificationRepository = new PhoneVerificationRepository(PhoneVerificationModel);

  const passwordHasher = new PasswordHasher();
  const tokenGenerator = new TokenGenerator();
  const auditService = new AuditService(logger);

  const tokenService = new TokenService({
    env,
    tokenGenerator,
    jwtSigner,
    sessionRepository,
    redisClient,
    auditService,
  });

  const sessionService = new SessionService(sessionRepository);

  const emailVerificationService = new EmailVerificationService({
    env,
    redisClient,
    userRepository,
    emailVerificationRepository,
    emailSender: new NoopEmailSender(),
    auditService,
    otpGenerator,
  });

  const phoneVerificationService = new PhoneVerificationService({
    env,
    redisClient,
    userRepository,
    phoneVerificationRepository,
    smsSender: new NoopSmsSender(),
    auditService,
  });

  const authService = new AuthService({
    userRepository,
    passwordHasher,
    tokenService,
    sessionService,
    auditService,
    emailVerificationService,
    phoneVerificationService,
  });

  const faceRecognitionClient = new FaceRecognitionClient({
    grpcTarget: env.FACE_SERVICE_GRPC_TARGET,
    timeoutMs: env.FACE_SERVICE_TIMEOUT_MS,
    logger,
  });

  const idCardVaultService = new IdCardVaultService({
    encryptionKey: env.ID_CARD_ENCRYPTION_KEY,
  });

  const userService = new UserService({
    userRepository,
    faceRecognitionClient,
    idCardVaultService,
    env,
    auditService,
  });

  const authMetaController = new AuthMetaController(new JwksConfig(env));

  return {
    authService,
    userService,
    authMetaController,
  };
};
