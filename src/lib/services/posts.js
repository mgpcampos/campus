// Using relative import to avoid alias resolution issues in Vitest
import { browser } from '$app/environment';
import { pb } from '../pocketbase.js';
import { serverCaches, getOrSet } from '../utils/cache.js';
import { isAuthError, normalizeError, withRetry } from '../utils/errors.js';

/**
 * @typedef {{ pb?: import('pocketbase').default }} ServiceOptions
 */

/**
 * Resolve PocketBase client for service functions.
 * @param {import('pocketbase').default | undefined} provided
 */
function resolveClient(provided) {
	return provided ?? pb;
}

/**
 * Create a new post
 * @param {Object} postData - The post data
 * @param {string} postData.content - Post content
 * @param {'global'|'space'|'group'} postData.scope - Post scope
 * @param {string} [postData.space] - Space ID if scoped to space
 * @param {string} [postData.group] - Group ID if scoped to group
 * @param {File[]} [postData.attachments] - File attachments
 * @returns {Promise<Object>} Created post
 */
export async function createPost(postData, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	const client = resolveClient(serviceOptions.pb);
	const preferApi = shouldUseApiFallback(client, serviceOptions);
	if (preferApi) {
		return await createPostViaApi(postData);
	}

	try {
		const formData = buildPostFormData(postData, {
			includeAuthor: true,
			client
		});
		return await client.collection('posts').create(formData);
	} catch (err) {
		if (shouldRetryWithApi(err, serviceOptions)) {
			return await createPostViaApi(postData);
		}
		throw normalizeError(err, { context: 'createPost' });
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
	const client = resolveClient(serviceOptions.pb);
	const preferApi = shouldUseApiFallback(client, serviceOptions);
	if (preferApi) {
		return await getPostsViaApi(options);
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
		} = options;

		/**
		 * Build PocketBase filter
		 */
		const filterParts = [];
		if (scope) filterParts.push(`scope = "${scope}"`);
		if (space) filterParts.push(`space = "${space}"`);
		if (group) filterParts.push(`group = "${group}"`);
		if (q) {
			const safe = q.replace(/"/g, '\\"');
			filterParts.push(`(content ~ "%${safe}%" )`);
		}
		// Trending timeframe restriction
		let timeframeSinceIso = null;
		if (sort === 'trending') {
			const since = new Date(Date.now() - timeframeHours * 3600 * 1000);
			timeframeSinceIso = since.toISOString();
			filterParts.push(`created >= "${timeframeSinceIso}"`);
		}
		const filter = filterParts.join(' && ');

		/**
		 * Determine base sort for PocketBase query
		 * - new: chronological
		 * - top: likeCount then recent
		 * - trending: initial coarse sort by likeCount then refinement in JS
		 */
		let sortExpr = '-created';
		if (sort === 'top') {
			sortExpr = '-likeCount,-created';
		} else if (sort === 'trending') {
			sortExpr = '-likeCount,-commentCount,-created';
		}

		const cacheableDefault =
			sort === 'new' && !q && !space && !group && (scope === 'global' || !scope);
		const useCache = page === 1 && cacheableDefault;
		const cacheKey = `posts:p${page}:pp${perPage}:sort${sort}:q${q || 'none'}:f${filter || 'none'}`;

		async function fetchList() {
			return await withRetry(
				async () => {
					const list = await client.collection('posts').getList(page, perPage, {
						filter,
						sort: sortExpr,
						expand: 'author,space,group'
					});
					// Post-processing for trending: compute engagement score and re-sort
					if (sort === 'trending') {
						const now = Date.now();
						const scored = list.items
							.map((p) => {
								const likeCount = p.likeCount || 0;
								const commentCount = p.commentCount || 0;
								const createdMs = Date.parse(p.created);
								const ageHours = Math.max(1, (now - createdMs) / 3600_000);
								const score = (likeCount * 2 + commentCount * 3) / Math.pow(ageHours, 0.6);
								return { p, score };
							})
							.sort((a, b) => b.score - a.score);
						list.items = scored.map((s) => s.p);
					}
					return list;
				},
				{ context: 'getPosts' }
			);
		}

		if (!useCache) {
			return await fetchList();
		}
		return await getOrSet(serverCaches.lists, cacheKey, fetchList, { ttlMs: 10_000 });
	} catch (err) {
		if (shouldRetryWithApi(err, serviceOptions)) {
			return await getPostsViaApi(options);
		}
		throw normalizeError(err, { context: 'getPosts' });
	}
}

/**
 * Get a single post by ID
 * @param {string} id - Post ID
 * @returns {Promise<Object>} Post data
 */
export async function getPost(id, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		return await client.collection('posts').getOne(id, {
			expand: 'author,space,group'
		});
	} catch (err) {
		throw normalizeError(err, { context: 'getPost' });
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
		const client = resolveClient(serviceOptions.pb);
		return await client.collection('posts').update(id, updateData);
	} catch (err) {
		throw normalizeError(err, { context: 'updatePost' });
	}
}

