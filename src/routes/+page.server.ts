import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is authenticated, fetch recent materials and upcoming events
	if (locals.pb.authStore.isValid) {
		try {
			const [recentMaterials, upcomingEvents] = await Promise.all([
				// Fetch 3 most recent materials
				locals.pb.collection('materials').getList(1, 3, {
					sort: '-created',
					expand: 'uploader',
					fields:
						'id,title,description,format,created,expand.uploader.name,expand.uploader.username'
				}),
				// Fetch 3 upcoming events
				locals.pb.collection('events').getList(1, 3, {
					filter: `start >= "${new Date().toISOString()}"`,
					sort: 'start',
					fields: 'id,title,start,end'
				})
			]);

			return {
				recentMaterials: recentMaterials.items,
				upcomingEvents: upcomingEvents.items
			};
		} catch (error) {
			console.warn('Failed to load home page data:', error);
			return {
				recentMaterials: [],
				upcomingEvents: []
			};
		}
	}

	return {
		recentMaterials: [],
		upcomingEvents: []
	};
};
