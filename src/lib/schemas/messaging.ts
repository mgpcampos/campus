import { z } from 'zod'

/**
 * Thread creation schema
 */
export const threadCreateSchema = z.object({
	type: z.enum(['direct', 'group']),
	name: z.string().optional(),
	members: z.array(z.string()).min(2, 'At least 2 members required')
})

export type ThreadCreateData = z.infer<typeof threadCreateSchema>

/**
 * Message creation schema
 */
export const messageCreateSchema = z.object({
	body: z.string().optional(),
	attachments: z.array(z.instanceof(File)).max(5, 'Maximum 5 attachments allowed').optional()
})

export type MessageCreateData = z.infer<typeof messageCreateSchema>

/**
 * Message flag schema
 */
export const messageFlagSchema = z.object({
	reason: z.string().min(10, 'Reason must be at least 10 characters').max(500)
})

export type MessageFlagData = z.infer<typeof messageFlagSchema>

/**
 * Message list query schema
 */
export const messageListSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	perPage: z.coerce.number().int().min(1).max(100).default(50),
	before: z.string().optional(), // ISO date string
	after: z.string().optional() // ISO date string
})

export type MessageListQuery = z.infer<typeof messageListSchema>

/**
 * Thread list query schema
 */
export const threadListSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	perPage: z.coerce.number().int().min(1).max(50).default(20)
})

export type ThreadListQuery = z.infer<typeof threadListSchema>
