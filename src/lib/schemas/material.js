import { z } from 'zod'
import { fileLikeSchema } from './helpers.js'

/**
 * @typedef {import('zod').RefinementCtx} RefinementCtx
 */

const MAX_FILE_SIZE = 104857600 // 100MB
const MAX_TAGS = 10

const DOCUMENT_MIME_TYPES = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'text/csv',
	'application/zip'
]

const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm']

const ALL_ALLOWED_MIME_TYPES = [...DOCUMENT_MIME_TYPES, ...VIDEO_MIME_TYPES]

/**
 * @param {unknown} file
 * @returns {string}
 */
const getFileMimeType = (file) => {
	if (!file || typeof file !== 'object') return ''
	const type = Reflect.get(file, 'type')
	if (typeof type === 'string' && type.length > 0) return type
	const mimeType = Reflect.get(file, 'mimeType')
	if (typeof mimeType === 'string' && mimeType.length > 0) return mimeType
	return ''
}

/**
 * @param {unknown} file
 * @returns {number}
 */
const getFileSize = (file) => {
	if (!file || typeof file !== 'object') return 0
	const size = Reflect.get(file, 'size')
	return typeof size === 'number' ? size : 0
}

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
