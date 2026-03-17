import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4050),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BODY_LIMIT: z.string().default('32kb'),
  TRUST_PROXY: z.coerce.number().default(1),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  INTERNAL_SERVICE_SECRET: z.string().min(16),

  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
  RABBITMQ_EXCHANGE_EVENTS: z.string().default('tasty.domain.events'),

  GRPC_PORT: z.coerce.number().int().positive().default(50055),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS_LIST: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};
