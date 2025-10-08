import { z } from 'zod';
import { fileLikeSchema } from './helpers.js';

/**
 * @typedef {import('zod').RefinementCtx} RefinementCtx
 */

const MAX_FILE_SIZE = 104857600; // 100MB
const MAX_TAGS = 10;

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
];

const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];

const ALL_ALLOWED_MIME_TYPES = [...DOCUMENT_MIME_TYPES, ...VIDEO_MIME_TYPES];

/**
 * @param {unknown} file
 * @returns {string}
 */
const getFileMimeType = (file) => {
	if (!file || typeof file !== 'object') return '';
	const type = Reflect.get(file, 'type');
	if (typeof type === 'string' && type.length > 0) return type;
	const mimeType = Reflect.get(file, 'mimeType');
	if (typeof mimeType === 'string' && mimeType.length > 0) return mimeType;
	return '';
};

/**
 * @param {unknown} file
 * @returns {number}
 */
const getFileSize = (file) => {
	if (!file || typeof file !== 'object') return 0;
	const size = Reflect.get(file, 'size');
	return typeof size === 'number' ? size : 0;
};

/**
 * Validates that file uploads match the selected format
 * @param {{ format?: string; file?: unknown; linkUrl?: string | undefined }} data
 * @param {RefinementCtx} ctx
 */
const validateFormatConsistency = (data, ctx) => {
	const { format, file, linkUrl } = data;

	if (format === 'link') {
		if (!linkUrl) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'linkUrl is required when format is link',
				path: ['linkUrl']
			});
		}
		if (file) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'file cannot be provided when format is link',
				path: ['file']
			});
		}
	} else {
		if (!file) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `file is required when format is ${format}`,
				path: ['file']
			});
		}
		if (linkUrl) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'linkUrl cannot be provided unless format is link',
				path: ['linkUrl']
			});
		}
	}
};

/**
 * Validates file size and MIME type
 * @param {unknown} file
 * @param {RefinementCtx} ctx
 */
const validateFile = (file, ctx) => {
	if (!file) return;

	const size = getFileSize(file);
	if (size > MAX_FILE_SIZE) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
			path: ['file']
		});
	}

	const mimeType = getFileMimeType(file);
	if (mimeType && !ALL_ALLOWED_MIME_TYPES.includes(mimeType)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `File type ${mimeType} is not supported`,
			path: ['file']
		});
	}
};

/**
 * Base schema for material fields
 */
const baseMaterialSchema = z.object({
	title: z
		.string({ required_error: 'Title is required' })
		.trim()
		.min(1, 'Title cannot be empty')
		.max(500, 'Title cannot exceed 500 characters'),
	description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),
	courseCode: z.string().trim().max(50, 'Course code cannot exceed 50 characters').optional(),
	tags: z
		.array(z.string().trim().min(1).max(50))
		.max(MAX_TAGS, `Cannot exceed ${MAX_TAGS} tags`)
		.default([])
		.optional(),
	format: z.enum(['document', 'slide', 'dataset', 'video', 'link'], {
		required_error: 'Format is required'
	}),
	visibility: z.enum(['institution', 'course', 'group', 'public'], {
		required_error: 'Visibility is required'
	})
});

/**
 * Schema for creating a new material
 */
export const materialCreateSchema = baseMaterialSchema
	.extend({
		file: fileLikeSchema.optional(),
		linkUrl: z.string().url('Invalid URL').optional()
	})
	.superRefine((data, ctx) => {
		validateFormatConsistency(data, ctx);
		validateFile(data.file, ctx);
	});

/**
 * Schema for updating an existing material
 */
export const materialUpdateSchema = baseMaterialSchema
	.extend({
		file: fileLikeSchema.optional(),
		linkUrl: z.string().url('Invalid URL').optional()
	})
	.partial()
	.superRefine((data, ctx) => {
		// Only validate format consistency if format is being updated
		if (data.format) {
			validateFormatConsistency(data, ctx);
		}
		validateFile(data.file, ctx);
	});

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
	.default({});

/**
 * Schema for logging material access
 */
export const materialAccessLogSchema = z.object({
	material: z.string({ required_error: 'Material ID is required' }),
	user: z.string({ required_error: 'User ID is required' }),
	action: z.enum(['view', 'download'], { required_error: 'Action is required' })
});
