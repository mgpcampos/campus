import { error, json } from '@sveltejs/kit'
import { createPostSchema, postQuerySchema } from '$lib/schemas/post.js'
import { trackFeedPerformance } from '$lib/server/analytics/feedPerformance'
import { recordPostModerationSignal } from '$lib/services/moderation.js'
import { createPost, getPosts } from '$lib/services/posts.js'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.ts'
import { validatePostMedia } from '$lib/utils/media.js'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
	try {
		const queryParams = Object.fromEntries(url.searchParams)
		// Allow either ?q= or legacy ?search= param
		if (!queryParams.q && queryParams.search) {
			queryParams.q = queryParams.search
		}
		const validatedQuery = postQuerySchema.parse(queryParams)

		const result = await trackFeedPerformance(locals.pb, validatedQuery, () =>
			getPosts(validatedQuery, { pb: locals.pb })
		)
		// Add short-lived HTTP cache for anonymous global first page to leverage CDN/browser caching
		const headers = new Headers()
		const isCacheable =
			(!validatedQuery.scope || validatedQuery.scope === 'global') &&
			!validatedQuery.space &&
			!validatedQuery.group &&
			(validatedQuery.page == null || Number(validatedQuery.page) === 1) &&
			!validatedQuery.q &&
			(!validatedQuery.sort || validatedQuery.sort === 'new')
		if (isCacheable) {
			headers.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30')
		}
		return json(result, { headers })
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getPosts' })
		console.error('Error fetching posts:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/**
 * Parse media type from form data or auto-infer from attachments
 * @param {string | undefined} mediaTypeValue
 * @param {File[]} attachments
 */
function parseMediaType(mediaTypeValue, attachments) {
	// If mediaType explicitly provided, use it
	if (mediaTypeValue === 'images' || mediaTypeValue === 'video' || mediaTypeValue === 'text') {
		return mediaTypeValue
	}

	// Auto-infer from attachments if not provided
	if (attachments.length === 0) {
		return 'text'
	}

	const ALLOWED_IMAGE_MIME = [
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/gif',
		'image/heic',
		'image/heif'
	]
	const ALLOWED_VIDEO_MIME = ['video/mp4']

	const firstFile = attachments[0]
	if (ALLOWED_IMAGE_MIME.includes(firstFile.type)) {
		return 'images'
	}
	if (ALLOWED_VIDEO_MIME.includes(firstFile.type)) {
		return 'video'
	}

	// Fallback to text if MIME type is unknown
	return 'text'
}

/**
 * Parse video duration from form data
 * @param {FormDataEntryValue | null} videoDurationRaw
 */
function parseVideoDuration(videoDurationRaw) {
	if (typeof videoDurationRaw === 'string' && videoDurationRaw.trim().length > 0) {
		return Number.parseFloat(videoDurationRaw)
	}
	return undefined
}

/**
 * Parse video poster from form data
 * @param {FormDataEntryValue | null} posterEntry
 */
function parseVideoPoster(posterEntry) {
	return posterEntry instanceof File && posterEntry.size > 0 ? posterEntry : undefined
}

/**
 * Parse published at timestamp from form data
 * @param {FormDataEntryValue | null} publishedAtRaw
 */
function parsePublishedAt(publishedAtRaw) {
	return typeof publishedAtRaw === 'string' && publishedAtRaw.trim().length > 0
		? publishedAtRaw
		: undefined
}

/**
 * Parse media alt text from form data
 * @param {FormDataEntryValue | null} mediaAltTextValue
 */
function parseMediaAltText(mediaAltTextValue) {
	return typeof mediaAltTextValue === 'string' ? mediaAltTextValue : undefined
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	// Check authentication
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const formData = await request.formData()

		const rawFiles = /** @type {File[]} */ (
			formData.getAll('attachments').filter((f) => f instanceof File && f.size > 0)
		)
		const mediaTypeRaw = formData.get('mediaType')
		const mediaType = parseMediaType(
			mediaTypeRaw ? mediaTypeRaw.toString() : undefined,
			rawFiles
		)
		const videoPoster = parseVideoPoster(formData.get('videoPoster'))
		const videoDuration = parseVideoDuration(formData.get('videoDuration'))
		const publishedAt = parsePublishedAt(formData.get('publishedAt'))
		const mediaAltText = parseMediaAltText(formData.get('mediaAltText'))

		const mediaValidation = validatePostMedia({
			mediaType,
			attachments: rawFiles,
			poster: videoPoster,
			videoDuration
		})
		if (!mediaValidation.valid) {
			return error(400, mediaValidation.errors.join('; '))
		}

		const postData = {
			content: formData.get('content'),
			scope: formData.get('scope') || 'global',
			space: formData.get('space') || undefined,
			group: formData.get('group') || undefined,
			attachments: rawFiles,
			mediaType,
			mediaAltText,
			videoPoster,
			videoDuration,
			publishedAt
		}

		const validatedData = createPostSchema.parse(postData)

		const newPost = await createPost(validatedData, {
			pb: locals.pb,
			emitModerationMetadata: async (metadata) =>
				await recordPostModerationSignal(metadata, { pbClient: locals.pb })
		})
		return json(newPost, { status: 201 })
	} catch (err) {
		const isZod = err instanceof Error && err.name === 'ZodError'
		const n = normalizeError(err, { context: 'api:createPost' })
		console.error('Error creating post:', n.toString())
		const status = isZod ? 400 : n.status || 500
		return json({ error: toErrorPayload({ ...n, status }) }, { status })
	}
}
