import { z } from 'zod';

const platformSchema = z.enum(['web', 'mobile', 'desktop', 'android', 'ios']);

export const oauthStartQuerySchema = z.object({
  mode: z.enum(['login', 'link']).default('login'),
  platform: platformSchema.default('web'),
  appRedirect: z.string().url().optional(),
});

export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
});

export const oauthLinkBodySchema = z.object({
  platform: platformSchema.default('web'),
});

