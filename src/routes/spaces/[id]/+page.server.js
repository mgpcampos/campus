import { redirect, fail } from '@sveltejs/kit';
import { getSpace, getSpaceMembers, getSpaceMemberCount } from '$lib/services/spaces.js';
import { joinSpace, leaveSpace, getMembershipRole, isMember } from '$lib/services/memberships.js';
import { getPosts } from '$lib/services/posts.js';

export async function load({ params, locals }) {
  if (!locals.user) throw redirect(302, '/auth/login');
  const id = params.id;
  const space = await getSpace(id);
  const memberCount = await getSpaceMemberCount(id);
  const membershipRole = await getMembershipRole(id);
  const member = membershipRole != null;
  const posts = await getPosts({ scope: 'space', space: id });
  return { space, memberCount, membershipRole, member, posts };
}

export const actions = {
  join: async ({ params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
    try {
      await joinSpace(params.id);
    } catch (e) {
      return fail(400, { error: 'Failed to join space' });
    }
    return { success: true };
  },
  leave: async ({ params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
    try {
      await leaveSpace(params.id);
    } catch (e) {
      return fail(400, { error: 'Failed to leave space' });
    }
    return { success: true };
  }
};
