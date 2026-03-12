import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4060),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BODY_LIMIT: z.string().default('16kb'),
  TRUST_PROXY: z.coerce.number().default(1),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
  RABBITMQ_EXCHANGE_EVENTS: z.string().default('tasty.domain.events'),
  RABBITMQ_EXCHANGE_COMMANDS: z.string().default('tasty.domain.commands'),
  RABBITMQ_PREFETCH: z.coerce.number().int().positive().default(20),
  RABBITMQ_QUEUE_NOTIFICATION_ENFORCEMENT: z.string().default('notification.enforcement.events.q'),

  ENFORCEMENT_QUEUE_NAME: z.string().default('notification.enforcement.timer.q'),
  DRIVER_WAIT_TOTAL_SECONDS: z.coerce.number().int().positive().default(300),
  DRIVER_WAIT_WARNING_OFFSET_SECONDS: z.coerce.number().int().positive().default(180),

  PUSH_PROVIDER: z.enum(['noop', 'fcm']).default('noop'),
  FCM_SERVER_KEY: z.string().optional().default(''),

  SMS_PROVIDER: z.enum(['noop', 'twilio', 'infobip']).default('noop'),
  SMS_FROM_PHONE: z.string().optional().default(''),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  INFOBIP_BASE_URL: z.string().optional().default(''),
  INFOBIP_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS_LIST: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};
