import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true)
});

export const groupQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(50).default(20)
});
