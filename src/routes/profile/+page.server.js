import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { profileSchema } from '$lib/utils/validation.js';
import { getErrorMessage } from '$lib/utils/errors.js';
import { sanitizeContent } from '$lib/utils/sanitize.js';

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

	// Pre-populate form with current user data
	const form = await superValidate(
		{
			name: user.name || '',
			username: user.username || '',
			bio: user.bio || ''
		},
		zod(profileSchema)
	);

	return {
		form,
		user
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		// Check authentication
		if (!locals.pb.authStore.isValid) {
			throw redirect(302, '/auth/login?returnUrl=/profile');
		}

		const form = await superValidate(request, zod(profileSchema));

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
