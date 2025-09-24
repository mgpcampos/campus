import { error } from '@sveltejs/kit';
import { getUserByUsername, listUserPosts, listUserMemberships } from '$lib/services/users';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals, url }) => {
  const username = params.username;
  const page = Number(url.searchParams.get('page') || '1');
  const perPage = 10;

  const user = await getUserByUsername(locals.pb, username);
  if (!user) {
    error(404, 'User not found');
  }

  const posts = await listUserPosts(locals.pb, user.id, { page, perPage });
  const memberships = await listUserMemberships(locals.pb, user.id);

  return {
    profile: user,
    posts,
    memberships
  };
};
