import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const pemTransform = (value) => (value ? value.replace(/\\n/g, '\n') : value);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BODY_LIMIT: z.string().default('16kb'),
  TRUST_PROXY: z.coerce.number().default(1),

  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ACTIVE_KID: z.string().min(1),
  JWT_PREVIOUS_KID: z.string().optional().default(''),
  JWT_PRIVATE_KEY: z.string().transform(pemTransform),
  JWT_PUBLIC_KEY: z.string().transform(pemTransform),
  JWT_PREVIOUS_PUBLIC_KEY: z.string().optional().transform(pemTransform),
  TOKEN_HASH_SECRET: z.string().min(24),

  REFRESH_TOKEN_TRANSPORT: z.enum(['cookie', 'body', 'both']).default('both'),
  REFRESH_COOKIE_NAME: z.string().default('rt'),
  COOKIE_SECURE: z.coerce.boolean().default(true),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional().default(''),
  FACEBOOK_CLIENT_ID: z.string().optional().default(''),
  FACEBOOK_CLIENT_SECRET: z.string().optional().default(''),
  FACEBOOK_REDIRECT_URI: z.string().optional().default(''),
  APPLE_CLIENT_ID: z.string().optional().default(''),
  APPLE_TEAM_ID: z.string().optional().default(''),
  APPLE_KEY_ID: z.string().optional().default(''),
  APPLE_PRIVATE_KEY: z.string().optional().default('').transform(pemTransform),
  APPLE_REDIRECT_URI: z.string().optional().default(''),

  OAUTH_STATE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  ALLOW_AUTO_LINK_VERIFIED_OAUTH_EMAIL: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Security: fail fast on misconfiguration to avoid insecure fallback runtime behavior.
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS_LIST: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};
