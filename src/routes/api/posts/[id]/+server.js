import { json, error } from '@sveltejs/kit';
import { updatePostSchema } from '$lib/schemas/post.js';
import { getPost, updatePost, deletePost } from '$lib/services/posts.js';
import { sanitizeContent } from '$lib/utils/sanitize.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	try {
		const post = await getPost(params.id);
		return json(post);
	} catch (err) {
		console.error('Error fetching post:', err);
		return error(404, 'Post not found');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request, locals }) {
	// Check authentication
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		// Get the existing post to check ownership
		const existingPost = await getPost(params.id);

		// Check if user owns the post
		// @ts-ignore - PocketBase record type
		if (existingPost.author !== locals.pb.authStore.model?.id) {
			return error(403, 'You can only edit your own posts');
		}

		const body = await request.json();
		const validatedData = updatePostSchema.parse(body);
		validatedData.content = sanitizeContent(validatedData.content);

		const updatedPost = await updatePost(params.id, validatedData);

		return json(updatedPost);
	} catch (err) {
		console.error('Error updating post:', err);

		if (err instanceof Error && err.name === 'ZodError') {
			return error(400, 'Invalid post data');
		}

		return error(500, 'Failed to update post');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, locals }) {
	// Check authentication
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		// Get the existing post to check ownership
		const existingPost = await getPost(params.id);

		// Check if user owns the post
		// @ts-ignore - PocketBase record type
		if (existingPost.author !== locals.pb.authStore.model?.id) {
			return error(403, 'You can only delete your own posts');
		}

		await deletePost(params.id);

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting post:', err);
		return error(500, 'Failed to delete post');
	}
}
