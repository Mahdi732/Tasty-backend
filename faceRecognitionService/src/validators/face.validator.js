import { z } from 'zod';
import { LIST_TYPE } from '../constants/face.js';

const baseImageSchema = z.object({
  imageBase64: z.string().min(20),
  tenantId: z.string().min(1),
});

export const activateFaceSchema = baseImageSchema.extend({
  personRef: z.string().min(1),
  listType: z.enum(Object.values(LIST_TYPE)).default(LIST_TYPE.NORMAL),
  reason: z.string().optional(),
});

export const searchFaceSchema = baseImageSchema.extend({
  targetLists: z.array(z.enum([LIST_TYPE.BANNED, LIST_TYPE.DEBTOR])).min(1),
  topK: z.number().int().positive().max(20).optional(),
  threshold: z.number().positive().optional(),
});

export const verifyFaceSchema = baseImageSchema.extend({
  personRef: z.string().min(1),
  threshold: z.number().positive().optional(),
});
