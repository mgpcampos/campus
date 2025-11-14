import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

const updateCommentSchema = z.object({
	content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long')
})

/**
 * @param {any} locals
 */
function getUserId(locals) {
	return locals?.pb?.authStore?.model?.id || null
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, locals, request }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required')
	}

	const commentId = params.id
	const userId = getUserId(locals)
	if (!userId) throw error(401, 'Authentication required')

	try {
		// Check if comment exists and user owns it
		const comment = await locals.pb.collection('comments').getOne(commentId)

		if (comment.author !== userId) {
			throw error(403, 'You can only edit your own comments')
		}

		const body = await request.json()
		const { content } = updateCommentSchema.parse(body)

		// Update the comment
		const updatedComment = await locals.pb.collection('comments').update(commentId, {
			content: content.trim()
		})

		return json(updatedComment)
	} catch (err) {
		if (err instanceof z.ZodError) {
			const firstMessage = err.errors[0]?.message || 'Invalid comment payload'
			throw error(400, firstMessage)
		}
		if (/** @type {any} */ (err)?.status) {
			throw /** @type {any} */ (err)
		}
		console.error('Error updating comment:', err instanceof Error ? err.message : err)
		throw error(500, 'Failed to update comment')
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required')
	}

	const commentId = params.id
	const userId = getUserId(locals)
	if (!userId) throw error(401, 'Authentication required')

	try {
		// Check if comment exists and user owns it
		const comment = await locals.pb.collection('comments').getOne(commentId)

		if (comment.author !== userId) {
			throw error(403, 'You can only delete your own comments')
		}

		// Delete the comment
		await locals.pb.collection('comments').delete(commentId)

		// Update post comment count
		const post = await locals.pb.collection('posts').getOne(comment.post)
		const newCommentCount = Math.max(0, (post.commentCount || 0) - 1)
		await locals.pb.collection('posts').update(comment.post, { commentCount: newCommentCount })

		return json({ success: true })
	} catch (err) {
		if (/** @type {any} */ (err)?.status) {
			throw /** @type {any} */ (err)
		}
		console.error('Error deleting comment:', err instanceof Error ? err.message : err)
		throw error(500, 'Failed to delete comment')
	}
}
