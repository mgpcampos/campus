import { pb } from '../pocketbase.js'
import { normalizeError } from '../utils/errors.ts'

/**
 * @typedef {import('pocketbase').RecordModel} RecordModel
 * @typedef {import('pocketbase').ListResult<RecordModel>} ListResult
 */

/**
 * Create a new comment on a post
 * @param {string} postId - Post ID
 * @param {string} content - Comment content
 * @returns {Promise<Object>} Created comment
 */
/**
 * Create a new (possibly nested) comment
 * @param {string} postId
 * @param {string} content
 * @param {string | undefined} parentId optional parent comment id
 */
/**
 * @param {string} postId
 * @param {string} content
 * @param {string | undefined} parentId
 */
export async function createComment(postId, content, parentId) {
	if (!pb.authStore.model?.id) {
		throw new Error('User must be authenticated to comment')
	}

	if (!content.trim()) {
		throw new Error('Comment content cannot be empty')
	}

	try {
		// Create the comment
		/** @type {{post:string; author:string; content:string; parent?:string}} */
		const createData = {
			post: postId,
			author: pb.authStore.model.id,
			content: content.trim()
		}
		if (parentId) {
			// Basic server-side validation of parent linkage ownership to same post
			try {
				const parent = await pb.collection('comments').getOne(parentId)
				if (parent.post !== postId) {
					throw new Error('Parent comment does not belong to the same post')
				}
				createData.parent = parentId
			} catch (e) {
				console.warn('Invalid parent comment supplied, ignoring:', e)
			}
		}

		const comment = await pb.collection('comments').create(createData)

		// Update post comment count
		const post = await pb.collection('posts').getOne(postId)
		const newCommentCount = (post.commentCount || 0) + 1
		await pb.collection('posts').update(postId, { commentCount: newCommentCount })

		// Return comment with expanded author
		return await pb.collection('comments').getOne(comment.id, {
			expand: 'author'
		})
	} catch (error) {
		console.error('Error creating comment:', error)
		throw normalizeError(error, { context: 'createComment' })
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
/**
 * Get a paginated list of comments for a post
 * @param {string} postId
 * @param {{page?:number, perPage?:number}} [options]
 * @returns {Promise<ListResult>}
 */
/**
 * @param {string} postId
 * @param {{page?:number, perPage?:number, includeReplies?:boolean}} [options]
 */
export async function getComments(postId, options = {}) {
	// Default includeReplies false to preserve previous behavior for existing tests
	const { page = 1, perPage = 50, includeReplies = false } = /** @type {any} */ (options)

	try {
		// Backwards compatibility: when includeReplies is false preserve original filter semantics
		const baseFilter = includeReplies
			? `post = "${postId}" && (parent = null || parent = "")`
			: `post = "${postId}"`
		const topLevel = await pb.collection('comments').getList(page, perPage, {
			filter: baseFilter,
			sort: 'created',
			expand: 'author'
		})

		if (!includeReplies || topLevel.items.length === 0) {
			return topLevel
		}

		// Collect ids to fetch children for (1 level deep for now)
		const ids = topLevel.items.map((c) => c.id)
		if (ids.length === 0) return topLevel

		let children = []
		const filter = `post = "${postId}" && parent != null && parent.id in [${ids
			.map((id) => `"${id}"`)
			.join(',')}]`
		const commentsCollection = pb.collection('comments')
		if (typeof commentsCollection.getFullList === 'function') {
			children = await commentsCollection.getFullList({
				filter,
				sort: 'created',
				expand: 'author,parent'
			})
		} else {
			// Fallback: page through using getList until fewer than perPage results
			let childPage = 1
			const childPerPage = 50
			while (true) {
				const batch = await /** @type {any} */ (commentsCollection).getList(
					childPage,
					childPerPage,
					{ filter, sort: 'created', expand: 'author,parent' }
				)
				children.push(...batch.items)
				if (batch.items.length < childPerPage) break
				childPage++
				if (childPage > 10) break // safety cap
			}
		}

		// Attach children array to each parent
		/** @type {Record<string, any[]>} */
		const childrenByParent = {}
		for (const child of children) {
			const p = child.parent || child.expand?.parent?.id
			if (!p) continue
			if (!childrenByParent[p]) childrenByParent[p] = []
			childrenByParent[p].push(child)
		}
		for (const item of topLevel.items) {
			item /** @type {any} */.replies = childrenByParent[item.id] || []
		}

		return topLevel
	} catch (error) {
		console.error('Error getting comments:', error)
		throw normalizeError(error, { context: 'getComments' })
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
		throw new Error('Comment content cannot be empty')
	}

	try {
		return await pb.collection('comments').update(commentId, {
			content: content.trim()
		})
	} catch (error) {
		console.error('Error updating comment:', error)
		throw normalizeError(error, { context: 'updateComment' })
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
		await pb.collection('comments').delete(commentId)

		// Update post comment count
		const post = await pb.collection('posts').getOne(postId)
		const newCommentCount = Math.max(0, (post.commentCount || 0) - 1)
		await pb.collection('posts').update(postId, { commentCount: newCommentCount })

		return true
	} catch (error) {
		console.error('Error deleting comment:', error)
		throw normalizeError(error, { context: 'deleteComment' })
	}
}

/**
 * Get comment count for a post
 * @param {string} postId - Post ID
 * @returns {Promise<number>} Number of comments
 */
/**
 * Count comments for a post
 * @param {string} postId
 * @returns {Promise<number>}
 */
export async function getCommentCount(postId) {
	try {
		const result = await pb.collection('comments').getList(1, 1, {
			filter: `post = "${postId}"`,
			totalCount: true
		})
		return result.totalItems
	} catch (error) {
		console.error('Error getting comment count:', error)
		normalizeError(error, { context: 'getCommentCount' }) // normalized for potential future logging
		return 0
	}
}
