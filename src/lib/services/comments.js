import { pb } from '$lib/pocketbase.js';

/**
 * Create a new comment on a post
 * @param {string} postId - Post ID
 * @param {string} content - Comment content
 * @returns {Promise<Object>} Created comment
 */
export async function createComment(postId, content) {
	if (!pb.authStore.model?.id) {
		throw new Error('User must be authenticated to comment');
	}

	if (!content.trim()) {
		throw new Error('Comment content cannot be empty');
	}

	try {
		// Create the comment
		const comment = await pb.collection('comments').create({
			post: postId,
			author: pb.authStore.model.id,
			content: content.trim()
		});

		// Update post comment count
		const post = await pb.collection('posts').getOne(postId);
		const newCommentCount = (post.commentCount || 0) + 1;
		await pb.collection('posts').update(postId, { commentCount: newCommentCount });

		// Return comment with expanded author
		return await pb.collection('comments').getOne(comment.id, {
			expand: 'author'
		});
	} catch (error) {
		console.error('Error creating comment:', error);
		throw error;
	}
}

/**
 * Get comments for a post
 * @param {string} postId - Post ID
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.perPage=50] - Items per page
 * @returns {Promise<Object>} Comments with pagination info
 */
export async function getComments(postId, options = {}) {
	const { page = 1, perPage = 50 } = options;

	try {
		return await pb.collection('comments').getList(page, perPage, {
			filter: `post = "${postId}"`,
			sort: 'created',
			expand: 'author'
		});
	} catch (error) {
		console.error('Error getting comments:', error);
		throw error;
	}
}

/**
 * Update a comment
 * @param {string} commentId - Comment ID
 * @param {string} content - New content
 * @returns {Promise<Object>} Updated comment
 */
export async function updateComment(commentId, content) {
	if (!content.trim()) {
		throw new Error('Comment content cannot be empty');
	}

	try {
		return await pb.collection('comments').update(commentId, {
			content: content.trim()
		});
	} catch (error) {
		console.error('Error updating comment:', error);
		throw error;
	}
}

/**
 * Delete a comment
 * @param {string} commentId - Comment ID
 * @param {string} postId - Post ID (to update comment count)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteComment(commentId, postId) {
	try {
		// Delete the comment
		await pb.collection('comments').delete(commentId);

		// Update post comment count
		const post = await pb.collection('posts').getOne(postId);
		const newCommentCount = Math.max(0, (post.commentCount || 0) - 1);
		await pb.collection('posts').update(postId, { commentCount: newCommentCount });

		return true;
	} catch (error) {
		console.error('Error deleting comment:', error);
		throw error;
	}
}

/**
 * Get comment count for a post
 * @param {string} postId - Post ID
 * @returns {Promise<number>} Number of comments
 */
export async function getCommentCount(postId) {
	try {
		const result = await pb.collection('comments').getList(1, 1, {
			filter: `post = "${postId}"`,
			totalCount: true
		});
		return result.totalItems;
	} catch (error) {
		console.error('Error getting comment count:', error);
		return 0;
	}
}