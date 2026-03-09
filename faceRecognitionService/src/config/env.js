import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4030),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BODY_LIMIT: z.string().default('8mb'),
  TRUST_PROXY: z.coerce.number().default(1),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  PYTHON_EMBEDDER_URL: z.string().url(),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(512),
  VECTOR_SEARCH_INDEX_NAME: z.string().default('watchlist_embedding_index'),
  DEFAULT_K_CANDIDATES: z.coerce.number().int().positive().default(5),
  DEFAULT_MATCH_THRESHOLD: z.coerce.number().positive().default(0.62),
  REVIEW_THRESHOLD: z.coerce.number().positive().default(0.55),

  SERVICE_API_KEY: z.string().min(8),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS_LIST: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};
