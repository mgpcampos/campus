// Using relative import to avoid alias resolution issues in Vitest
import { pb } from '../pocketbase.js';
import { normalizeError } from '../utils/errors.js';
/**
 * @typedef {import('pocketbase').RecordModel} RecordModel
 * @typedef {import('pocketbase').ListResult<RecordModel>} ListResult
 */

/**
 * Toggle like on a post
 * @param {string} postId - Post ID
 * @returns {Promise<{liked: boolean, likeCount: number}>} Like status and count
 */
export async function toggleLike(postId) {
	if (!pb.authStore.model?.id) {
		throw new Error('User must be authenticated to like posts');
	}

	const userId = pb.authStore.model.id;

	try {
		// Check if user already liked this post
		const existingLike = await pb
			.collection('likes')
			.getFirstListItem(`post = "${postId}" && user = "${userId}"`)
			.catch(() => null);

		if (existingLike) {
			// Unlike: delete the like record
			await pb.collection('likes').delete(existingLike.id);

			// Update post like count
			const post = await pb.collection('posts').getOne(postId);
			const newLikeCount = Math.max(0, (post.likeCount || 0) - 1);
			await pb.collection('posts').update(postId, { likeCount: newLikeCount });

			return { liked: false, likeCount: newLikeCount };
		} else {
			// Like: create new like record
			await pb.collection('likes').create({
				post: postId,
				user: userId
			});

			// Update post like count
			const post = await pb.collection('posts').getOne(postId);
			const newLikeCount = (post.likeCount || 0) + 1;
			await pb.collection('posts').update(postId, { likeCount: newLikeCount });

			return { liked: true, likeCount: newLikeCount };
		}
	} catch (error) {
		console.error('Error toggling like:', error);
		throw normalizeError(error, { context: 'toggleLike' });
	}
}

/**
 * Check if user has liked a post
 * @param {string} postId - Post ID
 * @returns {Promise<boolean>} Whether user has liked the post
 */
export async function hasUserLikedPost(postId) {
	if (!pb.authStore.model?.id) {
		return false;
	}

	const userId = pb.authStore.model.id;

	try {
		const like = await pb
			.collection('likes')
			.getFirstListItem(`post = "${postId}" && user = "${userId}"`)
			.catch(() => null);

		return !!like;
	} catch (error) {
		console.error('Error checking like status:', error);
		normalizeError(error, { context: 'hasUserLikedPost' }); // swallow but normalize for potential logging
		return false;
	}
}

/**
 * Get like count for a post
 * @param {string} postId - Post ID
 * @returns {Promise<number>} Number of likes
 */
export async function getLikeCount(postId) {
	try {
		const result = await pb.collection('likes').getList(1, 1, {
			filter: `post = "${postId}"`,
			totalCount: true
		});
		return result.totalItems;
	} catch (error) {
		console.error('Error getting like count:', error);
		normalizeError(error, { context: 'getLikeCount' }); // swallow but normalize
		return 0;
	}
}
