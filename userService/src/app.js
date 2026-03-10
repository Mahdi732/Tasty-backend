import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import {
  env,
  logger,
  httpLogger,
  buildCorsOptions,
  buildHelmetOptions,
  JwksConfig,
} from './config/index.js';
import { UserModel } from './models/user.model.js';
import { RefreshSessionModel } from './models/refresh-session.model.js';
import { OAuthAccountModel } from './models/oauth-account.model.js';
import { EmailVerificationModel } from './models/email-verification.model.js';
import { UserRepository } from './repositories/user.repository.js';
import { SessionRepository } from './repositories/session.repository.js';
import { OAuthAccountRepository } from './repositories/oauth-account.repository.js';
import { EmailVerificationRepository } from './repositories/email-verification.repository.js';
import { PasswordHasher } from './security/password.hasher.js';
import { TokenGenerator } from './security/token.generator.js';
import { JwtSigner } from './security/jwt.signer.js';
import { JwtVerifier } from './security/jwt.verifier.js';
import { KeyService } from './services/key.service.js';
import { AuditService } from './services/audit.service.js';
import { TokenService } from './services/token.service.js';
import { SessionService } from './services/session.service.js';
import { AuthService } from './services/auth.service.js';
import { UserService } from './services/user.service.js';
import { FaceRecognitionClient } from './services/face-recognition.client.js';
import { EmailVerificationService } from './services/email-verification.service.js';
import { NodemailerEmailSender } from './services/email/nodemailer-email.sender.js';
import { NoopEmailSender } from './services/email/noop-email.sender.js';
import { OAuthProviderFactory } from './oauth/oauth-provider.factory.js';
import { OAuthClientConfigResolver } from './oauth/oauth-client-config.resolver.js';
import { OAuthService } from './services/oauth.service.js';
import { DomainEventPublisher } from './services/domain-event.publisher.js';
import { PendingFaceActivationCleanupJob } from './jobs/pending-face-activation-cleanup.job.js';
import { HealthController } from './controllers/health.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { OAuthController } from './controllers/oauth.controller.js';
import { SessionController } from './controllers/session.controller.js';
import { AuthMetaController } from './controllers/auth-meta.controller.js';
import { authMiddleware as authMiddlewareFactory } from './middlewares/auth.middleware.js';
import { createRateLimiter } from './middlewares/rate-limit.middleware.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { buildRoutes } from './routes/index.js';
import { getClientIp } from './utils/ip.js';
import { getUserAgent } from './utils/user-agent.js';

export const buildApp = async ({ redisClient, otpGenerator, emailSender }) => {
  const app = express();

  const keyService = new KeyService(env);
  await keyService.init();

  const jwtSigner = new JwtSigner({
    privateKey: keyService.getSignKey(),
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    activeKid: env.JWT_ACTIVE_KID,
  });

  const jwtVerifier = new JwtVerifier({
    keyService,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  const userRepository = new UserRepository(UserModel);
  const sessionRepository = new SessionRepository(RefreshSessionModel);
  const oauthAccountRepository = new OAuthAccountRepository(OAuthAccountModel);
  const emailVerificationRepository = new EmailVerificationRepository(EmailVerificationModel);

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

  const resolvedEmailSender =
    emailSender || (env.SMTP_ENABLED ? new NodemailerEmailSender({ env, logger }) : new NoopEmailSender());

  const emailVerificationService = new EmailVerificationService({
    env,
    redisClient,
    userRepository,
    emailVerificationRepository,
    emailSender: resolvedEmailSender,
    auditService,
    otpGenerator,
  });

  const authService = new AuthService({
    userRepository,
    passwordHasher,
    tokenService,
    sessionService,
    auditService,
    emailVerificationService,
  });

  const faceRecognitionClient = new FaceRecognitionClient({
    baseUrl: env.FACE_SERVICE_BASE_URL,
    apiKey: env.FACE_SERVICE_API_KEY,
    timeoutMs: env.FACE_SERVICE_TIMEOUT_MS,
    logger,
  });

  const domainEventPublisher = new DomainEventPublisher({
    url: env.RABBITMQ_URL,
    exchange: env.RABBITMQ_EVENTS_EXCHANGE,
    logger,
  });

  const userService = new UserService({
    userRepository,
    faceRecognitionClient,
    env,
    auditService,
  });

  const oauthProviderFactory = new OAuthProviderFactory();
  const oauthClientConfigResolver = new OAuthClientConfigResolver(env);
  const oauthService = new OAuthService({
    env,
    redisClient,
    oauthProviderFactory,
    oauthClientConfigResolver,
    oauthAccountRepository,
    userRepository,
    tokenService,
    auditService,
  });

  const healthController = new HealthController();
  const authController = new AuthController({ env, authService, userService });
  const oauthController = new OAuthController({ env, oauthService });
  const sessionController = new SessionController(sessionService);
  const authMetaController = new AuthMetaController(new JwksConfig(env));

  const authMiddleware = authMiddlewareFactory(jwtVerifier, userRepository);

  const pendingFaceActivationCleanupJob = new PendingFaceActivationCleanupJob({
    env,
    userRepository,
    domainEventPublisher,
    logger,
  });
  pendingFaceActivationCleanupJob.start();

  const globalLimiter = createRateLimiter(redisClient, {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  });

  const loginLimiter = createRateLimiter(redisClient, {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.LOGIN_RATE_LIMIT_MAX,
    keyGenerator: (req) => `login:${getClientIp(req)}:${(req.body?.email || '').toLowerCase()}`,
  });

  const refreshLimiter = createRateLimiter(redisClient, {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.REFRESH_RATE_LIMIT_MAX,
    keyGenerator: (req) => `${getClientIp(req)}:refresh`,
  });

  const emailVerificationLimiter = createRateLimiter(redisClient, {
    windowMs: env.EMAIL_VERIFICATION_SEND_WINDOW_SECONDS * 1000,
    max: env.EMAIL_VERIFICATION_SEND_MAX_PER_WINDOW,
    keyGenerator: (req) => `email-verification:${getClientIp(req)}:${(req.body?.email || '').toLowerCase()}`,
  });

  app.set('trust proxy', env.TRUST_PROXY);
  app.use(requestIdMiddleware);
  app.use(httpLogger);
  app.use(helmet(buildHelmetOptions(env.NODE_ENV === 'production')));
  app.use(cors(buildCorsOptions(env.CORS_ORIGINS_LIST)));
  app.use(cookieParser());
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: env.BODY_LIMIT }));
  app.use(globalLimiter);

  app.use((req, _res, next) => {
    req.clientIp = getClientIp(req);
    req.userAgent = getUserAgent(req);
    next();
  });

  app.use(
    buildRoutes({
      healthController,
      authController,
      oauthController,
      sessionController,
      authMetaController,
      authMiddleware,
      loginLimiter,
      refreshLimiter,
      emailVerificationLimiter,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorMiddleware(logger));

  app.locals.pendingFaceActivationCleanupJob = pendingFaceActivationCleanupJob;
  app.locals.domainEventPublisher = domainEventPublisher;

  return app;
};
