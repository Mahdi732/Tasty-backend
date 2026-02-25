import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(12).max(128),
  tenantId: z.string().trim().max(128).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  deviceId: z.string().trim().min(2).max(128).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20).optional(),
  sessionId: z.string().uuid().optional(),
});

export const logoutAllSchema = z.object({
  exceptCurrentSession: z.boolean().optional().default(false),
});
