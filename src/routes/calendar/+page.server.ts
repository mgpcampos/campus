import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { superValidate, setError, setMessage } from 'sveltekit-superforms/server';
import { withZod } from '$lib/validation';
import { z } from 'zod';
import { hasConflict, validateEventData } from '$lib/server/events/conflicts';
import { toUTC, validateTimeRange } from '$lib/utils/timezone';
import { normalizeError } from '$lib/utils/errors.js';
import type { EventRecord } from '../../types/events';

// Event creation schema
const eventCreateSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().optional(),
	scopeType: z.enum(['global', 'space', 'group', 'course']),
	scopeId: z.string().optional(),
	start: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
	end: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
	locationType: z.enum(['physical', 'virtual']).optional(),
	locationValue: z.string().optional(),
	reminderLeadMinutes: z.coerce.number().min(0).optional()
});

type EventCreateData = z.infer<typeof eventCreateSchema>;

// RSVP schema
const rsvpSchema = z.object({
	eventId: z.string().min(1),
	status: z.enum(['going', 'maybe', 'declined'])
});

type RSVPData = z.infer<typeof rsvpSchema>;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		// Parse query parameters for filtering
		const scopeType = url.searchParams.get('scopeType');
		const scopeId = url.searchParams.get('scopeId');
		const from = url.searchParams.get('from');
		const to = url.searchParams.get('to');

		// Build filter
		let filter = `(createdBy = "${locals.user!.id}" || event_participants_via_event.user ?= "${locals.user!.id}")`;

		if (scopeType) {
			filter += ` && scopeType = "${scopeType}"`;
		}

		if (scopeId) {
			filter += ` && scopeId = "${scopeId}"`;
		}

		if (from) {
			filter += ` && end >= "${toUTC(from)}"`;
		}

		if (to) {
			filter += ` && start <= "${toUTC(to)}"`;
		}

		// Fetch events
		const events = await locals.pb.collection('events').getFullList<EventRecord>({
			filter,
			sort: 'start',
			expand: 'event_participants_via_event,createdBy'
		});

		// Initialize forms
		const createForm = await superValidate(withZod(eventCreateSchema));
		const rsvpForm = await superValidate(withZod(rsvpSchema));

		return {
			events,
			createForm,
			rsvpForm,
			user: locals.user
		};
	} catch (err) {
		const normalized = normalizeError(err, { context: 'load calendar' });
		console.error('Error loading calendar:', normalized);
		return error(500, normalized.userMessage || 'Failed to load calendar');
	}
};

export const actions: Actions = {
	createEvent: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' });
		}

		try {
			const createForm = await superValidate(request, withZod(eventCreateSchema));

			if (!createForm.valid) {
				return fail(400, { createForm });
			}

			const data = createForm.data as EventCreateData;

			if (!validateTimeRange(data.start, data.end)) {
				const messageText = 'Event start time must be before end time';
				setError(createForm, 'start', messageText);
				setError(createForm, 'end', messageText);
				setMessage(createForm, { type: 'error', text: messageText });
				return fail(400, { createForm, message: messageText });
			}

			// Validate event data
			validateEventData({
				title: data.title,
				start: data.start,
				end: data.end,
				scopeType: data.scopeType,
				scopeId: data.scopeId
			});

			// Check for conflicts
			const conflictCheck = await hasConflict(locals.pb, {
				scopeType: data.scopeType,
				scopeId: data.scopeId,
				start: data.start,
				end: data.end
			});

			if (conflictCheck.hasConflict) {
				return fail(409, {
					createForm,
					conflicts: conflictCheck.conflictingEvents,
					message: 'Event conflicts with existing event(s)'
				});
			}

			// Build location object
			let location;
			if (data.locationType && data.locationValue) {
				location = JSON.stringify({
					type: data.locationType,
					value: data.locationValue
				});
			}

			// Create event
			await locals.pb.collection('events').create({
				title: data.title,
				description: data.description || '',
				scopeType: data.scopeType,
				scopeId: data.scopeId || '',
				start: toUTC(data.start),
				end: toUTC(data.end),
				location,
				reminderLeadMinutes: data.reminderLeadMinutes,
				createdBy: locals.user!.id
			});

			return { createForm, success: true };
		} catch (err) {
			const normalized = normalizeError(err, { context: 'create event' });
			console.error('Error creating event:', normalized);
			const errorForm = await superValidate(request, withZod(eventCreateSchema));
			return fail(normalized.status || 500, {
				createForm: errorForm,
				message: normalized.userMessage || 'Failed to create event'
			});
		}
	},

	rsvp: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' });
		}

		try {
			const rsvpForm = await superValidate(request, withZod(rsvpSchema));

			if (!rsvpForm.valid) {
				return fail(400, { rsvpForm });
			}

			const { eventId, status } = rsvpForm.data as RSVPData;

			// Check if participant already exists
			const existingParticipants = await locals.pb.collection('event_participants').getFullList({
				filter: `event = "${eventId}" && user = "${locals.user!.id}"`
			});

			if (existingParticipants.length > 0) {
				// Update existing RSVP
				await locals.pb.collection('event_participants').update(existingParticipants[0].id, {
					status
				});
			} else {
				// Create new RSVP
				await locals.pb.collection('event_participants').create({
					event: eventId,
					user: locals.user!.id,
					status
				});
			}

			return { rsvpForm, success: true };
		} catch (err) {
			const normalized = normalizeError(err, { context: 'rsvp event' });
			console.error('Error RSVPing to event:', normalized);
			const errorForm = await superValidate(request, withZod(rsvpSchema));
			return fail(normalized.status || 500, {
				rsvpForm: errorForm,
				message: normalized.userMessage || 'Failed to RSVP'
			});
		}
	},

	deleteEvent: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' });
		}

		try {
			const formData = await request.formData();
			const eventId = formData.get('eventId') as string;

			if (!eventId) {
				return fail(400, { message: 'Event ID is required' });
			}

			// Fetch event to check ownership
			const event = await locals.pb.collection('events').getOne(eventId);

			if (event.createdBy !== locals.user!.id) {
				return fail(403, { message: 'You do not have permission to delete this event' });
			}

			// Delete event
			await locals.pb.collection('events').delete(eventId);

			return { success: true };
		} catch (err) {
			const normalized = normalizeError(err, { context: 'delete event' });
			console.error('Error deleting event:', normalized);
			return fail(normalized.status || 500, {
				message: normalized.userMessage || 'Failed to delete event'
			});
		}
	}
};
