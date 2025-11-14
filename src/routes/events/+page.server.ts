import { error } from '@sveltejs/kit'
import { requireAuth } from '$lib/auth.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url, locals }) => {
	requireAuth(locals, url.pathname)

	try {
		const now = new Date().toISOString()
		const userId = locals.user?.id

		if (!userId) {
			return error(401, 'User not authenticated')
		}

		// Fetch upcoming events created by the current user only
		const upcomingEvents = await locals.pb.collection('events').getList(1, 20, {
			filter: `end >= "${now}" && createdBy = "${userId}"`,
			sort: 'start',
			expand: 'createdBy'
		})

		// Fetch past events created by the current user only
		const pastEvents = await locals.pb.collection('events').getList(1, 10, {
			filter: `end < "${now}" && createdBy = "${userId}"`,
			sort: '-start',
			expand: 'createdBy'
		})

		return {
			upcomingEvents: upcomingEvents.items,
			pastEvents: pastEvents.items,
			total: upcomingEvents.totalItems + pastEvents.totalItems
		}
	} catch (err) {
		console.error('Error loading events:', err)
		return error(500, 'Failed to load events')
	}
}
