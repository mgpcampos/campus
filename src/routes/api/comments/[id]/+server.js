import { json, error } from '@sveltejs/kit';
import { z } from 'zod';

const updateCommentSchema = z.object({
	content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long')
});

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, locals, request }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required');
	}

	const commentId = params.id;
	const userId = locals.pb.authStore.model.id;

	try {
		// Check if comment exists and user owns it
		const comment = await locals.pb.collection('comments').getOne(commentId);
		
		if (comment.author !== userId) {
			throw error(403, 'You can only edit your own comments');
		}

		const body = await request.json();
		const { content } = updateCommentSchema.parse(body);

		// Update the comment
		const updatedComment = await locals.pb.collection('comments').update(commentId, {
			content: content.trim()
		});

		return json(updatedComment);
	} catch (err) {
		if (err instanceof z.ZodError) {
			throw error(400, err.errors[0].message);
		}
		if (err.status) {
			throw err;
		}
		console.error('Error updating comment:', err);
		throw error(500, 'Failed to update comment');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required');
	}

	const commentId = params.id;
	const userId = locals.pb.authStore.model.id;

	try {
		// Check if comment exists and user owns it
		const comment = await locals.pb.collection('comments').getOne(commentId);
		
		if (comment.author !== userId) {
			throw error(403, 'You can only delete your own comments');
		}

		// Delete the comment
		await locals.pb.collection('comments').delete(commentId);

		// Update post comment count
		const post = await locals.pb.collection('posts').getOne(comment.post);
		const newCommentCount = Math.max(0, (post.commentCount || 0) - 1);
		await locals.pb.collection('posts').update(comment.post, { commentCount: newCommentCount });

		return json({ success: true });
	} catch (err) {
		if (err.status) {
			throw err;
		}
		console.error('Error deleting comment:', err);
		throw error(500, 'Failed to delete comment');
	}
}