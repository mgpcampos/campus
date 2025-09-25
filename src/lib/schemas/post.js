import { z } from 'zod';

/**
 * Schema for creating a new post
 */
export const createPostSchema = z.object({
	content: z
		.string()
		.min(1, 'Post content is required')
		.max(2000, 'Post content must be less than 2000 characters'),
	scope: z.enum(['global', 'space', 'group']).default('global'),
	space: z.string().optional(),
	group: z.string().optional(),
	attachments: z.array(z.instanceof(File)).max(4, 'Maximum 4 attachments allowed').optional()
});

/**
 * Schema for updating a post
 */
export const updatePostSchema = z.object({
	content: z
		.string()
		.min(1, 'Post content is required')
		.max(2000, 'Post content must be less than 2000 characters')
});

/**
 * Schema for post query parameters
 */
export const postQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	perPage: z.coerce.number().min(1).max(50).default(20),
	scope: z.enum(['global', 'space', 'group']).optional(),
	space: z.string().optional(),
	group: z.string().optional(),
	/**
	 * Free-text search query (content search)
	 * Accepts either `q` or `search` in query params; route layer maps both to q.
	 */
	q: z.string().min(1).max(100).optional(),
	/**
	 * Sort mode: new (default chronological), top (likeCount), trending (engagement + recency window)
	 */
	sort: z.enum(['new', 'top', 'trending']).default('new').optional(),
	/**
	 * Timeframe (in hours) for trending calculation (default 48h)
	 */
	timeframeHours: z.coerce.number().min(1).max(168).default(48).optional()
});
