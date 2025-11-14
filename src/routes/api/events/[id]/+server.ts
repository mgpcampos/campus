import { error, json } from '@sveltejs/kit'
import { hasConflict, validateEventData } from '$lib/server/events/conflicts'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.ts'
import { toUTC } from '$lib/utils/timezone'
import type { EventUpdateInput } from '../../../../types/events'

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const event = await locals.pb
			.collection('events')
			.getOne(params.id, { expand: 'event_participants_via_event,createdBy' })

		return json({ event })
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getEvent' })
		console.error(`Error fetching event ${params.id}:`, n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 404 })
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PATCH({ params, request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		// Fetch existing event
		const existingEvent = await locals.pb.collection('events').getOne(params.id)

		// Check ownership
		if (existingEvent.createdBy !== locals.user!.id) {
			return error(403, 'You do not have permission to update this event')
		}

		const body = await request.json()

		const updateData: EventUpdateInput = {
			title: body.title,
			description: body.description,
			start: body.start,
			end: body.end,
			location: body.location,
			reminderLeadMinutes: body.reminderLeadMinutes
		}

		// Build update payload
		const payload: Record<string, unknown> = {}

		if (updateData.title !== undefined) {
			payload.title = updateData.title
		}

		if (updateData.description !== undefined) {
			payload.description = updateData.description
		}

		if (updateData.reminderLeadMinutes !== undefined) {
			payload.reminderLeadMinutes = updateData.reminderLeadMinutes
		}

		if (updateData.location !== undefined) {
			payload.location = JSON.stringify(updateData.location)
		}

		// Handle time updates with conflict checking
		if (updateData.start || updateData.end) {
			const newStart = updateData.start || existingEvent.start
			const newEnd = updateData.end || existingEvent.end

			// Validate time range
			validateEventData({
				start: newStart,
				end: newEnd,
				scopeType: existingEvent.scopeType,
				scopeId: existingEvent.scopeId
			})

			// Check for conflicts (ignore current event)
			const conflictCheck = await hasConflict(locals.pb, {
				scopeType: existingEvent.scopeType,
				scopeId: existingEvent.scopeId,
				start: newStart,
				end: newEnd,
				ignoreId: params.id
			})

			if (conflictCheck.hasConflict) {
				return json(
					{
						error: 'Updated time conflicts with existing event(s)',
						conflicts: conflictCheck.conflictingEvents
					},
					{ status: 409 }
				)
			}

			if (updateData.start) {
				payload.start = toUTC(updateData.start)
			}

			if (updateData.end) {
				payload.end = toUTC(updateData.end)
			}
		}

		// Update event
		const updatedEvent = await locals.pb.collection('events').update(params.id, payload)

		return json({
			event: updatedEvent,
			message: 'Event updated successfully'
		})
	} catch (err: unknown) {
		const n = normalizeError(err, { context: 'api:updateEvent' })
		console.error(`Error updating event ${params.id}:`, n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		// Fetch existing event
		const existingEvent = await locals.pb.collection('events').getOne(params.id)

		// Check ownership
		if (existingEvent.createdBy !== locals.user!.id) {
			return error(403, 'You do not have permission to delete this event')
		}

		// Delete event (cascades to participants due to PocketBase settings)
		await locals.pb.collection('events').delete(params.id)

		return json({
			message: 'Event deleted successfully'
		})
	} catch (err: unknown) {
		const n = normalizeError(err, { context: 'api:deleteEvent' })
		console.error(`Error deleting event ${params.id}:`, n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}
