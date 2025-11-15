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
 * @property {'new'|'top'|'trending'} [sort='new'] Sort mode
 * @property {number} [timeframeHours=48] Recency window (hours) for trending
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
		const {
			page = 1,
			perPage = 20,
			scope,
			space,
			group,
			q,
			sort = 'new',
			timeframeHours = 48
		} = options

		/**
		 * Build PocketBase filter
		 */
		const filterParts = []
		if (scope) filterParts.push(`scope = "${scope}"`)
		if (space) filterParts.push(`space = "${space}"`)
		if (group) filterParts.push(`group = "${group}"`)
		if (q) {
			const safe = q.replace(/"/g, '\\"')
			filterParts.push(`(content ~ "%${safe}%" )`)
		}
		// Trending timeframe restriction
		let timeframeSinceIso = null
		if (sort === 'trending') {
			const since = new Date(Date.now() - timeframeHours * 3600 * 1000)
			timeframeSinceIso = since.toISOString()
			filterParts.push(`created >= "${timeframeSinceIso}"`)
		}
		const filter = filterParts.join(' && ')

		/**
		 * Determine base sort for PocketBase query
		 * - new: chronological
		 * - top: likeCount then recent
		 * - trending: initial coarse sort by likeCount then refinement in JS
		 */
		let sortExpr = '-created'
		if (sort === 'top') {
			sortExpr = '-likeCount,-created'
		} else if (sort === 'trending') {
			sortExpr = '-likeCount,-commentCount,-created'
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
					// Post-processing for trending: compute engagement score and re-sort
					if (sort === 'trending') {
						const now = Date.now()
						const scored = list.items
							.map((p) => {
								const likeCount = p.likeCount || 0
								const commentCount = p.commentCount || 0
								const createdMs = Date.parse(p.created)
								const ageHours = Math.max(1, (now - createdMs) / 3_600_000)
								const score = (likeCount * 2 + commentCount * 3) / ageHours ** 0.6
								return { p, score }
							})
							.sort((a, b) => b.score - a.score)
						list.items = scored.map((s) => s.p)
					}
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
	const client = options.client
	const includeAuthor = Boolean(options.includeAuthor)
	const authorId = client?.authStore.model?.id ?? null
	if (includeAuthor && authorId) {
		formData.set('author', authorId)
	}

	const sanitizedContent = sanitizeContent(
		typeof postData.content === 'string' ? postData.content : ''
	)
	if (!sanitizedContent) {
		throw new Error('Post content cannot be empty after sanitization')
	}
	formData.set('content', sanitizedContent)

	const scope = normalizeScope(postData.scope)
	formData.set('scope', scope)
	if (scope === 'space' && typeof postData.space === 'string' && postData.space) {
		formData.set('space', postData.space)
	}
	if (scope === 'group' && typeof postData.group === 'string' && postData.group) {
		formData.set('group', postData.group)
	}

	const mediaType = normalizeMediaType(postData.mediaType)
	formData.set('mediaType', mediaType)

	const attachmentsInput = Array.isArray(postData.attachments) ? postData.attachments : []
	/** @type {File[]} */
	const normalizedAttachments = []
	for (let i = 0; i < attachmentsInput.length; i += 1) {
		const candidate = normalizeToFile(attachmentsInput[i], `attachment-${i + 1}`)
		if (candidate) {
			normalizedAttachments.push(candidate)
			formData.append('attachments', candidate)
		}
	}

	const sanitizedAltText = sanitizePlainText(postData.mediaAltText || '').trim()
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
 * @param {Record<string, any>} updateData
 */
function prepareUpdatePayload(updateData) {
	const payload = {}
	if (typeof updateData?.content === 'string') {
		payload.content = sanitizeContent(updateData.content)
	}
	if (typeof updateData?.mediaAltText === 'string') {
		const trimmedAlt = sanitizePlainText(updateData.mediaAltText).trim()
		payload.mediaAltText = trimmedAlt
	}
	if (typeof updateData?.mediaType === 'string') {
		payload.mediaType = normalizeMediaType(updateData.mediaType)
	}
	if ('videoDuration' in updateData) {
		const normalizedDuration = toVideoDuration(updateData.videoDuration)
		payload.videoDuration = normalizedDuration
	}
	if (typeof updateData?.scope === 'string') {
		payload.scope = normalizeScope(updateData.scope)
	}
	if ('space' in updateData) {
		const value = typeof updateData.space === 'string' && updateData.space ? updateData.space : null
		payload.space = value
	}
	if ('group' in updateData) {
		const value = typeof updateData.group === 'string' && updateData.group ? updateData.group : null
		payload.group = value
	}
	if ('publishedAt' in updateData) {
		if (updateData.publishedAt === null) {
			payload.publishedAt = null
		} else {
			const normalized = normalizePublishedAt(updateData.publishedAt)
			if (normalized) {
				payload.publishedAt = normalized
			} else {
				payload.publishedAt = null
			}
		}
	}
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
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
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
	if (options.timeframeHours != null) params.set('timeframeHours', String(options.timeframeHours))
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
		payload?.error?.message || payload?.message || `Request failed with status ${response.status}`
	const error = new Error(message)
	const enhancedError = /** @type {Error & { status?: number; response?: { data: unknown } }} */ (
		error
	)
	enhancedError.status = response.status
	enhancedError.response = { data: payload }
	throw normalizeError(enhancedError, { context })
}
