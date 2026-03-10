import { z } from 'zod';

export const createOrderSchema = z.object({
  restaurantId: z.string().min(1),
  items: z.array(
    z.object({
      menuItemId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  status: z.string().optional(),
});

export const restaurantOrdersParamSchema = z.object({
  restaurantId: z.string().min(1),
});

