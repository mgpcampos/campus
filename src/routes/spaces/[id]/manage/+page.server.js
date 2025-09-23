import { redirect, fail } from '@sveltejs/kit';
import { getSpace, updateSpace } from '$lib/services/spaces.js';
import { getMembershipRole } from '$lib/services/memberships.js';

export async function load({ params, locals }) {
  if (!locals.user) throw redirect(302, '/auth/login');
  const space = await getSpace(params.id);
  const role = await getMembershipRole(params.id);
  // Only owners or moderators
  if (!role || (role !== 'owner' && role !== 'moderator')) {
    throw redirect(303, `/spaces/${params.id}`);
  }
  return { space, role };
}

export const actions = {
  update: async ({ request, params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
    const role = await getMembershipRole(params.id);
    if (!role || (role !== 'owner' && role !== 'moderator')) {
      return fail(403, { error: 'Not allowed' });
    }
    const data = await request.formData();
    const description = data.get('description');
    try {
      await updateSpace(params.id, { description });
      return { success: true };
    } catch (e) {
      return fail(400, { error: 'Failed to update space' });
    }
  }
};
