// Using relative import to avoid alias resolution issues in Vitest
import { pb } from '../pocketbase.js';
import { serverCaches, getOrSet } from '../utils/cache.js';

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
export async function createPost(postData) {
	const formData = new FormData();
	
	if (pb.authStore.model?.id) {
		formData.append('author', pb.authStore.model.id);
	}
	formData.append('content', postData.content);
	formData.append('scope', postData.scope || 'global');
	
	if (postData.space) {
		formData.append('space', postData.space);
	}
	
	if (postData.group) {
		formData.append('group', postData.group);
	}
	
	// Add file attachments
	if (postData.attachments && postData.attachments.length > 0) {
		postData.attachments.forEach((file) => {
			formData.append('attachments', file);
		});
	}
	
	return await pb.collection('posts').create(formData);
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
export async function getPosts(options = /** @type {GetPostsOptions} */({})) {
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

const cacheableDefault = sort === 'new' && !q && !space && !group && (scope === 'global' || !scope);
const useCache = page === 1 && cacheableDefault;
const cacheKey = `posts:p${page}:pp${perPage}:sort${sort}:q${q || 'none'}:f${filter || 'none'}`;

async function fetchList() {
const list = await pb.collection('posts').getList(page, perPage, {
filter,
sort: sortExpr,
expand: 'author,space,group'
});
// Post-processing for trending: compute engagement score and re-sort
if (sort === 'trending') {
const now = Date.now();
const scored = list.items.map(p => {
const likeCount = p.likeCount || 0;
const commentCount = p.commentCount || 0;
const createdMs = Date.parse(p.created);
const ageHours = Math.max(1, (now - createdMs) / 3600_000);
const score = (likeCount * 2 + commentCount * 3) / Math.pow(ageHours, 0.6);
return { p, score };
}).sort((a, b) => b.score - a.score);
list.items = scored.map(s => s.p);
}
return list;
}

if (!useCache) {
return await fetchList();
}
return await getOrSet(serverCaches.lists, cacheKey, fetchList, { ttlMs: 10_000 });
}

/**
 * Get a single post by ID
 * @param {string} id - Post ID
 * @returns {Promise<Object>} Post data
 */
export async function getPost(id) {
	return await pb.collection('posts').getOne(id, {
		expand: 'author,space,group'
	});
}

/**
 * Update a post
 * @param {string} id - Post ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated post
 */
export async function updatePost(id, updateData) {
	return await pb.collection('posts').update(id, updateData);
}

/**
 * Delete a post
 * @param {string} id - Post ID
 * @returns {Promise<boolean>} Success status
 */
export async function deletePost(id) {
	return await pb.collection('posts').delete(id);
}

/**
 * Get post statistics (like count, comment count)
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} Post statistics
 */
export async function getPostStats(postId) {
	const [likeCount, commentCount] = await Promise.all([
		pb.collection('likes').getList(1, 1, {
			filter: `post = "${postId}"`,
			totalCount: true
		}).then(result => result.totalItems),
		pb.collection('comments').getList(1, 1, {
			filter: `post = "${postId}"`,
			totalCount: true
		}).then(result => result.totalItems)
	]);
	
	return { likeCount, commentCount };
}
