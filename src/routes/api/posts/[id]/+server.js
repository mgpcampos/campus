import { error, json } from '@sveltejs/kit'
import { updatePostSchema } from '$lib/schemas/post.js'
import { deletePost, getPost, updatePost } from '$lib/services/posts.js'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js'

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	try {
		const post = await getPost(params.id, { pb: locals.pb })
		return json(post)
	} catch (err) {
		console.error('Error fetching post:', err)
		return error(404, 'Post not found')
	}
}

/**
 * @param {any} post
 * @param {string | undefined | null} userId
 */
async function assertOwnership(post, userId) {
	// @ts-ignore PocketBase record typing
	if (post.author !== userId) {
		throw error(403, 'You can only edit your own posts')
	}
}

/**
 * @param {import('./$types').RequestEvent} event
 */
async function handleUpdate({ params, request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const existingPost = await getPost(params.id, { pb: locals.pb })
		await assertOwnership(existingPost, locals.pb.authStore.model?.id)

		const body = await request.json()
		const validatedData = updatePostSchema.parse(body)

		const updatedPost = await updatePost(params.id, validatedData, { pb: locals.pb })
		return json(updatedPost)
	} catch (err) {
		const normalized = normalizeError(err, { context: 'api:updatePost' })
		if (normalized.status === 403) {
			return error(403, normalized.message || 'Forbidden')
		}
		if (err instanceof Error && err.name === 'ZodError') {
			return json({ error: toErrorPayload(normalized) }, { status: 400 })
		}
		console.error('Error updating post:', normalized.toString?.() ?? normalized)
		return json({ error: toErrorPayload(normalized) }, { status: normalized.status || 500 })
	}
}

/** @type {import('./$types').RequestHandler} */
export const PUT = handleUpdate

/** @type {import('./$types').RequestHandler} */
export const PATCH = handleUpdate

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, locals }) {
	// Check authentication
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		// Get the existing post to check ownership
		const existingPost = await getPost(params.id, { pb: locals.pb })

		// Check if user owns the post
		// @ts-ignore - PocketBase record type
		if (existingPost.author !== locals.pb.authStore.model?.id) {
			return error(403, 'You can only delete your own posts')
		}

		await deletePost(params.id, { pb: locals.pb })

		return json({ success: true })
	} catch (err) {
		console.error('Error deleting post:', err)
		return error(500, 'Failed to delete post')
	}
}
