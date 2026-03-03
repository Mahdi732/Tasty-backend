import { z } from 'zod';

export const restaurantIdParamSchema = z.object({
  id: z.string().min(1),
  restaurantId: z.string().min(1).optional(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
});

export const itemIdParamSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

const optionItemSchema = z.object({
  name: z.string().min(1),
  priceDelta: z.number(),
  sortOrder: z.number().int().optional().default(0),
});

const optionGroupSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().optional().default(false),
  multiSelect: z.boolean().optional().default(false),
  minSelect: z.number().int().optional().default(0),
  maxSelect: z.number().int().optional().default(1),
  sortOrder: z.number().int().optional().default(0),
  items: z.array(optionItemSchema).optional().default([]),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  basePrice: z.number().min(0),
  currency: z.string().min(1),
  availability: z.enum(['IN_STOCK', 'OUT_OF_STOCK']).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  trackInventory: z.boolean().optional(),
  recipeId: z.string().nullable().optional(),
  optionGroups: z.array(optionGroupSchema).optional().default([]),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const availabilitySchema = z.object({
  availability: z.enum(['IN_STOCK', 'OUT_OF_STOCK']),
});

export const publishSchema = z.object({
  isPublished: z.boolean(),
});
