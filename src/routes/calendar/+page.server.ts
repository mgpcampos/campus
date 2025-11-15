import { error, fail } from '@sveltejs/kit'
import { superValidate } from 'sveltekit-superforms/server'
import { z } from 'zod'
import { validateEventData } from '$lib/server/events/conflicts'
import { normalizeError } from '$lib/utils/errors.ts'
import { toUTC } from '$lib/utils/timezone'
import { withZod } from '$lib/validation'
import type { EventRecord } from '../../types/events'
import type { Actions, PageServerLoad } from './$types'

// Event creation schema - simplified to just title, description, and date
const eventCreateSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().optional(),
	date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date')
})

type EventCreateData = z.infer<typeof eventCreateSchema>

// RSVP schema
const rsvpSchema = z.object({
	eventId: z.string().min(1),
	status: z.enum(['going', 'maybe', 'declined'])
})

type RSVPData = z.infer<typeof rsvpSchema>

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	const user = locals.user
	if (!user) {
		return error(401, 'User not found in session')
	}

	try {
		// Parse query parameters for filtering
		const scopeType = url.searchParams.get('scopeType')
		const scopeId = url.searchParams.get('scopeId')
		const from = url.searchParams.get('from')
		const to = url.searchParams.get('to')

		// Build filter - only show events created by the current user
		let filter = `createdBy = "${user.id}"`

		if (scopeType) {
			filter += ` && scopeType = "${scopeType}"`
		}

		if (scopeId) {
			filter += ` && scopeId = "${scopeId}"`
		}

		if (from) {
			filter += ` && end >= "${toUTC(from)}"`
		}

		if (to) {
			filter += ` && start <= "${toUTC(to)}"`
		}

		// Fetch events
		const events = await locals.pb.collection('events').getFullList<EventRecord>({
			filter,
			sort: 'start',
			expand: 'event_participants_via_event,createdBy'
		})

		// Initialize forms
		const createForm = await superValidate(withZod(eventCreateSchema))
		const rsvpForm = await superValidate(withZod(rsvpSchema))

		return {
			events,
			createForm,
			rsvpForm,
			user
		}
	} catch (err) {
		const normalized = normalizeError(err, { context: 'load calendar' })
		console.error('Error loading calendar:', normalized)
		return error(500, normalized.userMessage || 'Failed to load calendar')
	}
}

export const actions: Actions = {
	createEvent: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' })
		}

		const user = locals.user
		if (!user) {
			return fail(401, { message: 'User not found in session' })
		}

		try {
			const createForm = await superValidate(request, withZod(eventCreateSchema))

			if (!createForm.valid) {
				return fail(400, { createForm })
			}

			const data = createForm.data as EventCreateData

			// Parse the date and create start/end times
			// Event starts at the selected date and time, ends 1 hour later
			const eventDate = new Date(data.date)
			const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000) // Add 1 hour

			// Validate event data with simplified structure
			validateEventData({
				title: data.title,
				start: eventDate.toISOString(),
				end: endDate.toISOString(),
				scopeType: 'global', // Default to global scope
				scopeId: undefined
			})

			// Create event with default values for removed fields
			await locals.pb.collection('events').create({
				title: data.title,
				description: data.description || '',
				scopeType: 'global', // Default scope
				scopeId: '', // Empty scope ID
				start: toUTC(eventDate.toISOString()),
				end: toUTC(endDate.toISOString()),
				location: undefined, // No location
				reminderLeadMinutes: 30, // Default 30 minute reminder
				createdBy: user.id
			})

			return { createForm, success: true }
		} catch (err) {
			const normalized = normalizeError(err, { context: 'create event' })
			console.error('Error creating event:', normalized)
			const errorForm = await superValidate(request, withZod(eventCreateSchema))
			return fail(normalized.status || 500, {
				createForm: errorForm,
				message: normalized.userMessage || 'Failed to create event'
			})
		}
	},

	rsvp: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' })
		}

		const user = locals.user
		if (!user) {
			return fail(401, { message: 'User not found in session' })
		}

		try {
			const rsvpForm = await superValidate(request, withZod(rsvpSchema))

			if (!rsvpForm.valid) {
				return fail(400, { rsvpForm })
			}

			const { eventId, status } = rsvpForm.data as RSVPData

			// Check if participant already exists
			const existingParticipants = await locals.pb
				.collection('event_participants')
				.getFullList({
					filter: `event = "${eventId}" && user = "${user.id}"`
				})

			const [existingParticipant] = existingParticipants
			if (existingParticipant) {
				// Update existing RSVP
				await locals.pb.collection('event_participants').update(existingParticipant.id, {
					status
				})
			} else {
				// Create new RSVP
				await locals.pb.collection('event_participants').create({
					event: eventId,
					user: user.id,
					status
				})
			}

			return { rsvpForm, success: true }
		} catch (err) {
			const normalized = normalizeError(err, { context: 'rsvp event' })
			console.error('Error RSVPing to event:', normalized)
			const errorForm = await superValidate(request, withZod(rsvpSchema))
			return fail(normalized.status || 500, {
				rsvpForm: errorForm,
				message: normalized.userMessage || 'Failed to RSVP'
			})
		}
	},

	deleteEvent: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' })
		}

		const user = locals.user
		if (!user) {
			return fail(401, { message: 'User not found in session' })
		}

		try {
			const formData = await request.formData()
			const eventId = formData.get('eventId') as string

			if (!eventId) {
				return fail(400, { message: 'Event ID is required' })
			}

			// Fetch event to check ownership
			const event = await locals.pb.collection('events').getOne(eventId)

			if (event.createdBy !== user.id) {
				return fail(403, { message: 'You do not have permission to delete this event' })
			}

			// Delete event
			await locals.pb.collection('events').delete(eventId)

			return { success: true }
		} catch (err) {
			const normalized = normalizeError(err, { context: 'delete event' })
			console.error('Error deleting event:', normalized)
			return fail(normalized.status || 500, {
				message: normalized.userMessage || 'Failed to delete event'
			})
		}
	}
}
