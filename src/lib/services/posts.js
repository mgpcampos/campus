// Using relative import to avoid alias resolution issues in Vitest
import { pb } from '../pocketbase.js';

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
 * Get posts with pagination and filtering
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.perPage=20] - Items per page
 * @param {'global'|'space'|'group'} [options.scope] - Filter by scope
 * @param {string} [options.space] - Filter by space ID
 * @param {string} [options.group] - Filter by group ID
 * @returns {Promise<Object>} Posts with pagination info
 */
export async function getPosts(options = {}) {
	const { page = 1, perPage = 20, scope, space, group } = options;
	
	let filter = '';
	const filterParts = [];
	
	if (scope) {
		filterParts.push(`scope = "${scope}"`);
	}
	
	if (space) {
		filterParts.push(`space = "${space}"`);
	}
	
	if (group) {
		filterParts.push(`group = "${group}"`);
	}
	
	if (filterParts.length > 0) {
		filter = filterParts.join(' && ');
	}
	
	return await pb.collection('posts').getList(page, perPage, {
		filter,
		sort: '-created',
		expand: 'author,space,group'
	});
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