import { error, json } from '@sveltejs/kit'
import { z } from 'zod'
import {
	createNotification,
	extractMentions,
	resolveUsernames
} from '$lib/services/notifications.js'
import { sanitizeContent } from '$lib/utils/sanitize.js'

const commentSchema = z.object({
	content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long')
})

function getUserId(/** @type {any} */ locals) {
	return locals?.pb?.authStore?.model?.id || null
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals, url }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required')
	}

	const postId = params.id
	const page = Number.parseInt(url.searchParams.get('page') || '1', 10)
	const perPage = Math.min(Number.parseInt(url.searchParams.get('perPage') || '50', 10), 100)

	try {
		const comments = await locals.pb.collection('comments').getList(page, perPage, {
			filter: `post = "${postId}"`,
			sort: 'created',
			expand: 'author'
		})

		return json(comments)
	} catch (err) {
		console.error('Error getting comments:', err instanceof Error ? err.message : err)
		throw error(500, 'Failed to get comments')
	}
}

/**
 * Notify post author about new comment
 * @param {string} postAuthorId
 * @param {string} commentAuthorId
 * @param {string} postId
 * @param {string} commentId
 */
async function notifyPostAuthor(postAuthorId, commentAuthorId, postId, commentId) {
	if (!postAuthorId || postAuthorId === commentAuthorId) {
		return
	}
	try {
		await createNotification({
			user: postAuthorId,
			actor: commentAuthorId,
			type: 'comment',
			post: postId,
			comment: commentId
		})
	} catch (e) {
		console.warn('comment notification failed', e)
	}
}

/**
 * Check if should skip mention notification
 * @param {string} mentionedId
 * @param {string} authorId
 * @param {string} postAuthorId
 */
function shouldSkipMentionNotification(mentionedId, authorId, postAuthorId) {
	if (!mentionedId || mentionedId === authorId) {
		return true
	}
	// Avoid duplicate with comment notification to post author
	if (mentionedId === postAuthorId && postAuthorId !== authorId) {
		return true
	}
	return false
}

/**
 * Send mention notifications
 * @param {string} content
 * @param {string} userId
 * @param {string} postAuthorId
 * @param {string} postId
 * @param {string} commentId
 */
async function notifyMentionedUsers(content, userId, postAuthorId, postId, commentId) {
	try {
		const mentions = extractMentions(content)
		if (mentions.length === 0) {
			return
		}

		const resolved = await resolveUsernames(mentions)
		const uniqueUserIds = new Set(Object.values(resolved))

		for (const mentionedId of uniqueUserIds) {
			if (shouldSkipMentionNotification(mentionedId, userId, postAuthorId)) {
				continue
			}
			await createNotification({
				user: mentionedId,
				actor: userId,
				type: 'mention',
				post: postId,
				comment: commentId
			})
		}
	} catch (e) {
		console.warn('mention notifications failed', e)
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, locals, request }) {
	if (!locals.pb.authStore.isValid) {
		throw error(401, 'Authentication required')
	}

	const postId = params.id
	const userId = getUserId(locals)
	if (!userId) throw error(401, 'Authentication required')

	try {
		const body = await request.json()
		const { content } = commentSchema.parse(body)

		const safeContent = sanitizeContent(content)

		// Create the comment
		const comment = await locals.pb.collection('comments').create({
			post: postId,
			author: userId,
			content: safeContent
		})

		// Update post comment count & fetch author for notification
		const post = await locals.pb.collection('posts').getOne(postId)
		const newCommentCount = (post.commentCount || 0) + 1
		await locals.pb.collection('posts').update(postId, { commentCount: newCommentCount })

		// Send notifications
		await notifyPostAuthor(post.author, userId, postId, comment.id)
		await notifyMentionedUsers(safeContent, userId, post.author, postId, comment.id)

		// Return comment with expanded author
		const expandedComment = await locals.pb.collection('comments').getOne(comment.id, {
			expand: 'author'
		})

		return json(expandedComment, { status: 201 })
	} catch (err) {
		if (err instanceof z.ZodError) {
			const firstMessage = err.errors[0]?.message || 'Invalid comment payload'
			throw error(400, firstMessage)
		}
		console.error('Error creating comment:', err instanceof Error ? err.message : err)
		throw error(500, 'Failed to create comment')
	}
}
