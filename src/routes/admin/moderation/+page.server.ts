import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.pb.authStore.isValid) {
		throw redirect(303, '/auth/login');
	}

	// Check if user is admin
	const user = locals.pb.authStore.record;
	if (!user || !user.isAdmin) {
		throw error(403, 'Access denied. Admin privileges required.');
	}

	try {
		// Fetch all moderation cases
		const cases = await locals.pb.collection('moderation_cases').getFullList({
			sort: '-created',
			fields: 'id,sourceType,sourceId,state,evidence,created,updated'
		});

		return {
			cases,
			meta: {
				title: 'Moderation Dashboard | Campus Admin',
				description: 'Review and manage flagged content and moderation cases'
			}
		};
	} catch (err) {
		console.error('Error loading moderation cases:', err);
		throw error(500, 'Failed to load moderation cases');
	}
};
