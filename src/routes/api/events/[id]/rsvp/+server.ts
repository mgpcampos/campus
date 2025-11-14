import { error, json } from '@sveltejs/kit'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js'
import type { ParticipantStatus } from '../../../../../types/events'

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const body = await request.json()
		const status = body.status as ParticipantStatus

		if (!status || !['going', 'maybe', 'declined'].includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 })
		}

		// Verify event exists
		await locals.pb.collection('events').getOne(params.id)

		// Check if participant already exists
		const existingParticipants = await locals.pb.collection('event_participants').getFullList({
			filter: `event = "${params.id}" && user = "${locals.user!.id}"`
		})

		let participant

		if (existingParticipants.length > 0) {
			// Update existing RSVP
			participant = await locals.pb
				.collection('event_participants')
				.update(existingParticipants[0].id, { status })
		} else {
			// Create new RSVP
			participant = await locals.pb.collection('event_participants').create({
				event: params.id,
				user: locals.user!.id,
				status
			})
		}

		return json({
			participant,
			message: 'RSVP updated successfully'
		})
	} catch (err) {
		const n = normalizeError(err, { context: 'api:rsvpEvent' })
		console.error(`Error RSVPing to event ${params.id}:`, n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		// Find existing RSVP
		const existingParticipants = await locals.pb.collection('event_participants').getFullList({
			filter: `event = "${params.id}" && user = "${locals.user!.id}"`
		})

		if (existingParticipants.length === 0) {
			return json({ error: 'No RSVP found' }, { status: 404 })
		}

		// Delete RSVP
		await locals.pb.collection('event_participants').delete(existingParticipants[0].id)

		return json({
			message: 'RSVP removed successfully'
		})
	} catch (err) {
		const n = normalizeError(err, { context: 'api:deleteRsvp' })
		console.error(`Error removing RSVP from event ${params.id}:`, n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}
