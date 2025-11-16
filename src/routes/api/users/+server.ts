import { json } from '@sveltejs/kit';
import { admin } from '$lib/pocketbase';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters long.'),
});

/**
 * @api {get} /api/users?q=... Search for users
 * @apiName SearchUsers
 * @apiGroup Users
 *
 * @apiParam {String} q Search query (username or name).
 *
 * @apiSuccess {Object[]} users List of users.
 */
export async function GET({ url }) {
  const query = url.searchParams.get('q');

  try {
    const validated = searchSchema.parse({ query });
    const users = await admin.collection('users').getList(1, 10, {
      filter: `(username ~ '${validated.query}' || name ~ '${validated.query}')`,
    });
    return json(users.items);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.flatten() }, { status: 400 });
    }
    console.error('User search error:', error);
    return json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
