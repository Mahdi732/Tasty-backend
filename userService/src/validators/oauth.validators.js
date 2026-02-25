import { z } from 'zod';

export const oauthStartQuerySchema = z.object({
  mode: z.enum(['login', 'link']).default('login'),
  clientType: z.enum(['public', 'confidential']).default('confidential'),
});

export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
});
