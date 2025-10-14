import { json, error } from '@sveltejs/kit';
import { z } from 'zod';

const themeUpdateSchema = z.object({
	enabled: z.boolean()
});

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!locals.pb?.authStore?.isValid) {
		return error(401, 'Authentication required');
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const parsed = themeUpdateSchema.safeParse(payload);
	if (!parsed.success) {
		return error(400, 'Invalid payload');
	}

	const user = locals.pb.authStore.model;
	if (!user) {
		return error(401, 'Authentication required');
	}

	try {
		const updatedUser = await locals.pb.collection('users').update(user.id, {
			prefersDarkMode: parsed.data.enabled
		});

		// Keep the server session aligned with the updated user data
		locals.pb.authStore.save(locals.pb.authStore.token, updatedUser);
		locals.user = updatedUser;

		return json({ success: true, user: updatedUser });
	} catch (err) {
		console.error('Failed to update theme preference', err);
		return error(500, 'Unable to update theme preference');
	}
}
