import { z } from 'zod';

const platformSchema = z.enum(['web', 'mobile', 'desktop', 'android', 'ios']);

export const oauthStartQuerySchema = z.object({
  mode: z.enum(['login', 'link']).default('login'),
  platform: platformSchema.default('web'),
  appRedirect: z.string().url().optional(),
});

export const oauthCallbackQuerySchema = z
  .object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    error: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.error && !value.code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either authorization code or error is required',
        path: ['code'],
      });
    }

    if (!value.error && !value.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'State is required for OAuth callback code flow',
        path: ['state'],
      });
    }
  });

export const oauthLinkBodySchema = z.object({
  platform: platformSchema.default('web'),
  appRedirect: z.string().url().optional(),
});

