import { redirect, fail } from '@sveltejs/kit';
import { getSpace } from '$lib/services/spaces.js';
import { getGroups, createGroup } from '$lib/services/groups.js';
import { createGroupSchema } from '$lib/schemas/group.js';

export async function load({ params, locals, url }) {
  if (!locals.user) throw redirect(302, '/auth/login');
  const space = await getSpace(params.id);
  const search = url.searchParams.get('q') || '';
  const groups = await getGroups(params.id, { search });
  return { space, groups, search };
}

export const actions = {
  /** @param {{ request: Request, params: any, locals: any }} ctx */
  create: async ({ request, params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
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
      await createGroup({ ...parsed.data, space: params.id });
    } catch {
      return fail(400, { error: 'Failed to create group' });
    }
    return { success: true };
  }
};
