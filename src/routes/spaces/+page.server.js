import { redirect } from '@sveltejs/kit';
import { getSpaces, getSpaceMemberCount } from '$lib/services/spaces.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, locals }) {
  if (!locals.user) throw redirect(302, '/auth/login');
  const pageParam = url.searchParams.get('page');
  const page = pageParam ? Number(pageParam) : 1;
  const search = url.searchParams.get('q') || '';
  const spaces = await getSpaces({ page, search });
  const augmentedItems = await Promise.all(spaces.items.map(async (s) => {
    const memberCount = await getSpaceMemberCount(s.id);
    return { ...s, memberCount };
  }));
  return { spaces: { ...spaces, items: augmentedItems }, search };
}
