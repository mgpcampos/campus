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
 * Parse request data based on content type
 * @param {Request} request
 */
async function parseRequestData(request: Request) {
	const contentType = request.headers.get('content-type') || ''

	if (contentType.includes('multipart/form-data')) {
		return parseFormData(await request.formData())
	}

	const jsonData = await request.json()
	return { body: jsonData.body, attachments: undefined }
}

/**
 * Parse form data for message creation
 * @param {FormData} formData
 */
function parseFormData(formData: FormData) {
	const body = formData.get('body')?.toString()
	const attachments: File[] = []

	for (let i = 0; i < 5; i++) {
		const file = formData.get(`attachment_${i}`)
		if (file instanceof File) {
			attachments.push(file)
		}
	}

	return { body, attachments }
}

/**
 * Build FormData for PocketBase message creation
 * @param {string} threadId
 * @param {string} userId
 * @param {{ body?: string; attachments?: File[] }} validatedData
 */
function buildMessageFormData(
	threadId: string,
	userId: string,
	validatedData: { body?: string; attachments?: File[] }
) {
	const messageFormData = new FormData()
	messageFormData.append('thread', threadId)
	messageFormData.append('author', userId)
	messageFormData.append('status', 'visible')
	messageFormData.append('flagCount', '0')
	messageFormData.append('metadata', JSON.stringify({ readReceipts: [] }))

	if (validatedData.body) {
		messageFormData.append('body', validatedData.body)
	}

	if (validatedData.attachments) {
		for (const file of validatedData.attachments) {
			messageFormData.append('attachments', file)
		}
	}

	return messageFormData
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

		// Parse request data
		const { body, attachments } = await parseRequestData(request)

		// Validate data
		const validatedData = messageCreateSchema.parse({ body, attachments })

		// Ensure at least body or attachments are present
		if (
			!validatedData.body &&
			(!validatedData.attachments || validatedData.attachments.length === 0)
		) {
			return error(400, 'Message must have either body text or attachments')
		}

		// Create message
		const messageFormData = buildMessageFormData(threadId, locals.user.id, validatedData)
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
