import { z } from 'zod';

export const createGroupSchema = z.object({
  space: z.string().min(1, 'Space id required'),
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().default(''),
  isPublic: z.boolean().default(true)
});

export const updateGroupSchema = createGroupSchema.partial();

export const groupQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(50).default(20)
});
