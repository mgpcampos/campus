import { error, json } from '@sveltejs/kit'
import { messageCreateSchema, messageListSchema } from '$lib/schemas/messaging.js'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.ts'

/**
 * GET /api/threads/[threadId]/messages
 * List messages in a thread with pagination
 */
/** @type {import('./$types').RequestHandler} */
export async function GET({ params, url, locals }) {
	if (!locals.pb.authStore.isValid || !locals.user) {
		return error(401, 'Authentication required')
	}

	try {
		const { threadId } = params
		const queryParams = Object.fromEntries(url.searchParams)
		const validatedQuery = messageListSchema.parse(queryParams)

		// Verify user is a member of the thread
		const thread = await locals.pb.collection('conversation_threads').getOne(threadId)

		if (!thread.members.includes(locals.user.id)) {
			return error(403, 'You are not a member of this thread')
		}

		// Build filter for time range
		const filters = [`thread = "${threadId}"`]

		if (validatedQuery.before) {
			filters.push(`created < "${validatedQuery.before}"`)
		}

		if (validatedQuery.after) {
			filters.push(`created > "${validatedQuery.after}"`)
		}

		const filterString = filters.join(' && ')

		// Fetch messages
		const result = await locals.pb
			.collection('messages')
			.getList(validatedQuery.page, validatedQuery.perPage, {
				filter: filterString,
				sort: '-created',
				expand: 'author'
			})

		return json({
			items: result.items,
			total: result.totalItems,
			page: result.page,
			perPage: result.perPage,
			threadId
		})
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getMessages' })
		console.error('Error fetching messages:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/**
 * POST /api/threads/[threadId]/messages
 * Send a new message in a thread
 */
/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, locals }) {
	if (!locals.pb.authStore.isValid || !locals.user) {
		return error(401, 'Authentication required')
	}

	try {
		const { threadId } = params

		// Verify user is a member of the thread
		const thread = await locals.pb.collection('conversation_threads').getOne(threadId)

		if (!thread.members.includes(locals.user.id)) {
			return error(403, 'You are not a member of this thread')
		}

		// Check if thread is locked
		if (thread.moderationStatus === 'locked') {
			return error(403, 'This thread is locked by moderators')
		}

		// Parse multipart/form-data or JSON
		const contentType = request.headers.get('content-type') || ''
		let body: string | undefined
		let attachments: File[] | undefined

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData()
			body = formData.get('body')?.toString()

			// Collect file attachments
			attachments = []
			for (let i = 0; i < 5; i++) {
				const file = formData.get(`attachment_${i}`)
				if (file instanceof File) {
					attachments.push(file)
				}
			}
		} else {
			const jsonData = await request.json()
			body = jsonData.body
		}

		// Validate data
		const validatedData = messageCreateSchema.parse({ body, attachments })

		// Ensure at least body or attachments are present
		if (
			!validatedData.body &&
			(!validatedData.attachments || validatedData.attachments.length === 0)
		) {
			return error(400, 'Message must have either body text or attachments')
		}

		// Create FormData for PocketBase
		const messageFormData = new FormData()
		messageFormData.append('thread', threadId)
		messageFormData.append('author', locals.user.id)
		messageFormData.append('status', 'visible')
		messageFormData.append('flagCount', '0')
		messageFormData.append('metadata', JSON.stringify({ readReceipts: [] }))

		if (validatedData.body) {
			messageFormData.append('body', validatedData.body)
		}

		if (validatedData.attachments) {
			for (const file of validatedData.attachments) {
				messageFormData.append(`attachments`, file)
			}
		}

		// Create message
		const message = await locals.pb.collection('messages').create(messageFormData, {
			expand: 'author'
		})

		// Update thread's lastMessageAt
		await locals.pb.collection('conversation_threads').update(threadId, {
			lastMessageAt: message.created
		})

		return json(message, { status: 201 })
	} catch (err) {
		const n = normalizeError(err, { context: 'api:sendMessage' })
		console.error('Error sending message:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}
