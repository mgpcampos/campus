import { error, json } from '@sveltejs/kit'
import { getUserEvents, hasConflict, validateEventData } from '$lib/server/events/conflicts'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.ts'
import { toUTC } from '$lib/utils/timezone'
import type { EventCreateInput, ScopeType } from '../../../types/events'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const scopeTypeParam = url.searchParams.get('scopeType')
		const scopeId = url.searchParams.get('scopeId')
		const from = url.searchParams.get('from')
		const to = url.searchParams.get('to')
		const userId = url.searchParams.get('userId') || locals.user?.id

		if (!userId) {
			return error(400, 'userId parameter is required')
		}

		// Build filter options
		const options: {
			from?: Date
			to?: Date
			scopeType?: ScopeType
			scopeId?: string
		} = {}

		if (from) {
			options.from = new Date(from)
		}

		if (to) {
			options.to = new Date(to)
		}

		if (scopeTypeParam) {
			if (!isScopeType(scopeTypeParam)) {
				return error(400, 'Invalid scopeType parameter')
			}
			options.scopeType = scopeTypeParam
		}

		if (scopeId) {
			options.scopeId = scopeId
		}

		const events = await getUserEvents(locals.pb, userId, options)

		return json({
			events,
			total: events.length
		})
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getEvents' })
		console.error('Error fetching events:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	const user = locals.user
	if (!user) {
		return error(401, 'User not found in session')
	}

	try {
		const body = await request.json()

		// Support both old API (with start/end) and new simplified form (with date)
		let start: string | Date
		let end: string | Date

		if (body.date) {
			// New simplified form - date field provided
			const eventDate = new Date(body.date)
			start = eventDate
			end = new Date(eventDate.getTime() + 60 * 60 * 1000) // Add 1 hour
		} else if (body.start && body.end) {
			// Old API form - start and end provided
			start = body.start
			end = body.end
		} else {
			return json({ error: 'Either date or both start and end must be provided' }, { status: 400 })
		}

		const eventData: EventCreateInput = {
			title: body.title,
			description: body.description,
			date: body.date,
			scopeType: body.scopeType || 'global',
			scopeId: body.scopeId,
			start,
			end,
			location: body.location,
			reminderLeadMinutes: body.reminderLeadMinutes
		}

		// Validate event data with defaults
		const scopeType: ScopeType = eventData.scopeType || 'global'
		validateEventData({
			title: eventData.title,
			start: start,
			end: end,
			scopeType: scopeType,
			scopeId: eventData.scopeId
		})

		// Check for conflicts
		const conflictCheck = await hasConflict(locals.pb, {
			scopeType: scopeType,
			scopeId: eventData.scopeId,
			start: start,
			end: end
		})

		if (conflictCheck.hasConflict) {
			return json(
				{
					error: 'Event conflicts with existing event(s)',
					conflicts: conflictCheck.conflictingEvents
				},
				{ status: 409 }
			)
		}

		// Create event in PocketBase
		const event = await locals.pb.collection('events').create({
			title: eventData.title,
			description: eventData.description,
			scopeType: scopeType,
			scopeId: eventData.scopeId || '',
			start: toUTC(start),
			end: toUTC(end),
			location: eventData.location ? JSON.stringify(eventData.location) : undefined,
			reminderLeadMinutes: eventData.reminderLeadMinutes || 30,
			createdBy: user.id
		})

		return json(
			{
				event,
				message: 'Event created successfully'
			},
			{ status: 201 }
		)
	} catch (err) {
		const n = normalizeError(err, { context: 'api:createEvent' })
		console.error('Error creating event:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

function isScopeType(value: string): value is ScopeType {
	return value === 'global' || value === 'space' || value === 'group' || value === 'course'
}
