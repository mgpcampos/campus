import { z } from 'zod';

export const createCommentSchema = z.object({
  post: z.string().min(1),
  content: z.string().min(1).max(1000)
});

export const commentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(50)
});
