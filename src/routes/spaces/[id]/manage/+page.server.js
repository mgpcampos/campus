import { redirect, fail } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth.js';
import { getSpace, updateSpace } from '$lib/services/spaces.js';
import { getMembershipRole } from '$lib/services/memberships.js';

export async function load({ url, params, locals }) {
	requireAuth(locals, url.pathname);
	const space = await getSpace(params.id, { pb: locals.pb });
	const role = await getMembershipRole(space.id, { pb: locals.pb });
	// Only owners or moderators
	if (!role || (role !== 'owner' && role !== 'moderator')) {
		throw redirect(303, `/spaces/${space.slug}`);
	}
	return { space, role };
}

export const actions = {
	update: async ({ url, request, params, locals }) => {
		requireAuth(locals, url.pathname);
		const space = await getSpace(params.id, { pb: locals.pb });
		const role = await getMembershipRole(space.id, { pb: locals.pb });
		if (!role || (role !== 'owner' && role !== 'moderator')) {
			return fail(403, { error: 'Not allowed' });
		}
		const data = await request.formData();
		const description = data.get('description');
		const name = data.get('name');
		const isPublicRaw = data.get('isPublic');
		const isPublic = isPublicRaw === 'on' || isPublicRaw === 'true';
		const avatar = /** @type {File | null} */ (data.get('avatar'));

		/** @type {Record<string, any>} */
		const updates = { description };

		// Only owners can change name and visibility
		if (role === 'owner') {
			if (name) updates.name = name;
			updates.isPublic = isPublic;
		}

		// Handle avatar upload
		if (avatar && avatar.size > 0) {
			updates.avatar = avatar;
		}

		try {
			await updateSpace(space.id, updates, { pb: locals.pb });
			return { success: true };
		} catch (e) {
			console.error('Update space error:', e);
			return fail(400, { error: 'Failed to update space' });
		}
	}
};
