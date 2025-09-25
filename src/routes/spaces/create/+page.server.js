import { redirect, fail } from '@sveltejs/kit';
import { createSpace } from '$lib/services/spaces.js';
import { toErrorPayload } from '$lib/utils/errors.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (!locals.user) throw redirect(302, '/auth/login');
	return {};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) throw redirect(302, '/auth/login');
		const data = await request.formData();

		const name = /** @type {string | null} */ (data.get('name'));
		const slug = /** @type {string | null} */ (data.get('slug'));
		const description = /** @type {string | null} */ (data.get('description')) || '';
		const isPublicRaw = data.get('isPublic');
		const isPublic = isPublicRaw === 'on' || isPublicRaw === 'true';
		const avatar = /** @type {File | null} */ (data.get('avatar'));

		if (!name || !slug) {
			return fail(400, {
				error: 'Name and slug are required',
				values: { name, slug, description, isPublic }
			});
		}
		try {
			const payload = { name, slug, description, isPublic, ...(avatar ? { avatar } : {}) };
			const space = await createSpace(payload);
			throw redirect(303, `/spaces/${space.id}`);
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e && e.status === 303) {
				throw e; // Re-throw redirects
			}
			const errorPayload = toErrorPayload(e, { context: 'createSpace' });
			return fail(errorPayload.status || 500, {
				error: errorPayload.message,
				retryable: errorPayload.retryable,
				values: { name, slug, description, isPublic }
			});
		}
	}
};
