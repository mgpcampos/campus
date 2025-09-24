import { pb } from '../pocketbase.js';

/** Create a new group under a space
 * @param {{space:string, name:string, description?:string, isPublic:boolean}} data
 */
export async function createGroup(data) {
  const formData = new FormData();
  formData.append('space', data.space);
  formData.append('name', data.name);
  formData.append('isPublic', data.isPublic ? 'true' : 'false');
  if (data.description) formData.append('description', data.description);
  // creator becomes moderator by adding to group.moderators (multi relation)
  if (pb.authStore.model?.id) formData.append('moderators', pb.authStore.model.id);
  return await pb.collection('groups').create(formData);
}

/** List groups for a space (optional name/description search) */
/** @param {string} spaceId @param {{page?:number, perPage?:number, search?:string}} [opts] */
export async function getGroups(spaceId, { page = 1, perPage = 50, search = '' } = {}) {
  let filter = `space = "${spaceId}"`;
  if (search) {
    const safe = search.replace(/"/g, '\\"');
    filter += ` && (name ~ "%${safe}%" || description ~ "%${safe}%")`;
  }
  return await pb.collection('groups').getList(page, perPage, {
    filter,
    sort: '-created'
  });
}

/** Get single group */
/** @param {string} id */
export async function getGroup(id) {
  return await pb.collection('groups').getOne(id, { expand: 'space,moderators' });
}

/** Update group */
/** @param {string} id @param {Record<string, any>} data */
export async function updateGroup(id, data) {
  return await pb.collection('groups').update(id, data);
}

/** Delete group */
/** @param {string} id */
export async function deleteGroup(id) {
  return await pb.collection('groups').delete(id);
}

/** Count members in a group */
/** @param {string} groupId */
export async function getGroupMemberCount(groupId) {
  const result = await pb.collection('group_members').getList(1, 1, {
    filter: `group = "${groupId}"`,
    totalCount: true
  });
  return result.totalItems;
}

/** List group members (optional user search) */
/** @param {string} groupId @param {{page?:number, perPage?:number, search?:string}} [opts] */
export async function getGroupMembers(groupId, { page = 1, perPage = 50, search = '' } = {}) {
  const result = await pb.collection('group_members').getList(page, perPage, {
    filter: `group = "${groupId}"`,
    expand: 'user'
  });
  if (!search) return result;
  const s = search.toLowerCase();
  const filtered = result.items.filter(m => {
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

/** Get current user's membership role in a group */
/** @param {string} groupId */
export async function getGroupMembershipRole(groupId) {
  if (!pb.authStore.model?.id) return null;
  const list = await pb.collection('group_members').getList(1, 1, {
    filter: `group = "${groupId}" && user = "${pb.authStore.model.id}"`
  });
  return list.items[0]?.role || null;
}

/** Check membership */
/** @param {string} groupId */
export async function isGroupMember(groupId) {
  if (!pb.authStore.model?.id) return false;
  const list = await pb.collection('group_members').getList(1, 1, {
    filter: `group = "${groupId}" && user = "${pb.authStore.model.id}"`
  });
  return list.items.length > 0;
}

/** Join group (requires space membership enforced at app layer) */
/** @param {string} groupId */
export async function joinGroup(groupId) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  return await pb.collection('group_members').create({
    group: groupId,
    user: pb.authStore.model.id,
    role: 'member'
  });
}

/** Leave group */
/** @param {string} groupId */
export async function leaveGroup(groupId) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  const list = await pb.collection('group_members').getList(1, 1, {
    filter: `group = "${groupId}" && user = "${pb.authStore.model.id}"`
  });
  if (list.items.length === 0) return false;
  await pb.collection('group_members').delete(list.items[0].id);
  return true;
}
