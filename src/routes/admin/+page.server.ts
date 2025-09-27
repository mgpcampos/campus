import { requireAdmin } from '$lib/auth.js';
import { getAnalyticsSummary, getRecentAnalyticsEvents } from '$lib/services/analytics.server';
import type { PageServerLoad } from './$types';

async function countRecords(pb: App.Locals['pb'], collection: string, filter?: string) {
	const list = await pb.collection(collection).getList(1, 1, {
		filter,
		fields: 'id',
		sort: '-created'
	});
	return list.totalItems;
}

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);

	const [analytics, recentEvents, spacesTotal, groupsTotal, usersTotal, openReports, reports] =
		await Promise.all([
			getAnalyticsSummary(locals.pb, { rangeDays: 7 }),
			getRecentAnalyticsEvents(locals.pb, 12),
			countRecords(locals.pb, 'spaces'),
			countRecords(locals.pb, 'groups'),
			countRecords(locals.pb, 'users'),
			countRecords(locals.pb, 'reports', 'status = "open" || status = "reviewing"'),
			locals.pb.collection('reports').getList(1, 6, {
				filter: 'status = "open" || status = "reviewing"',
				expand: 'reporter',
				sort: '-created'
			})
		]);

	const recentModeration = await locals.pb.collection('moderation_logs').getList(1, 6, {
		expand: 'actor',
		sort: '-created'
	});

	return {
		admin,
		analytics,
		recentEvents,
		metrics: {
			spacesTotal,
			groupsTotal,
			usersTotal,
			openReports
		},
		recentReports: reports.items,
		recentModeration: recentModeration.items
	};
};
