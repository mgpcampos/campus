import { browser } from '$app/environment'
import { pb } from '../pocketbase.js'
import { getOrSet, serverCaches } from '../utils/cache.js'
import { isAuthError, normalizeError, withRetry } from '../utils/errors.ts'
import { sanitizeContent, sanitizePlainText } from '../utils/sanitize.js'

const MIME_EXTENSION_MAP = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/heic': 'heic',
	'image/heif': 'heif',
	'video/mp4': 'mp4'
}

/**
 * @typedef {Object} ModerationSignalPayload
 * @property {'post'} resource
 * @property {'global'|'space'|'group'} scope
 * @property {'text'|'images'|'video'} mediaType
 * @property {number} attachmentCount
 * @property {boolean} hasAltText
 * @property {boolean} hasPoster
 * @property {number|null} videoDuration
 * @property {number} contentLength
 * @property {boolean} containsLinks
 * @property {number} wordCount
 * @property {string|null} postId
 * @property {string|null} authorId
 * @property {Record<string, unknown>} [extra]
 */

/**
 * @typedef {{
 *  pb?: import('pocketbase').default;
 *  emitModerationMetadata?: (metadata: ModerationSignalPayload) => void | Promise<void>;
 * }} ServiceOptions
 */

/**
 * @typedef {Object} ModerationMetadataParams
 * @property {'global'|'space'|'group'} scope
 * @property {'text'|'images'|'video'} mediaType
 * @property {File[]} attachments
 * @property {boolean} hasAltText
 * @property {boolean} hasPoster
 * @property {number|null} videoDuration
 * @property {string} content
 * @property {number} altTextLength
 * @property {string | null | undefined} publishedAt
 */

/**
 * @typedef {Object} ModerationMetadataBase
 * @property {'global'|'space'|'group'} scope
 * @property {'text'|'images'|'video'} mediaType
 * @property {number} attachmentCount
 * @property {boolean} hasAltText
 * @property {boolean} hasPoster
 * @property {number|null} videoDuration
 * @property {number} contentLength
 * @property {boolean} containsLinks
 * @property {number} wordCount
 * @property {Record<string, unknown>} extra
 */

/**
 * @param {unknown} value
 */
function normalizePublishedAt(value) {
	if (!value) return null
	if (value instanceof Date) return value.toISOString()
	if (typeof value === 'string' && value.trim().length > 0) return value.trim()
	return null
}

/**
 * Resolve PocketBase client for service functions.
 * @param {import('pocketbase').default | undefined} provided
 */
function resolveClient(provided) {
	return provided ?? pb
}

/**
 * Create a new post
 * @param {Object} postData - The post data
 * @param {string} postData.content - Post content
 * @param {'global'|'space'|'group'} postData.scope - Post scope
 * @param {string} [postData.space] - Space ID if scoped to space
 * @param {string} [postData.group] - Group ID if scoped to group
 * @param {File[]|Blob[]} [postData.attachments] - File attachments
 * @param {'text'|'images'|'video'} [postData.mediaType]
 * @param {string} [postData.mediaAltText]
 * @param {File|Blob} [postData.videoPoster]
 * @param {number|string} [postData.videoDuration]
 * @param {Date|string|null} [postData.publishedAt]
 * @returns {Promise<Object>} Created post
 */
export async function createPost(postData, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	const client = resolveClient(serviceOptions.pb)
	const preferApi = shouldUseApiFallback(client, serviceOptions)
	if (preferApi) {
		const { formData, moderationMetadata } = buildPostPayload(postData, {
			includeAuthor: false
		})
		return await createPostViaApi(formData, moderationMetadata, serviceOptions)
	}

	try {
		const { formData, moderationMetadata } = buildPostPayload(postData, {
			includeAuthor: true,
			client
		})
		const created = await client.collection('posts').create(formData)
		await emitModerationMetadata(moderationMetadata, {
			serviceOptions,
			client,
			post: created
		})
		return created
	} catch (err) {
		if (shouldRetryWithApi(err, serviceOptions)) {
			const { formData, moderationMetadata } = buildPostPayload(postData, {
				includeAuthor: false
			})
			return await createPostViaApi(formData, moderationMetadata, serviceOptions)
		}
		throw normalizeError(err, { context: 'createPost' })
	}
}

/**
 * @typedef {Object} GetPostsOptions
 * @property {number} [page=1] Page number
 * @property {number} [perPage=20] Items per page
 * @property {'global'|'space'|'group'} [scope]
 * @property {string} [space]
 * @property {string} [group]
 * @property {string} [q] Free-text content search query
 * @property {'new'|'top'} [sort='new'] Sort mode
 */

