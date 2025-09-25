import { pb } from '../pocketbase.js';
import { serverCaches, getOrSet } from '../utils/cache.js';

/**
 * Create a new space and assign owner membership
 * @param {{name:string, slug:string, description?:string, isPublic:boolean, avatar?:File}} data
 */
export async function createSpace(data) {
	const formData = new FormData();
	formData.append('name', data.name);
	formData.append('slug', data.slug);
	formData.append('isPublic', data.isPublic ? 'true' : 'false');
	if (data.description) formData.append('description', data.description);
	if (data.avatar) formData.append('avatar', data.avatar);
	// owners is multi relation; set current user as owner
	if (pb.authStore.model?.id) {
		formData.append('owners', pb.authStore.model.id);
	}
	const space = await pb.collection('spaces').create(formData);

	// Also create membership record with role owner for convenience queries
	if (pb.authStore.model?.id) {
		try {
			await pb.collection('space_members').create({
				space: space.id,
				user: pb.authStore.model.id,
				role: 'owner'
			});
		} catch (e) {
			// Ignore if uniqueness constraint races
			console.warn('Failed to create owner membership', e);
		}
	}
	return space;
}

/** Fetch spaces with optional search */
export async function getSpaces({ page = 1, perPage = 20, search = '' } = {}) {
	let filter = '';
	if (search) {
		// Basic name/slug search
		filter = `(name ~ "%${search}%" || slug ~ "%${search}%")`;
	}
	const useCache = page === 1 && !search; // only cache first page unfiltered list
	const cacheKey = `spaces:p${page}:pp${perPage}:f${filter || 'none'}`;
	if (!useCache) {
		return await pb.collection('spaces').getList(page, perPage, { filter, sort: '-created' });
	}
	return await getOrSet(
		serverCaches.lists,
		cacheKey,
		async () => {
			return await pb.collection('spaces').getList(page, perPage, { filter, sort: '-created' });
		},
		{ ttlMs: 30_000 }
	);
}

/** @param {string} id */
export async function getSpace(id) {
	return await pb.collection('spaces').getOne(id, { expand: 'owners,moderators' });
}

/** @param {string} id @param {Record<string, any>} data */
export async function updateSpace(id, data) {
	return await pb.collection('spaces').update(id, data);
}

/** @param {string} id */
export async function deleteSpace(id) {
	return await pb.collection('spaces').delete(id);
}

/** Get membership count for a space @param {string} spaceId */
export async function getSpaceMemberCount(spaceId) {
	const cacheKey = `spaceMemberCount:${spaceId}`;
	return await getOrSet(
		serverCaches.lists,
		cacheKey,
		async () => {
			const result = await pb.collection('space_members').getList(1, 1, {
				filter: `space = "${spaceId}"`,
				totalCount: true
			});
			return result.totalItems;
		},
		{ ttlMs: 20_000 }
	);
}

/** List members of a space with optional search over user fields
 * @param {string} spaceId
 * @param {{ page?: number; perPage?: number; search?: string }} [opts]
 */
export async function getSpaceMembers(spaceId, { page = 1, perPage = 50, search = '' } = {}) {
	// Always expand user for potential filtering
	const result = await pb.collection('space_members').getList(page, perPage, {
		filter: `space = "${spaceId}"`,
		expand: 'user'
	});
	if (!search) return result;
	const s = search.toLowerCase();
	const filtered = result.items.filter((m) => {
		const u = m.expand?.user;
		if (!u) return false;
		return (
			(u.username && u.username.toLowerCase().includes(s)) ||
			(u.name && u.name.toLowerCase().includes(s))
		);
	});
	return {
		...result,
		items: filtered,
		totalItems: filtered.length,
		totalPages: 1,
		page: 1
	};
}
