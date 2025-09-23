import { redirect, fail } from '@sveltejs/kit';
import { getSpaces, getSpaceMemberCount } from '$lib/services/spaces.js';

export async function load({ url, locals }) {
  if (!locals.user) throw redirect(302, '/auth/login');
  const page = Number(url.searchParams.get('page') || '1');
  const search = url.searchParams.get('q') || '';
  const spaces = await getSpaces({ page, search });
  // Augment with member counts (could be optimized with a view later)
  const augmented = await Promise.all(spaces.items.map(async (s) => ({
    ...s,
    memberCount: await getSpaceMemberCount(s.id)
  })));
  return { spaces: { ...spaces, items: augmented }, search };
}
