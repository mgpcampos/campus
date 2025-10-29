import { z } from 'zod';
import { fileArraySchema, fileLikeSchema } from './helpers.js';
import { t } from '$lib/i18n';

/**
 * @typedef {import('zod').RefinementCtx} RefinementCtx
 * @typedef {{ type?: string; mimeType?: string }} MimeLike
 */

const MAX_ATTACHMENTS = 10;
const IMAGE_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/heic',
	'image/heif'
];
const VIDEO_MIME_TYPES = ['video/mp4'];
const POSTER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * @param {MimeLike | undefined} file
 * @returns {string}
 */
const getMimeType = (file) => {
	if (!file || typeof file !== 'object') return '';
	const directType = Reflect.get(file, 'type');
	if (typeof directType === 'string' && directType.length > 0) return directType;
	const fallbackType = Reflect.get(file, 'mimeType');
	if (typeof fallbackType === 'string' && fallbackType.length > 0) return fallbackType;
	return '';
};

/**
 * @param {MimeLike[]} files
 * @param {string[]} allowed
 * @param {RefinementCtx} ctx
 * @param {Array<string | number>} path
 */
const validateAttachmentsMime = (files, allowed, ctx, path) => {
	files.forEach((file, index) => {
		const mime = getMimeType(file);
		if (!allowed.includes(mime)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `${mime || 'unknown'} is not supported for this media type`,
				path: [...path, index]
			});
		}
	});
};

/**
 * @param {unknown} value
 * @returns {boolean}
 */
const ensureAltTextPresent = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * @param {{ scope?: 'global' | 'space' | 'group'; space?: string | undefined; group?: string | undefined }} data
 * @param {RefinementCtx} ctx
 */
const validateScope = (data, ctx) => {
	if (!data.scope) return;
	if (data.scope === 'space') {
		if (!data.space) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'space is required when scope is set to space',
				path: ['space']
			});
		}
		if (data.group) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'group cannot be provided when scope is space',
				path: ['group']
			});
		}
	}

	if (data.scope === 'group') {
		if (!data.group) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'group is required when scope is set to group',
				path: ['group']
			});
		}
		if (data.space) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'space cannot be provided when scope is group',
				path: ['space']
			});
		}
	}

	if (data.scope === 'global') {
		if (data.space) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'space is not allowed when scope is global',
				path: ['space']
			});
		}
		if (data.group) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'group is not allowed when scope is global',
				path: ['group']
			});
		}
	}
};

/**
 * @param {{ mediaType?: 'text' | 'images' | 'video'; attachments?: MimeLike[]; mediaAltText?: string; videoPoster?: MimeLike; videoDuration?: number }} data
 * @param {RefinementCtx} ctx
 */