/**
 * Get posts with pagination, search and discovery options
 * @param {GetPostsOptions} [options]
 * @returns {Promise<Object>} Posts with pagination info
 */
export async function getPosts(
	options = /** @type {GetPostsOptions} */ ({}),
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	const client = resolveClient(serviceOptions.pb)
	const preferApi = shouldUseApiFallback(client, serviceOptions)
	if (preferApi) {
		return await getPostsViaApi(options)
	}

	try {
		const { page = 1, perPage = 20, scope, space, group, q, sort = 'new' } = options

		/**
		 * Build PocketBase filter
		 */
		const filterParts = []
		if (scope) filterParts.push(`scope = "${scope}"`)
		if (space) filterParts.push(`space = "${space}"`)
		if (group) filterParts.push(`group = "${group}"`)
		if (q) {
			const safe = JSON.stringify(q).slice(1, -1)
			filterParts.push(`(content ~ "%${safe}%" )`)
		}
		const filter = filterParts.join(' && ')

		/**
		 * Determine base sort for PocketBase query
		 * - new: chronological
		 * - top: likeCount then recent
		 */
		let sortExpr = '-created'
		if (sort === 'top') {
			sortExpr = '-likeCount,-created'
		}

		const cacheableDefault =
			sort === 'new' && !q && !space && !group && (scope === 'global' || !scope)
		const useCache = page === 1 && cacheableDefault
		const cacheKey = `posts:p${page}:pp${perPage}:sort${sort}:q${q || 'none'}:f${filter || 'none'}`

		async function fetchList() {
			return await withRetry(
				async () => {
					const list = await client.collection('posts').getList(page, perPage, {
						filter,
						sort: sortExpr,
						expand: 'author,space,group'
					})
					return list
				},
				{ context: 'getPosts' }
			)
		}

		if (!useCache) {
			return await fetchList()
		}
		return await getOrSet(serverCaches.lists, cacheKey, fetchList, { ttlMs: 10_000 })
	} catch (err) {
		if (shouldRetryWithApi(err, serviceOptions)) {
			return await getPostsViaApi(options)
		}
		throw normalizeError(err, { context: 'getPosts' })
	}
}

/**
 * Get a single post by ID
 * @param {string} id - Post ID
 * @returns {Promise<Object>} Post data
 */
export async function getPost(id, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb)
		return await client.collection('posts').getOne(id, {
			expand: 'author,space,group'
		})
	} catch (err) {
		throw normalizeError(err, { context: 'getPost' })
	}
}

/**
 * Update a post
 * @param {string} id - Post ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated post
 */
export async function updatePost(
	id,
	updateData,
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	try {
		const client = resolveClient(serviceOptions.pb)
		const sanitized = prepareUpdatePayload(updateData)
		return await client.collection('posts').update(id, sanitized)
	} catch (err) {
		throw normalizeError(err, { context: 'updatePost' })
	}
}

/**
 * Delete a post
 * @param {string} id - Post ID
 * @returns {Promise<boolean>} Success status
 */
export async function deletePost(id, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb)
		return await client.collection('posts').delete(id)
	} catch (err) {
		throw normalizeError(err, { context: 'deletePost' })
	}
}

/**
 * Get post statistics (like count, comment count)
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} Post statistics
 */
export async function getPostStats(postId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb)
		const [likeCount, commentCount] = await Promise.all([
			client
				.collection('likes')
				.getList(1, 1, {
					filter: `post = "${postId}"`,
					totalCount: true
				})
				.then((result) => result.totalItems),
			client
				.collection('comments')
				.getList(1, 1, {
					filter: `post = "${postId}"`,
					totalCount: true
				})
				.then((result) => result.totalItems)
		])

		return { likeCount, commentCount }
	} catch (err) {
		throw normalizeError(err, { context: 'getPostStats' })
	}
}

function hasFetchSupport() {
	return typeof fetch === 'function'
}

/**
 * @param {import('pocketbase').default} client
 * @param {ServiceOptions} serviceOptions
 */
function shouldUseApiFallback(client, serviceOptions) {
	return !serviceOptions.pb && browser && hasFetchSupport() && !client.authStore.isValid
}

/**
 * @param {any} error
 * @param {ServiceOptions} serviceOptions
 */
function shouldRetryWithApi(error, serviceOptions) {
	return !serviceOptions.pb && browser && hasFetchSupport() && isAuthError(error)
}

