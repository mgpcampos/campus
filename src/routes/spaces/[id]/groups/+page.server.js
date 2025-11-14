import { error } from '@sveltejs/kit'
import { requireAuth } from '$lib/auth.js'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, url }) => {
	requireAuth(locals, url.pathname)
	throw error(404, 'Groups are no longer available.')
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ locals, url }) => {
		requireAuth(locals, url.pathname)
		throw error(404, 'Groups are no longer available.')
	}
}
