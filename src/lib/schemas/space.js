import { z } from 'zod'

export const createSpaceSchema = z.object({
	name: z.string().min(2).max(100),
	slug: z
		.string()
		.regex(/^[a-z0-9-]+$/)
		.min(2)
		.max(100),
	description: z.string().max(1000).optional().default(''),
	isPublic: z.boolean().default(true)
})

export const updateSpaceSchema = createSpaceSchema.partial()
