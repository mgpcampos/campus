import { fail, error } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { requireAuth } from '$lib/auth.js';
import { getSpace, getSpaceMemberCount } from '$lib/services/spaces.js';
import { joinSpace, leaveSpace, getMembershipRole } from '$lib/services/memberships.js';
import { getPosts } from '$lib/services/posts.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, params, locals }) {
	requireAuth(locals, url.pathname);
	const identifier = params.id;
	try {
		const space = await getSpace(identifier, { pb: locals.pb });
		const spaceId = space.id;
		const memberCount = await getSpaceMemberCount(spaceId, { pb: locals.pb });
		const membershipRole = await getMembershipRole(spaceId, { pb: locals.pb });
		const member = membershipRole != null;
		let postsRestricted = false;
		let posts;
		try {
			posts = await getPosts({ scope: 'space', space: spaceId }, { pb: locals.pb });
		} catch (err) {
			const unknownErr = /** @type {any} */ (err);
			const status = err instanceof ClientResponseError ? err.status : unknownErr?.status;
			if (status === 403) {
				postsRestricted = true;
				posts = {
					items: [],
					page: 1,
					perPage: 0,
					totalItems: 0,
					totalPages: 0
				};
			} else {
				throw err;
			}
		}
		return {
			space,
			memberCount: memberCount ?? null,
			membershipRole,
			member,
			posts,
			postsRestricted
		};
	} catch (err) {
		if (err instanceof ClientResponseError) {
			if (err.status === 404) {
				throw error(404, 'Space not found');
			}
			if (err.status === 403) {
				throw error(403, 'You do not have access to this space.');
			}
		}
		const normalized = /** @type {{ status?: number; userMessage?: string; message?: string }} */ (
			err ?? {}
		);
		const status = normalized.status ?? 500;
		const message = normalized.userMessage || normalized.message || 'Failed to load space.';
		throw error(status, message);
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	join: async ({ url, params, locals }) => {
		requireAuth(locals, url.pathname);
		try {
			const space = await getSpace(params.id, { pb: locals.pb });
			await joinSpace(space.id, { pb: locals.pb });
		} catch (err) {
			if (err instanceof ClientResponseError && err.status === 404) {
				return fail(404, { error: 'Space not found' });
			}
			return fail(400, { error: 'Failed to join space' });
		}
		return { success: true };
	},
	leave: async ({ url, params, locals }) => {
		requireAuth(locals, url.pathname);
		try {
			const space = await getSpace(params.id, { pb: locals.pb });
			await leaveSpace(space.id, { pb: locals.pb });
		} catch (err) {
			if (err instanceof ClientResponseError && err.status === 404) {
				return fail(404, { error: 'Space not found' });
			}
			return fail(400, { error: 'Failed to leave space' });
		}
		return { success: true };
	}
};