/**
 * @param {any} postData
 * @param {{ includeAuthor?: boolean; client?: import('pocketbase').default }} [options]
 * @returns {{ formData: FormData; moderationMetadata: ModerationSignalPayload }}
 */
function buildPostPayload(postData, options = {}) {
	const formData = new FormData()
	const authorId = appendAuthorField(formData, options)
	const sanitizedContent = applyContentField(formData, postData.content)
	const scope = applyScopeFields(formData, postData)
	const mediaType = applyMediaTypeField(formData, postData.mediaType)
	const normalizedAttachments = appendAttachmentFields(formData, postData.attachments)
	const { sanitizedAltText, posterFile, coercedDuration, normalizedPublishedAt } =
		applyMediaDetails(formData, postData)

	const metadata = createModerationMetadata({
		scope,
		mediaType,
		attachments: normalizedAttachments,
		hasAltText: sanitizedAltText.length > 0,
		hasPoster: Boolean(posterFile),
		videoDuration: coercedDuration,
		content: sanitizedContent,
		altTextLength: sanitizedAltText.length,
		publishedAt: normalizedPublishedAt
	})

	return {
		formData,
		moderationMetadata: {
			resource: 'post',
			postId: null,
			authorId,
			...metadata
		}
	}
}

/**
 * @param {FormData} formData
 * @param {{ includeAuthor?: boolean; client?: import('pocketbase').default }} [options]
 * @returns {string|null}
 */
function appendAuthorField(
	formData,
	options = /** @type {{ includeAuthor?: boolean; client?: import('pocketbase').default }} */ ({})
) {
	if (!options.includeAuthor) return null
	const authorId = options.client?.authStore.model?.id ?? null
	if (authorId) {
		formData.set('author', authorId)
	}
	return authorId
}

/**
 * @param {FormData} formData
 * @param {unknown} content
 * @returns {string}
 */
function applyContentField(formData, content) {
	const sanitizedContent = sanitizeContent(typeof content === 'string' ? content : '')
	if (!sanitizedContent) {
		throw new Error('Post content cannot be empty after sanitization')
	}
	formData.set('content', sanitizedContent)
	return sanitizedContent
}

/**
 * @param {FormData} formData
 * @param {{ scope?: unknown; space?: unknown; group?: unknown }} postData
 * @returns {'global'|'space'|'group'}
 */
function applyScopeFields(formData, postData) {
	const scope = normalizeScope(postData.scope)
	formData.set('scope', scope)
	if (scope === 'space' && typeof postData.space === 'string' && postData.space) {
		formData.set('space', postData.space)
	}
	if (scope === 'group' && typeof postData.group === 'string' && postData.group) {
		formData.set('group', postData.group)
	}
	return scope
}

/**
 * @param {FormData} formData
 * @param {unknown} mediaTypeInput
 * @returns {'text'|'images'|'video'}
 */
function applyMediaTypeField(formData, mediaTypeInput) {
	const mediaType = normalizeMediaType(mediaTypeInput)
	formData.set('mediaType', mediaType)
	return mediaType
}

/**
 * @param {FormData} formData
 * @param {unknown} attachmentsInput
 * @returns {File[]}
 */
function appendAttachmentFields(formData, attachmentsInput) {
	const attachments = Array.isArray(attachmentsInput) ? attachmentsInput : []
	/** @type {File[]} */
	const normalizedAttachments = []
	for (let i = 0; i < attachments.length; i += 1) {
		const candidate = normalizeToFile(attachments[i], `attachment-${i + 1}`)
		if (candidate) {
			normalizedAttachments.push(candidate)
			formData.append('attachments', candidate)
		}
	}
	return normalizedAttachments
}

/**
 * @param {FormData} formData
 * @param {{ mediaAltText?: unknown; videoPoster?: unknown; videoDuration?: unknown; publishedAt?: unknown }} postData
 * @returns {{ sanitizedAltText: string; posterFile: File | null; coercedDuration: number | null; normalizedPublishedAt: string | null }}
 */
function applyMediaDetails(formData, postData) {
	const mediaAltText = typeof postData.mediaAltText === 'string' ? postData.mediaAltText : ''
	const sanitizedAltText = sanitizePlainText(mediaAltText).trim()
	if (sanitizedAltText) {
		formData.set('mediaAltText', sanitizedAltText)
	}

	const posterFile = normalizeToFile(postData.videoPoster, 'video-poster')
	if (posterFile) {
		formData.set('videoPoster', posterFile)
	}

	const coercedDuration = toVideoDuration(postData.videoDuration)
	if (coercedDuration !== null) {
		formData.set('videoDuration', String(coercedDuration))
	}

	const normalizedPublishedAt = normalizePublishedAt(postData.publishedAt)
	if (normalizedPublishedAt) {
		formData.set('publishedAt', normalizedPublishedAt)
	}

	return { sanitizedAltText, posterFile, coercedDuration, normalizedPublishedAt }
}

