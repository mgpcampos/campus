import { superValidate, message } from 'sveltekit-superforms/server';
import { fail, redirect } from '@sveltejs/kit';
import { profileSchema } from '$lib/utils/validation.js';
import { getErrorMessage } from '$lib/utils/errors.js';
import { sanitizeContent } from '$lib/utils/sanitize.js';
import { withZod } from '$lib/validation';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	// Redirect to login if not authenticated
	if (!locals.pb.authStore.isValid) {
		throw redirect(302, '/auth/login?returnUrl=/profile');
	}

	const user = locals.pb.authStore.model;

	if (!user) {
		throw redirect(302, '/auth/login?returnUrl=/profile');
	}

	let freshUser;
	try {
		freshUser = await locals.pb.collection('users').getOne(user.id);
	} catch (error) {
		console.warn('profile:load user fetch failed', error);
		throw redirect(302, '/auth/login?returnUrl=/profile');
	}

	// Pre-populate form with current user data
	const form = await superValidate(
		{
			name: freshUser.name || '',
			username: freshUser.username || '',
			bio: freshUser.bio || ''
		},
		withZod(profileSchema)
	);

	return {
		form,
		user: freshUser
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		// Check authentication
		if (!locals.pb.authStore.isValid) {
			throw redirect(302, '/auth/login?returnUrl=/profile');
		}

		const form = await superValidate(request, withZod(profileSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Update user profile
			const user = locals.pb.authStore.model;
			if (!user) {
				throw redirect(302, '/auth/login?returnUrl=/profile');
			}
			const userId = user.id;
			await locals.pb.collection('users').update(userId, {
				name: form.data.name,
				username: form.data.username,
				bio: sanitizeContent(form.data.bio || '')
			});

			return message(form, {
				type: 'success',
				text: 'Profile updated successfully!'
			});
		} catch (error) {
			const errorMessage = getErrorMessage(error);
			return message(form, {
				type: 'error',
				text: errorMessage
			});
		}
	}
};
