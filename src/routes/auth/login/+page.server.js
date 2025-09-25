import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { loginSchema } from '$lib/utils/validation.js';
import { getErrorMessage } from '$lib/utils/errors.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		form: await superValidate(zod(loginSchema))
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals, url }) => {
		const form = await superValidate(request, zod(loginSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Authenticate with PocketBase
			await locals.pb.collection('users').authWithPassword(form.data.email, form.data.password);

			// Check if there's a return URL
			const returnUrl = url.searchParams.get('returnUrl');
			if (returnUrl) {
				throw redirect(302, returnUrl);
			}

			throw redirect(302, '/');
		} catch (error) {
			// If it's a redirect, re-throw it
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				throw error;
			}

			// Handle authentication errors
			const errorMessage = getErrorMessage(error);
			return fail(400, {
				form,
				error: errorMessage
			});
		}
	}
};