/**
 * @param {unknown} scope
 * @returns {'global'|'space'|'group'}
 */
function normalizeScope(scope) {
	if (scope === 'space' || scope === 'group' || scope === 'global') {
		return scope
	}
	return 'global'
}

/**
 * @param {unknown} mediaType
 * @returns {'text'|'images'|'video'}
 */
function normalizeMediaType(mediaType) {
	if (mediaType === 'images' || mediaType === 'video') {
		return mediaType
	}
	return 'text'
}

/**
 * @param {unknown} fileLike
 * @param {string} baseName
 * @returns {File|null}
 */
function normalizeToFile(fileLike, baseName) {
	if (!fileLike) return null
	if (typeof File !== 'undefined' && fileLike instanceof File) {
		return fileLike
	}
	if (typeof Blob !== 'undefined' && fileLike instanceof Blob) {
		const nameProp = /** @type {{ name?: string }} */ (fileLike).name
		const name =
			typeof nameProp === 'string' && nameProp
				? nameProp
				: `${baseName}.${guessExtension(fileLike.type)}`
		return new File([fileLike], name, {
			type: fileLike.type || 'application/octet-stream'
		})
	}
	return null
}

/**
 * @param {string|undefined} mime
 * @returns {string}
 */
function guessExtension(mime) {
	if (!mime || typeof mime !== 'string') return 'bin'
	if (Object.hasOwn(MIME_EXTENSION_MAP, mime)) {
		return MIME_EXTENSION_MAP[/** @type {keyof typeof MIME_EXTENSION_MAP} */ (mime)]
	}
	return 'bin'
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function toVideoDuration(value) {
	if (value == null) return null
	const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
	if (!Number.isFinite(num)) return null
	const rounded = Math.round(num)
	return Math.max(0, rounded)
}

/**
 * Process content field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processContentField(updateData, payload) {
	if (typeof updateData?.content === 'string') {
		payload.content = sanitizeContent(updateData.content)
	}
}

/**
 * Process media alt text field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processMediaAltTextField(updateData, payload) {
	if (typeof updateData?.mediaAltText === 'string') {
		payload.mediaAltText = sanitizePlainText(updateData.mediaAltText).trim()
	}
}

/**
 * Process media type field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processMediaTypeField(updateData, payload) {
	if (typeof updateData?.mediaType === 'string') {
		payload.mediaType = normalizeMediaType(updateData.mediaType)
	}
}

/**
 * Process video duration field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processVideoDurationField(updateData, payload) {
	if ('videoDuration' in updateData) {
		payload.videoDuration = toVideoDuration(updateData.videoDuration)
	}
}

/**
 * Process scope field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processScopeField(updateData, payload) {
	if (typeof updateData?.scope === 'string') {
		payload.scope = normalizeScope(updateData.scope)
	}
}

/**
 * Process space field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processSpaceField(updateData, payload) {
	if ('space' in updateData) {
		payload.space =
			typeof updateData.space === 'string' && updateData.space ? updateData.space : null
	}
}

/**
 * Process group field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processGroupField(updateData, payload) {
	if ('group' in updateData) {
		payload.group =
			typeof updateData.group === 'string' && updateData.group ? updateData.group : null
	}
}

/**
 * Process published at field for update payload
 * @param {Record<string, any>} updateData
 * @param {Record<string, any>} payload
 */
function processPublishedAtField(updateData, payload) {
	if ('publishedAt' in updateData) {
		payload.publishedAt =
			updateData.publishedAt === null
				? null
				: (normalizePublishedAt(updateData.publishedAt) ?? null)
	}
}

/**
 * @param {Record<string, any>} updateData
 */
function prepareUpdatePayload(updateData) {
	const payload = {}
	processContentField(updateData, payload)
	processMediaAltTextField(updateData, payload)
	processMediaTypeField(updateData, payload)
	processVideoDurationField(updateData, payload)
	processScopeField(updateData, payload)
	processSpaceField(updateData, payload)
	processGroupField(updateData, payload)
	processPublishedAtField(updateData, payload)
	return payload
}

/**
 * @param {{
 *  scope: 'global'|'space'|'group';
 *  mediaType: 'text'|'images'|'video';
 *  attachments: File[];
 *  hasAltText: boolean;
 *  hasPoster: boolean;
 *  videoDuration: number | null;
 *  content: string;
 *  altTextLength: number
 *  publishedAt?: string | null
 * }} params
 * @returns {{
 *  scope: 'global'|'space'|'group';
 *  mediaType: 'text'|'images'|'video';
 *  attachmentCount: number;
 *  hasAltText: boolean;
 *  hasPoster: boolean;
 *  videoDuration: number|null;
 *  contentLength: number;
 *  containsLinks: boolean;
 *  wordCount: number;
 *  extra: Record<string, unknown>
 * }}
 */
function createModerationMetadata({
	scope,
	mediaType,
	attachments,
	hasAltText,
	hasPoster,
	videoDuration,
	content,
	altTextLength,
	publishedAt
}) {
	const plain = content
		.replaceAll(/<[^>]+>/g, ' ')
		.replaceAll(/\s+/g, ' ')
		.trim()
	const wordCount = plain ? plain.split(/\s+/).filter(Boolean).length : 0
	const containsLinks = /https?:\/\//i.test(plain)
	return {
		scope,
		mediaType,
		attachmentCount: attachments.length,
		hasAltText,
		hasPoster,
		videoDuration: typeof videoDuration === 'number' ? videoDuration : null,
		contentLength: plain.length,
		containsLinks,
		wordCount,
		extra: {
			attachmentMimeTypes: attachments.map((file) => file.type ?? null),
			altTextLength,
			hasDuration: typeof videoDuration === 'number',
			publishedAt,
			mediaSummary: {
				hasAltText,
				hasPoster
			}
		}
	}
}

/**
 * @param {ModerationSignalPayload} moderationMetadata
 * @param {{ serviceOptions: ServiceOptions; client?: import('pocketbase').default; post?: any }} context
 */
async function emitModerationMetadata(moderationMetadata, { serviceOptions, client, post }) {
	if (!moderationMetadata) return
	const emitter = serviceOptions?.emitModerationMetadata
	if (typeof emitter !== 'function') return
	const postId = typeof post?.id === 'string' ? post.id : moderationMetadata.postId
	const authorId =
		moderationMetadata.authorId ??
		client?.authStore?.model?.id ??
		(typeof post?.author === 'string' ? post.author : null)
	try {
		await emitter({
			...moderationMetadata,
			postId,
			authorId
		})
	} catch (error) {
		console.warn('[posts] Failed to emit moderation metadata', error)
	}
}

/**
 * @param {FormData} formData
 * @param {ModerationSignalPayload} moderationMetadata
 * @param {ServiceOptions} serviceOptions
 */
async function createPostViaApi(formData, moderationMetadata, serviceOptions) {
	if (!hasFetchSupport()) {
		throw new Error('Fetch API unavailable for createPost via /api/posts')
	}
	const response = await fetch('/api/posts', {
		method: 'POST',
		credentials: 'include',
		body: formData
	})
	const payload = await handleApiResponse(response, 'createPost')
	await emitModerationMetadata(moderationMetadata, {
		serviceOptions,
		post: payload
	})
	return payload
}

/**
 * @param {GetPostsOptions} [options]
 */
async function getPostsViaApi(options = {}) {
	if (!hasFetchSupport()) {
		throw new Error('Fetch API unavailable for getPosts via /api/posts')
	}
	const params = new URLSearchParams()
	if (options.page != null) params.set('page', String(options.page))
	if (options.perPage != null) params.set('perPage', String(options.perPage))
	if (options.scope) params.set('scope', options.scope)
	if (options.space) params.set('space', options.space)
	if (options.group) params.set('group', options.group)
	if (options.q) params.set('q', options.q)
	if (options.sort) params.set('sort', options.sort)
	const query = params.toString()
	const response = await fetch(query ? `/api/posts?${query}` : '/api/posts', {
		credentials: 'include'
	})
	return await handleApiResponse(response, 'getPosts')
}

/**
 * @param {Response} response
 * @param {string} context
 */
async function handleApiResponse(response, context) {
	let payload = null
	try {
		payload = await response.json()
	} catch {
		/* ignore */
	}
	if (response.ok) {
		return payload ?? {}
	}
	const message =
		payload?.error?.message ||
		payload?.message ||
		`Request failed with status ${response.status}`
	const error = new Error(message)
	const enhancedError = /** @type {Error & { status?: number; response?: { data: unknown } }} */ (
		error
	)
	enhancedError.status = response.status
	enhancedError.response = { data: payload }
	throw normalizeError(enhancedError, { context })
}
