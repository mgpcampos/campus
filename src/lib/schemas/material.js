import { z } from 'zod'
import { fileLikeSchema } from './helpers.js'

/**
 * @typedef {import('zod').RefinementCtx} RefinementCtx
 */

/**
 * Simplified schema for creating a new material - just title, description, and file
 */
export const materialCreateSchema = z.object({
	title: z
		.string({ required_error: 'Title is required' })
		.trim()
		.min(1, 'Title cannot be empty')
		.max(500, 'Title cannot exceed 500 characters'),
	description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),
	file: fileLikeSchema
})

/**
 * Schema for updating an existing material (simplified)
 */
export const materialUpdateSchema = z
	.object({
		title: z.string().trim().min(1).max(500).optional(),
		description: z.string().trim().max(5000).optional(),
		file: fileLikeSchema.optional()
	})
	.partial()

/**
 * Schema for material search parameters
 */
export const materialSearchSchema = z
	.object({
		q: z.string().trim().optional(),
		tags: z
			.union([z.string(), z.array(z.string())])
			.transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
			.optional(),
		format: z.enum(['document', 'slide', 'dataset', 'video', 'link']).optional(),
		contributorId: z.string().optional(),
		visibility: z.enum(['institution', 'course', 'group', 'public']).optional(),
		courseCode: z.string().optional(),
		sort: z.enum(['relevance', 'recent']).default('relevance'),
		page: z.coerce.number().int().positive().default(1),
		perPage: z.coerce.number().int().positive().max(100).default(20)
	})
	.default({})

/**
 * Schema for logging material access
 */
export const materialAccessLogSchema = z.object({
	material: z.string({ required_error: 'Material ID is required' }),
	user: z.string({ required_error: 'User ID is required' }),
	action: z.enum(['view', 'download'], { required_error: 'Action is required' })
})
