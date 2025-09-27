import { pb } from '../pocketbase.js';
import { normalizeError } from '../utils/errors.js';

/**
 * @typedef {{ pb?: import('pocketbase').default }} ServiceOptions
 */

/**
 * @param {import('pocketbase').default | undefined} provided
 * @returns {import('pocketbase').default}
 */
function resolveClient(provided) {
	return provided ?? pb;
}

/** Create a new group under a space
 * @param {{space:string, name:string, description?:string, isPublic:boolean}} data
 */
export async function createGroup(data, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		const formData = new FormData();
		formData.append('space', data.space);
		formData.append('name', data.name);
		formData.append('isPublic', data.isPublic ? 'true' : 'false');
		if (data.description) formData.append('description', data.description);
		if (client.authStore.model?.id) formData.append('moderators', client.authStore.model.id);
		return await client.collection('groups').create(formData);
	} catch (error) {
		console.error('Error creating group:', error);
		throw normalizeError(error, { context: 'createGroup' });
	}
}

/** List groups for a space (optional name/description search) */
/** @param {string} spaceId @param {{page?:number, perPage?:number, search?:string}} [opts] */
export async function getGroups(
	spaceId,
	{ page = 1, perPage = 50, search = '' } = {},
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	try {
		const client = resolveClient(serviceOptions.pb);
		let filter = `space = "${spaceId}"`;
		if (search) {
			const safe = search.replace(/"/g, '\\"');
			filter += ` && (name ~ "%${safe}%" || description ~ "%${safe}%")`;
		}
		return await client.collection('groups').getList(page, perPage, {
			filter,
			sort: '-created'
		});
	} catch (error) {
		console.error('Error getting groups:', error);
		throw normalizeError(error, { context: 'getGroups' });
	}
}

/** Get single group */
/** @param {string} id */
export async function getGroup(id, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		return await client.collection('groups').getOne(id, { expand: 'space,moderators' });
	} catch (error) {
		console.error('Error getting group:', error);
		throw normalizeError(error, { context: 'getGroup' });
	}
}

/** Update group */
/** @param {string} id @param {Record<string, any>} data */
export async function updateGroup(id, data, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		return await client.collection('groups').update(id, data);
	} catch (error) {
		console.error('Error updating group:', error);
		throw normalizeError(error, { context: 'updateGroup' });
	}
}

/** Delete group */
/** @param {string} id */
export async function deleteGroup(id, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		return await client.collection('groups').delete(id);
	} catch (error) {
		console.error('Error deleting group:', error);
		throw normalizeError(error, { context: 'deleteGroup' });
	}
}

/** Count members in a group */
/** @param {string} groupId */
export async function getGroupMemberCount(
	groupId,
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	try {
		const client = resolveClient(serviceOptions.pb);
		const result = await client.collection('group_members').getList(1, 1, {
			filter: `group = "${groupId}"`,
			totalCount: true
		});
		return result.totalItems;
	} catch (error) {
		console.error('Error getting group member count:', error);
		normalizeError(error, { context: 'getGroupMemberCount' }); // swallow
		return 0;
	}
}

/** List group members (optional user search) */
/** @param {string} groupId @param {{page?:number, perPage?:number, search?:string}} [opts] */
export async function getGroupMembers(
	groupId,
	{ page = 1, perPage = 50, search = '' } = {},
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	try {
		const client = resolveClient(serviceOptions.pb);
		const result = await client.collection('group_members').getList(page, perPage, {
			filter: `group = "${groupId}"`,
			expand: 'user'
		});
		if (!search) return result;
		const s = search.toLowerCase();
		const filtered = result.items.filter((/** @type {any} */ m) => {
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
	} catch (error) {
		console.error('Error getting group members:', error);
		throw normalizeError(error, { context: 'getGroupMembers' });
	}
}

/** Get current user's membership role in a group */
/** @param {string} groupId */
export async function getGroupMembershipRole(
	groupId,
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	try {
		const client = resolveClient(serviceOptions.pb);
		if (!client.authStore.model?.id) return null;
		const list = await client.collection('group_members').getList(1, 1, {
			filter: `group = "${groupId}" && user = "${client.authStore.model.id}"`
		});
		return list.items[0]?.role || null;
	} catch (error) {
		console.error('Error getting group membership role:', error);
		normalizeError(error, { context: 'getGroupMembershipRole' }); // swallow
		return null;
	}
}

/** Check membership */
/** @param {string} groupId */
export async function isGroupMember(groupId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		if (!client.authStore.model?.id) return false;
		const list = await client.collection('group_members').getList(1, 1, {
			filter: `group = "${groupId}" && user = "${client.authStore.model.id}"`
		});
		return list.items.length > 0;
	} catch (error) {
		console.error('Error checking group membership:', error);
		normalizeError(error, { context: 'isGroupMember' }); // swallow
		return false;
	}
}

/** Join group (requires space membership enforced at app layer) */
/** @param {string} groupId */
export async function joinGroup(groupId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		if (!client.authStore.model?.id) throw new Error('Not authenticated');
		return await client.collection('group_members').create({
			group: groupId,
			user: client.authStore.model.id,
			role: 'member'
		});
	} catch (error) {
		console.error('Error joining group:', error);
		throw normalizeError(error, { context: 'joinGroup' });
	}
}

/** Leave group */
/** @param {string} groupId */
export async function leaveGroup(groupId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb);
		if (!client.authStore.model?.id) throw new Error('Not authenticated');
		const list = await client.collection('group_members').getList(1, 1, {
			filter: `group = "${groupId}" && user = "${client.authStore.model.id}"`
		});
		if (list.items.length === 0) return false;
		await client.collection('group_members').delete(list.items[0].id);
		return true;
	} catch (error) {
		console.error('Error leaving group:', error);
		throw normalizeError(error, { context: 'leaveGroup' });
	}
}
