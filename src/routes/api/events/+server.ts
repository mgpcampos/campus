import { json, error } from '@sveltejs/kit';
import { hasConflict, validateEventData, getUserEvents } from '$lib/server/events/conflicts';
import { toUTC, validateTimeRange } from '$lib/utils/timezone';
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js';
import type { EventCreateInput } from '../../../types/events';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const scopeType = url.searchParams.get('scopeType');
		const scopeId = url.searchParams.get('scopeId');
		const from = url.searchParams.get('from');
		const to = url.searchParams.get('to');
		const userId = url.searchParams.get('userId') || locals.user?.id;

		if (!userId) {
			return error(400, 'userId parameter is required');
		}

		// Build filter options
		const options: {
			from?: Date;
			to?: Date;
			scopeType?: any;
			scopeId?: string;
		} = {};

		if (from) {
			options.from = new Date(from);
		}

		if (to) {
			options.to = new Date(to);
		}

		if (scopeType) {
			options.scopeType = scopeType as any;
		}

		if (scopeId) {
			options.scopeId = scopeId;
		}

		const events = await getUserEvents(locals.pb, userId, options);

		return json({
			events,
			total: events.length
		});
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getEvents' });
		console.error('Error fetching events:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const body = await request.json();

		const eventData: EventCreateInput = {
			title: body.title,
			description: body.description,
			scopeType: body.scopeType,
			scopeId: body.scopeId,
			start: body.start,
			end: body.end,
			location: body.location,
			reminderLeadMinutes: body.reminderLeadMinutes
		};

		// Validate event data
		validateEventData({
			title: eventData.title,
			start: eventData.start,
			end: eventData.end,
			scopeType: eventData.scopeType,
			scopeId: eventData.scopeId
		});

		// Check for conflicts
		const conflictCheck = await hasConflict(locals.pb, {
			scopeType: eventData.scopeType,
			scopeId: eventData.scopeId,
			start: eventData.start,
			end: eventData.end
		});

		if (conflictCheck.hasConflict) {
			return json(
				{
					error: 'Event conflicts with existing event(s)',
					conflicts: conflictCheck.conflictingEvents
				},
				{ status: 409 }
			);
		}

		// Create event in PocketBase
		const event = await locals.pb.collection('events').create({
			title: eventData.title,
			description: eventData.description,
			scopeType: eventData.scopeType,
			scopeId: eventData.scopeId || '',
			start: toUTC(eventData.start),
			end: toUTC(eventData.end),
			location: eventData.location ? JSON.stringify(eventData.location) : undefined,
			reminderLeadMinutes: eventData.reminderLeadMinutes,
			createdBy: locals.user!.id
		});

		return json(
			{
				event,
				message: 'Event created successfully'
			},
			{ status: 201 }
		);
	} catch (err) {
		const n = normalizeError(err, { context: 'api:createEvent' });
		console.error('Error creating event:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}
