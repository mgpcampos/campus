import { redirect, fail } from '@sveltejs/kit';
import { createSpace } from '$lib/services/spaces.js';

export function load({ locals }) {
  if (!locals.user) throw redirect(302, '/auth/login');
  return {};
}

export const actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
    const data = await request.formData();
    const name = data.get('name');
    const slug = data.get('slug');
    const description = data.get('description') || '';
    const isPublic = data.get('isPublic') === 'on' || data.get('isPublic') === 'true';
    const avatar = data.get('avatar');

    if (!name || !slug) {
      return fail(400, { error: 'Name and slug are required', values: { name, slug, description, isPublic } });
    }
    try {
      const space = await createSpace({ name, slug, description, isPublic, avatar });
      throw redirect(303, `/spaces/${space.id}`);
    } catch (e) {
      return fail(500, { error: 'Failed to create space', details: e?.message });
    }
  }
};
