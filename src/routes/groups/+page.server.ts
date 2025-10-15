import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/auth.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	requireAuth(locals, url.pathname);

	try {
		// Fetch all groups across all spaces the user has access to
		const groups = await locals.pb.collection('groups').getList(1, 50, {
			expand: 'space',
			sort: '-created'
		});

		return {
			groups: groups.items,
			total: groups.totalItems,
			page: groups.page,
			perPage: groups.perPage,
			totalPages: groups.totalPages
		};
	} catch (err) {
		console.error('Error loading groups:', err);
		return {
			groups: [],
			total: 0,
			page: 1,
			perPage: 50,
			totalPages: 0
		};
	}
};
