import { redirect, fail } from '@sveltejs/kit';
import { getGroup, getGroupMemberCount, getGroupMembershipRole, joinGroup, leaveGroup } from '$lib/services/groups.js';
import { getPosts } from '$lib/services/posts.js';

/** @param {{ params:any, locals:any }} ctx */
export async function load({ params, locals }) {
  if (!locals.user) throw redirect(302, '/auth/login');
  const group = await getGroup(params.groupId);
  const memberCount = await getGroupMemberCount(params.groupId);
  const membershipRole = await getGroupMembershipRole(params.groupId);
  const member = membershipRole != null;
  const posts = await getPosts({ scope: 'group', group: params.groupId });
  return { group, memberCount, membershipRole, member, posts };
}

export const actions = {
  /** @param {{ params:any, locals:any }} ctx */
  join: async ({ params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
    try { await joinGroup(params.groupId); } catch { return fail(400, { error: 'Failed to join group' }); }
    return { success: true };
  },
  /** @param {{ params:any, locals:any }} ctx */
  leave: async ({ params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
    try { await leaveGroup(params.groupId); } catch { return fail(400, { error: 'Failed to leave group' }); }
    return { success: true };
  }
};
