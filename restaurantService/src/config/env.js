import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4010),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().min(1),
  REDIS_ENABLED: z.coerce.boolean().default(false),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BODY_LIMIT: z.string().default('32kb'),
  TRUST_PROXY: z.coerce.number().default(1),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  INTERNAL_SERVICE_SECRET: z.string().min(16),

  JWT_JWKS_URI: z.string().url(),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),

  RABBITMQ_ENABLED: z.coerce.boolean().default(false),
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
  RABBITMQ_EXCHANGE_EVENTS: z.string().default('tasty.domain.events'),
  RABBITMQ_QUEUE_PAYMENT_SUBSCRIPTION: z.string().default('restaurant.payment.subscription.events.q'),
  RABBITMQ_ROUTING_KEY_PAYMENT_SUBSCRIPTION_SUCCESS: z.string().default('payment.subscription.success'),

  REQUIRE_VERIFICATION_FOR_ACTIVATION: z.coerce.boolean().default(true),
  DEFAULT_RESTAURANT_CURRENCY: z.string().default('USD'),
  PUBLIC_MENU_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS_LIST: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};

