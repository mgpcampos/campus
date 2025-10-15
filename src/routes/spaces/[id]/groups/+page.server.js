import { fail } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { requireAuth } from '$lib/auth.js';
import { getSpace } from '$lib/services/spaces.js';
import { getGroups, createGroup } from '$lib/services/groups.js';
import { createGroupSchema } from '$lib/schemas/group.js';

/**
 * @param {import('pocketbase').default} pb
 * @param {string} spaceIdentifier
 * @param {import('pocketbase').RecordModel | null | undefined} user
 */
async function resolveSpaceContext(pb, spaceIdentifier, user) {
	const space = await getSpace(spaceIdentifier, { pb });
	const spaceId = space.id;
	const owners = Array.isArray(space.expand?.owners) ? space.expand.owners : [];
	const moderators = Array.isArray(space.expand?.moderators) ? space.expand.moderators : [];
	const ownerIds = new Set(owners.map((owner) => owner.id));
	const moderatorIds = new Set(moderators.map((mod) => mod.id));

	let membershipRole = null;
	if (user) {
		try {
			const membershipList = await pb.collection('space_members').getList(1, 1, {
				filter: `space = "${spaceId}" && user = "${user.id}"`
			});
			membershipRole = membershipList.items[0]?.role ?? null;
		} catch (error) {
			if (error instanceof ClientResponseError) {
				if ([403, 404].includes(error.status)) {
					membershipRole = null;
				} else {
					throw error;
				}
			} else {
				throw error;
			}
		}
	}

	const isOwner = Boolean(user && ownerIds.has(user.id));
	const isModerator = Boolean(user && moderatorIds.has(user.id));
	const isMember = Boolean(membershipRole) || isOwner || isModerator;
	const canCreateGroups = Boolean(user && (user.isAdmin || isOwner || isModerator || isMember));

	return {
		space,
		permissions: {
			membershipRole,
			isOwner,
			isModerator,
			isMember,
			canCreateGroups
		}
	};
}

export async function load({ params, locals, url, depends }) {
	requireAuth(locals, url.pathname);
	depends('app:groups');
	const { space, permissions } = await resolveSpaceContext(locals.pb, params.id, locals.user);
	const search = url.searchParams.get('q') || '';
	const groups = await getGroups(space.id, { search }, { pb: locals.pb });
	return { space, groups, search, permissions };
}

export const actions = {
	/** @param {{ request: Request, params: any, locals: any, url: URL }} ctx */
	create: async ({ url, request, params, locals }) => {
		requireAuth(locals, url.pathname);
		const { space, permissions } = await resolveSpaceContext(locals.pb, params.id, locals.user);
		if (!permissions.canCreateGroups) {
			return fail(403, { error: 'You need to join this space before creating a group.' });
		}
		const form = await request.formData();
		const data = {
			name: form.get('name'),
			description: form.get('description') || undefined,
			isPublic: form.get('isPublic') === 'on'
		};
		const parsed = createGroupSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { error: 'Invalid group data', issues: parsed.error.flatten() });
		}
		try {
			await createGroup({ ...parsed.data, space: space.id }, { pb: locals.pb });
		} catch (error) {
			if (error instanceof ClientResponseError) {
				const message = error.response?.message || 'Failed to create group';
				return fail(error.status ?? 400, { error: message });
			}
			const normalized =
				/** @type {{ userMessage?: string; message?: string; status?: number }} */ (error ?? {});
			const message = normalized.userMessage || normalized.message || 'Failed to create group';
			return fail(normalized.status ?? 400, { error: message });
		}
		return { success: true, message: 'Group created successfully.' };
	}
};
