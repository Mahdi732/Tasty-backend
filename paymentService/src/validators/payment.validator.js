import { z } from 'zod';

const paymentMethodSchema = z.object({
  type: z.string().default('CARD'),
  token: z.string().min(1).optional(),
  maskedPan: z.string().optional(),
  brand: z.string().optional(),
});

export const subscribePaymentSchema = z.object({
  userId: z.string().min(1),
  restaurantId: z.string().min(1),
  planId: z.string().min(1),
  amount: z.coerce.number().nonnegative().default(0),
  currency: z.string().default('USD'),
  payment: paymentMethodSchema.default({ type: 'CARD' }),
});

export const orderPaymentSchema = z.object({
  userId: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().default('USD'),
  payment: paymentMethodSchema.default({ type: 'CARD' }),
});

export const webhookSchema = z.object({
  provider: z.string().default('STRIPE'),
  eventType: z.string().optional(),
  data: z.any().optional(),
});
