import { z } from 'zod';
import { ORDER_TYPE } from '../constants/order.js';

export const createOrderSchema = z.object({
  restaurantId: z.string().min(1),
  orderType: z.enum(Object.values(ORDER_TYPE)),
  paymentRequired: z.boolean().optional().default(true),
  restaurantSnapshot: z.object({
    name: z.string().min(1),
    slug: z.string().nullable().optional(),
    citySlug: z.string().nullable().optional(),
    version: z.number().int().positive().optional().default(1),
  }),
  fulfillment: z.object({
    mode: z.enum(Object.values(ORDER_TYPE)),
    deliveryAddress: z.string().optional().nullable(),
    tableRef: z.string().optional().nullable(),
    scheduledAt: z.string().datetime().optional().nullable(),
  }),
  items: z.array(z.object({
    menuItemId: z.string().min(1),
    name: z.string().min(1),
    unitPrice: z.number().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
});

export const restaurantOrdersParamSchema = z.object({ restaurantId: z.string().min(1) });

export const scanQrSchema = z.object({ qrToken: z.string().min(20) });
