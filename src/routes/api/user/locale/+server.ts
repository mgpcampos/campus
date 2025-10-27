import { json, error } from '@sveltejs/kit';
import { z } from 'zod';

import { availableLanguages, normalizeLocale } from '$lib/i18n/index.js';

const localeUpdateSchema = z.object({
	locale: z.string().transform((value, ctx) => {
		const normalized = normalizeLocale(value);
		const supported = availableLanguages.some((lang) => lang.code === normalized);
		if (!supported) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Unsupported locale: ${value}`
			});
			return z.NEVER;
		}
		return normalized;
	})
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

	const parsed = localeUpdateSchema.safeParse(payload);
	if (!parsed.success) {
		return error(400, 'Invalid payload');
	}

	const user = locals.pb.authStore.model;
	if (!user) {
		return error(401, 'Authentication required');
	}

	try {
		const updatedUser = await locals.pb.collection('users').update(user.id, {
			locale: parsed.data.locale
		});

		// Keep the server session aligned with the updated user data
		locals.pb.authStore.save(locals.pb.authStore.token, updatedUser);
		locals.user = updatedUser;

		return json({ success: true, user: updatedUser });
	} catch (err) {
		console.error('Failed to update locale preference', err);
		return error(500, 'Unable to update locale preference');
	}
}
