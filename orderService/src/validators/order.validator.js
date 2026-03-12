import { z } from 'zod';
import { ORDER_TYPE, PAYMENT_METHOD } from '../constants/order.js';

export const createOrderSchema = z.object({
  restaurantId: z.string().min(1),
  orderType: z.enum(Object.values(ORDER_TYPE)).default(ORDER_TYPE.DELIVERY),
  paymentMethod: z.enum(Object.values(PAYMENT_METHOD)).default(PAYMENT_METHOD.PAY_ON_APP),
  restaurantSnapshot: z.object({
    name: z.string().min(1),
    slug: z.string().nullable().optional(),
    citySlug: z.string().nullable().optional(),
    version: z.number().int().positive().optional().default(1),
    taxRate: z.number().min(0).optional().default(0),
    serviceFee: z.number().min(0).optional().default(0),
    currency: z.string().optional().default('USD'),
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

export const orderIdParamSchema = z.object({ orderId: z.string().min(1) });

export const driverArrivedSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  pushToken: z.string().min(8).optional(),
  idNumberMasked: z.string().min(2).optional(),
  debtAmount: z.number().min(0).optional(),
});

