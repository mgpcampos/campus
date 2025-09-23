import { json, error } from '@sveltejs/kit';
/**
 * Safely extracts current authenticated user id from locals
 * @param {any} locals
 * @returns {string | null}
 */
function getUserId(locals) {
	return locals?.pb?.authStore?.model?.id || null;
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required');
	}

	const postId = params.id;
	const userId = getUserId(locals);
	if (!userId) throw error(401, 'Authentication required');

	try {
		// Check if user already liked this post
		const existingLike = await locals.pb.collection('likes').getFirstListItem(
			`post = "${postId}" && user = "${userId}"`
		).catch(() => null);

		if (existingLike) {
			// Unlike: delete the like record
			await locals.pb.collection('likes').delete(existingLike.id);
			
			// Update post like count
			const post = await locals.pb.collection('posts').getOne(postId);
			const newLikeCount = Math.max(0, (post.likeCount || 0) - 1);
			await locals.pb.collection('posts').update(postId, { likeCount: newLikeCount });
			
			return json({ liked: false, likeCount: newLikeCount });
		} else {
			// Like: create new like record
			await locals.pb.collection('likes').create({
				post: postId,
				user: userId
			});
			
			// Update post like count
			const post = await locals.pb.collection('posts').getOne(postId);
			const newLikeCount = (post.likeCount || 0) + 1;
			await locals.pb.collection('posts').update(postId, { likeCount: newLikeCount });
			
			return json({ liked: true, likeCount: newLikeCount });
		}
	} catch (err) {
		console.error('Error toggling like:', err instanceof Error ? err.message : err);
		throw error(500, 'Failed to toggle like');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required');
	}

	const postId = params.id;
	const userId = getUserId(locals);
	if (!userId) throw error(401, 'Authentication required');

	try {
		// Check if user has liked this post
		const existingLike = await locals.pb.collection('likes').getFirstListItem(
			`post = "${postId}" && user = "${userId}"`
		).catch(() => null);

		// Get current like count
		const likeCount = await locals.pb.collection('likes').getList(1, 1, {
			filter: `post = "${postId}"`,
			totalCount: true
		}).then(result => result.totalItems);

		return json({ 
			liked: !!existingLike, 
			likeCount 
		});
	} catch (err) {
		console.error('Error getting like status:', err instanceof Error ? err.message : err);
		throw error(500, 'Failed to get like status');
	}
}