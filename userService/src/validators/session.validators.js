import { z } from 'zod';

export const sessionParamSchema = z.object({
  sessionId: z.string().uuid(),
});