/**
 * Delete a post
 * @param {string} id - Post ID
 * @returns {Promise<boolean>} Success status
 */
export async function deletePost(id, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		return await client.collection('posts').delete(id);
	} catch (err) {
		throw normalizeError(err, { context: 'deletePost' });
	}
}

/**
 * Get post statistics (like count, comment count)
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} Post statistics
 */
export async function getPostStats(postId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
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
		]);

		return { likeCount, commentCount };
	} catch (err) {
		throw normalizeError(err, { context: 'getPostStats' });
	}
}

function hasFetchSupport() {
	return typeof fetch === 'function';
}

/**
 * @param {import('pocketbase').default} client
 * @param {ServiceOptions} serviceOptions
 */
function shouldUseApiFallback(client, serviceOptions) {
	return !serviceOptions.pb && browser && hasFetchSupport() && !client.authStore.isValid;
}

/**
 * @param {any} error
 * @param {ServiceOptions} serviceOptions
 */
function shouldRetryWithApi(error, serviceOptions) {
	return !serviceOptions.pb && browser && hasFetchSupport() && isAuthError(error);
}

/**
 * @param {any} postData
 * @param {{ includeAuthor: boolean; client?: import('pocketbase').default }} options
 */
function buildPostFormData(postData, { includeAuthor, client }) {
	const formData = new FormData();
	if (includeAuthor && client?.authStore.model?.id) {
		formData.append('author', client.authStore.model.id);
	}
	if (typeof postData.content === 'string') {
		formData.append('content', postData.content);
	}
	formData.append('scope', postData.scope || 'global');
	if (postData.space) {
		formData.append('space', postData.space);
	}
	if (postData.group) {
		formData.append('group', postData.group);
	}
	if (Array.isArray(postData.attachments)) {
		postData.attachments
			.filter(/** @param {File} file */ (file) => file instanceof File && file.size > 0)
			.forEach(
				/** @param {File} file */ (file) => {
					formData.append('attachments', file);
				}
			);
	}
	return formData;
}

/**
 * @param {{ content: string; scope: 'global'|'space'|'group'; space?: string; group?: string; attachments?: File[] }} postData
 */
async function createPostViaApi(postData) {
	if (!hasFetchSupport()) {
		throw new Error('Fetch API unavailable for createPost via /api/posts');
	}
	const formData = buildPostFormData(postData, { includeAuthor: false });
	const response = await fetch('/api/posts', {
		method: 'POST',
		credentials: 'include',
		body: formData
	});
	return await handleApiResponse(response, 'createPost');
}

/**
 * @param {GetPostsOptions} [options]
 */
async function getPostsViaApi(options = {}) {
	if (!hasFetchSupport()) {
		throw new Error('Fetch API unavailable for getPosts via /api/posts');
	}
	const params = new URLSearchParams();
	if (options.page != null) params.set('page', String(options.page));
	if (options.perPage != null) params.set('perPage', String(options.perPage));
	if (options.scope) params.set('scope', options.scope);
	if (options.space) params.set('space', options.space);
	if (options.group) params.set('group', options.group);
	if (options.q) params.set('q', options.q);
	if (options.sort) params.set('sort', options.sort);
	if (options.timeframeHours != null) params.set('timeframeHours', String(options.timeframeHours));
	const query = params.toString();
	const response = await fetch(query ? `/api/posts?${query}` : '/api/posts', {
		credentials: 'include'
	});
	return await handleApiResponse(response, 'getPosts');
}

/**
 * @param {Response} response
 * @param {string} context
 */
async function handleApiResponse(response, context) {
	let payload = null;
	try {
		payload = await response.json();
	} catch {
		/* ignore */
	}
	if (response.ok) {
		return payload ?? {};
	}
	const message =
		payload?.error?.message || payload?.message || `Request failed with status ${response.status}`;
	const error = new Error(message);
	/** @type {any} */ (error).status = response.status;
	/** @type {any} */ (error).response = { data: payload };
	throw normalizeError(error, { context });
}