const validateMediaPayload = (data, ctx) => {
	if (!data.mediaType) {
		return;
	}
	const attachments = data.attachments ?? [];
	const altText = data.mediaAltText ?? '';

	switch (data.mediaType) {
		case 'text': {
			if (attachments.length > 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Text posts cannot include attachments',
					path: ['attachments']
				});
			}
			if (data.videoPoster) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Video poster is only allowed for video posts',
					path: ['videoPoster']
				});
			}
			if (typeof data.videoDuration !== 'undefined') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Video duration is only allowed for video posts',
					path: ['videoDuration']
				});
			}
			break;
		}
		case 'images': {
			if (attachments.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Image posts require at least one attachment',
					path: ['attachments']
				});
			}
			if (attachments.length > MAX_ATTACHMENTS) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Maximum ${MAX_ATTACHMENTS} images allowed`,
					path: ['attachments']
				});
			}
			validateAttachmentsMime(attachments, IMAGE_MIME_TYPES, ctx, ['attachments']);
			if (data.videoPoster) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Video poster is only allowed for video posts',
					path: ['videoPoster']
				});
			}
			if (typeof data.videoDuration !== 'undefined') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Video duration is only allowed for video posts',
					path: ['videoDuration']
				});
			}
			break;
		}
		case 'video': {
			if (attachments.length !== 1) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Video posts require exactly one video attachment',
					path: ['attachments']
				});
			}
			validateAttachmentsMime(attachments, VIDEO_MIME_TYPES, ctx, ['attachments']);
			if (data.videoPoster) {
				const mime = getMimeType(data.videoPoster);
				if (!POSTER_MIME_TYPES.includes(mime)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `${mime || 'unknown'} is not supported for video posters`,
						path: ['videoPoster']
					});
				}
			}
			if (typeof data.videoDuration === 'undefined') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Video duration is required for video posts',
					path: ['videoDuration']
				});
			}
			break;
		}
	}
};

const publishedAtSchema = z
	.union([
		z
			.string()
			.transform((value) => value.trim())
			.transform((value, ctx) => {
				if (!value) return null;
				const parsed = Date.parse(value);
				if (Number.isNaN(parsed)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'publishedAt must be a valid ISO 8601 date-time'
					});
					return z.NEVER;
				}
				return new Date(parsed).toISOString();
			}),
		z.coerce.date().transform((value) => value.toISOString()),
		z.literal(null)
	])
	.optional()
	.transform((value) => {
		if (typeof value === 'undefined') return undefined;
		if (value === null) return null;
		return value;
	});

/**
 * Schema for creating a new post
 */
export const createPostSchema = z
	.object({
		content: z
			.string()
			.min(1, { message: t('postForm.contentRequired') })
			.max(2000, { message: t('postForm.contentMaxLength') }),
		scope: z.enum(['global', 'space', 'group']).default('global'),
		space: z.string().trim().min(1).optional(),
		group: z.string().trim().min(1).optional(),
		mediaType: z.enum(['text', 'images', 'video']).default('text'),
		attachments: fileArraySchema(MAX_ATTACHMENTS, `Maximum ${MAX_ATTACHMENTS} attachments allowed`),
		mediaAltText: z
			.string()
			.trim()
			.max(2000, 'Media alt text must be 2000 characters or less')
			.optional(),
		videoPoster: fileLikeSchema.optional(),
		videoDuration: z.coerce
			.number({ invalid_type_error: 'Video duration must be a number' })
			.min(1, 'Video duration must be at least 1 second')
			.max(300, 'Video duration cannot exceed 300 seconds')
			.optional(),
		publishedAt: publishedAtSchema
	})
	.superRefine((data, ctx) => {
		validateScope(data, ctx);
		validateMediaPayload(data, ctx);
	});

/**
 * Schema for updating a post
 */
export const updatePostSchema = z
	.object({
		content: z
			.string()
			.min(1, { message: t('postForm.contentRequired') })
			.max(2000, { message: t('postForm.contentMaxLength') })
			.optional(),
		scope: z.enum(['global', 'space', 'group']).optional(),
		space: z.string().trim().min(1).optional(),
		group: z.string().trim().min(1).optional(),
		mediaType: z.enum(['text', 'images', 'video']).optional(),
		attachments: fileArraySchema(
			MAX_ATTACHMENTS,
			`Maximum ${MAX_ATTACHMENTS} attachments allowed`
		).optional(),
		mediaAltText: z
			.string()
			.trim()
			.max(2000, 'Media alt text must be 2000 characters or less')
			.optional(),
		videoPoster: fileLikeSchema.optional(),
		videoDuration: z.coerce
			.number({ invalid_type_error: 'Video duration must be a number' })
			.min(1, 'Video duration must be at least 1 second')
			.max(300, 'Video duration cannot exceed 300 seconds')
			.optional(),
		publishedAt: publishedAtSchema
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'At least one field must be provided to update a post'
	})
	.superRefine((data, ctx) => {
		if (data.scope) {
			validateScope(data, ctx);
		}

		const mediaFieldsProvided =
			typeof data.mediaType !== 'undefined' ||
			typeof data.attachments !== 'undefined' ||
			typeof data.mediaAltText !== 'undefined' ||
			typeof data.videoPoster !== 'undefined' ||
			typeof data.videoDuration !== 'undefined';

		if (!mediaFieldsProvided) {
			return;
		}

		if (!data.mediaType) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'mediaType is required when updating media fields',
				path: ['mediaType']
			});
			return;
		}

		const payload = {
			...data,
			attachments: data.attachments ?? []
		};

		validateMediaPayload(payload, ctx);
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
