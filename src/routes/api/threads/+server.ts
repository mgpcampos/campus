import { error, json } from '@sveltejs/kit'
import { threadCreateSchema, threadListSchema } from '$lib/schemas/messaging.js'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.ts'

/**
 * GET /api/threads
 * List conversation threads for the authenticated user
 */
/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
	if (!locals.pb.authStore.isValid || !locals.user) {
		return error(401, 'Authentication required')
	}

	try {
		const queryParams = Object.fromEntries(url.searchParams)
		const validatedQuery = threadListSchema.parse(queryParams)

		// Fetch threads where current user is a member
		const result = await locals.pb
			.collection('conversation_threads')
			.getList(validatedQuery.page, validatedQuery.perPage, {
				filter: `members ~ "${locals.user.id}"`,
				sort: '-lastMessageAt',
				expand: 'members,createdBy'
			})

		return json({
			items: result.items,
			total: result.totalItems,
			page: result.page,
			perPage: result.perPage
		})
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getThreads' })
		console.error('Error fetching threads:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/**
 * POST /api/threads
 * Create a new conversation thread
 */
/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!locals.pb.authStore.isValid || !locals.user) {
		return error(401, 'Authentication required')
	}

	try {
		const body = await request.json()
		const validatedData = threadCreateSchema.parse(body)

		// Ensure current user is in members list
		const members = Array.from(new Set([locals.user.id, ...validatedData.members]))

		// Validate member count
		if (validatedData.type === 'direct' && members.length !== 2) {
			return error(400, 'Direct threads must have exactly 2 members')
		}

		if (validatedData.type === 'group' && members.length < 2) {
			return error(400, 'Group threads must have at least 2 members')
		}

		if (validatedData.type === 'group' && !validatedData.name) {
			return error(400, 'Group threads must have a name')
		}

		// For direct threads, check if one already exists between these two users
		if (validatedData.type === 'direct') {
			const existingThreads = await locals.pb.collection('conversation_threads').getFullList({
				filter: `type = "direct" && members ~ "${members[0]}" && members ~ "${members[1]}"`
			})

			if (existingThreads.length > 0) {
				// Return existing thread instead of creating duplicate
				return json(existingThreads[0], { status: 200 })
			}
		}

		// Create thread
		const threadData = {
			type: validatedData.type,
			name: validatedData.name || null,
			createdBy: locals.user.id,
			members,
			moderationStatus: 'active',
			lastMessageAt: new Date().toISOString()
		}

		const thread = await locals.pb.collection('conversation_threads').create(threadData, {
			expand: 'members,createdBy'
		})

		return json(thread, { status: 201 })
	} catch (err) {
		const n = normalizeError(err, { context: 'api:createThread' })
		console.error('Error creating thread:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}
