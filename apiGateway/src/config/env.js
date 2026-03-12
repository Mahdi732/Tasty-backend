import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(443),
  HTTP_REDIRECT_PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BODY_LIMIT: z.string().default('1mb'),
  TRUST_PROXY: z.coerce.number().default(1),

  SSL_KEY_PATH: z.string().default('./certs/key.pem'),
  SSL_CERT_PATH: z.string().default('./certs/cert.pem'),

  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(32),
  INTERNAL_SERVICE_SECRET: z.string().min(16),

  GRPC_DEADLINE_MS: z.coerce.number().int().positive().default(5000),
  GRPC_CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(5),
  GRPC_CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  USER_GRPC_TARGET: z.string().default('localhost:50051'),
  ORDER_GRPC_TARGET: z.string().default('localhost:50052'),
  RESTAURANT_GRPC_TARGET: z.string().default('localhost:50053'),
  FACE_GRPC_TARGET: z.string().default('localhost:50054'),
  NOTIFICATION_GRPC_TARGET: z.string().default('localhost:50055'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

const pem = parsed.data.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

export const env = {
  ...parsed.data,
  JWT_PUBLIC_KEY: pem,
  CORS_ORIGINS_LIST: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};
