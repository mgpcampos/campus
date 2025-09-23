import { pb } from '../pocketbase.js';

/** Join a space (creates membership)
 * @param {string} spaceId
 */
export async function joinSpace(spaceId) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  return await pb.collection('space_members').create({
    space: spaceId,
    user: pb.authStore.model.id,
    role: 'member'
  });
}

/** Leave a space (delete membership)
 * @param {string} spaceId
 */
export async function leaveSpace(spaceId) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  // Find membership record id first
  const list = await pb.collection('space_members').getList(1, 1, {
    filter: `space = "${spaceId}" && user = "${pb.authStore.model.id}"`
  });
  if (list.items.length === 0) return false;
  await pb.collection('space_members').delete(list.items[0].id);
  return true;
}

/** Check if current user is member of space
 * @param {string} spaceId
 */
export async function isMember(spaceId) {
  if (!pb.authStore.model?.id) return false;
  const list = await pb.collection('space_members').getList(1, 1, {
    filter: `space = "${spaceId}" && user = "${pb.authStore.model.id}"`
  });
  return list.items.length > 0;
}

/** Get role of current user in space
 * @param {string} spaceId
 */
export async function getMembershipRole(spaceId) {
  if (!pb.authStore.model?.id) return null;
  const list = await pb.collection('space_members').getList(1, 1, {
    filter: `space = "${spaceId}" && user = "${pb.authStore.model.id}"`
  });
  return list.items[0]?.role || null;
}
