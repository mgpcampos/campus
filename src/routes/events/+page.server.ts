import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	requireAuth(locals, url.pathname);

	try {
		const now = new Date().toISOString();

		// Fetch upcoming events
		const upcomingEvents = await locals.pb.collection('events').getList(1, 20, {
			filter: `end >= "${now}"`,
			sort: 'start',
			expand: 'createdBy'
		});

		// Fetch past events
		const pastEvents = await locals.pb.collection('events').getList(1, 10, {
			filter: `end < "${now}"`,
			sort: '-start',
			expand: 'createdBy'
		});

		return {
			upcomingEvents: upcomingEvents.items,
			pastEvents: pastEvents.items,
			total: upcomingEvents.totalItems + pastEvents.totalItems
		};
	} catch (err) {
		console.error('Error loading events:', err);
		return error(500, 'Failed to load events');
	}
};
