import { json, error } from '@sveltejs/kit';
import { z } from 'zod';

const commentSchema = z.object({
	content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long')
});

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals, url }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required');
	}

	const postId = params.id;
	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = Math.min(parseInt(url.searchParams.get('perPage') || '50'), 100);

	try {
		const comments = await locals.pb.collection('comments').getList(page, perPage, {
			filter: `post = "${postId}"`,
			sort: 'created',
			expand: 'author'
		});

		return json(comments);
	} catch (err) {
		console.error('Error getting comments:', err);
		throw error(500, 'Failed to get comments');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, locals, request }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required');
	}

	const postId = params.id;
	const userId = locals.pb.authStore.model.id;

	try {
		const body = await request.json();
		const { content } = commentSchema.parse(body);

		// Create the comment
		const comment = await locals.pb.collection('comments').create({
			post: postId,
			author: userId,
			content: content.trim()
		});

		// Update post comment count
		const post = await locals.pb.collection('posts').getOne(postId);
		const newCommentCount = (post.commentCount || 0) + 1;
		await locals.pb.collection('posts').update(postId, { commentCount: newCommentCount });

		// Return comment with expanded author
		const expandedComment = await locals.pb.collection('comments').getOne(comment.id, {
			expand: 'author'
		});

		return json(expandedComment, { status: 201 });
	} catch (err) {
		if (err instanceof z.ZodError) {
			throw error(400, err.errors[0].message);
		}
		console.error('Error creating comment:', err);
		throw error(500, 'Failed to create comment');
	}
}