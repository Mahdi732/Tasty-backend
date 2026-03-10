import { z } from 'zod';
import { SUBSCRIPTION_STATUS } from '../constants/restaurant.js';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  citySlug: z.string().optional(),
  q: z.string().optional(),
  includeOutOfStock: z.coerce.boolean().optional().default(false),
});

export const citySlugParamSchema = z.object({
  citySlug: z.string().min(1),
  slug: z.string().min(1),
});

export const restaurantIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createRestaurantSchema = z.object({
  creationFlow: z.enum(['DRAFT_FIRST', 'MEMBERSHIP_FIRST']).optional(),
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coverUrl: z.string().url().optional().or(z.literal('')),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  location: z.object({
    city: z.string().min(1),
    citySlug: z.string().optional(),
    address: z.string().optional(),
    geo: z
      .object({
        type: z.literal('Point').default('Point'),
        coordinates: z.array(z.number()).length(2).optional(),
      })
      .optional(),
  }),
  openingHours: z
    .array(
      z.object({
        day: z.string(),
        open: z.string(),
        close: z.string(),
        isClosed: z.boolean().optional(),
      })
    )
    .optional(),
  settings: z
    .object({
      currency: z.string().optional(),
      taxRate: z.number().min(0).optional(),
      serviceFee: z.number().min(0).optional(),
      supportedOrderModes: z.array(z.string()).optional(),
    })
    .optional(),
  subscription: z
    .object({
      status: z.enum(Object.values(SUBSCRIPTION_STATUS)).optional(),
      subscriptionPlanId: z.string().nullable().optional(),
      providerCustomerId: z.string().nullable().optional(),
      providerSubscriptionId: z.string().nullable().optional(),
      currentPeriodEnd: z.string().datetime().nullable().optional(),
      cancelAtPeriodEnd: z.boolean().optional(),
    })
    .optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

export const staffAssignmentSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['STAFF', 'MANAGER', 'DELIVERY_MAN', 'CHEF']).default('STAFF'),
});

export const lowStockAlertSchema = z.object({
  ingredient: z.string().min(1),
  level: z.number().min(0).optional(),
  threshold: z.number().min(0).optional(),
  note: z.string().optional(),
});

export const restoreFeeRequestSchema = z.object({
  reason: z.string().min(3).optional(),
});

export const suspendRestaurantSchema = z.object({
  reason: z.string().min(3),
});

export const reviewSchema = z.object({
  reviewNotes: z.string().optional(),
});

export const subscriptionUpdateSchema = z.object({
  status: z.enum(Object.values(SUBSCRIPTION_STATUS)).optional(),
  subscriptionPlanId: z.string().nullable().optional(),
  planId: z.string().nullable().optional(),
  providerCustomerId: z.string().nullable().optional(),
  providerSubscriptionId: z.string().nullable().optional(),
  currentPeriodEnd: z.string().datetime().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

