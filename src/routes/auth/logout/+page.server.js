import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	// Clear the auth store
	locals.pb.authStore.clear();

	// Redirect to home page
	throw redirect(302, '/');
}
