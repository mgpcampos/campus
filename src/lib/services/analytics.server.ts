import type PocketBase from 'pocketbase';
import { z } from 'zod';

const metadataValueSchema: z.ZodType<unknown> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(metadataValueSchema),
		z.record(metadataValueSchema)
	])
);

const viewportSchema = z
	.object({
		width: z.number().int().nonnegative().optional(),
		height: z.number().int().nonnegative().optional()
	})
	.optional();

export const analyticsEventSchema = z.object({
	type: z.enum(['page', 'event', 'vital']),
	name: z.string().min(1).max(64),
	sessionId: z.string().min(6).max(64),
	page: z.string().max(256).optional(),
	value: z.number().finite().optional(),
	metadata: z.record(metadataValueSchema).optional(),
	locale: z.string().max(16).optional(),
	referrer: z.string().max(512).nullable().optional(),
	userAgent: z.string().max(512).optional(),
	userId: z.string().max(36).nullable().optional(),
	timestamp: z.string().optional(),
	viewport: viewportSchema
});

export const analyticsBatchSchema = z.object({
	events: z.array(analyticsEventSchema).min(1).max(25)
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

function sanitizeMetadata(event: AnalyticsEventInput) {
	const base = {
		...(event.metadata ?? {}),
		viewport: event.viewport ?? undefined
	};

	try {
		const json = JSON.stringify(base);
		if (json.length > 4000) {
			return { truncated: true };
		}
		return base;
	} catch {
		return null;
	}
}

type AnalyticsRecord = {
	id: string;
	type: AnalyticsEventInput['type'];
	name: string;
	sessionId?: string | null;
	page?: string | null;
	value?: number | null;
	metadata?: Record<string, unknown> | null;
	locale?: string | null;
	referrer?: string | null;
	userAgent?: string | null;
	user?: string | null;
	ip?: string | null;
	created: string;
};

export async function recordAnalyticsEvents(
	pb: PocketBase,
	events: AnalyticsEventInput[],
	options: { ip?: string } = {}
) {
	let created = 0;
	for (const event of events) {
		try {
			await pb.collection('analytics_events').create({
				type: event.type,
				name: event.name,
				sessionId: event.sessionId,
				page: event.page ?? null,
				value: typeof event.value === 'number' ? event.value : null,
				metadata: sanitizeMetadata(event),
				locale: event.locale ?? null,
				referrer: event.referrer ?? null,
				userAgent: event.userAgent ?? null,
				ip: options.ip ?? null,
				user: event.userId ?? null
			});
			created += 1;
		} catch (error) {
			console.warn('[analytics] failed to persist event', error);
		}
	}
	return created;
}

export interface AnalyticsSummary {
	rangeDays: number;
	totalEvents: number;
	pageViews: number;
	uniqueSessions: number;
	uniqueUsers: number;
	vitals: {
		lcp: number | null;
		cls: number | null;
		fid: number | null;
	};
	topPages: Array<{ page: string; count: number }>;
	timeSeries: Array<{ date: string; pageViews: number; events: number }>;
}

export async function getAnalyticsSummary(
	pb: PocketBase,
	options: { rangeDays?: number } = {}
): Promise<AnalyticsSummary> {
	const rangeDays = Math.max(1, Math.min(options.rangeDays ?? 7, 30));
	const since = new Date(Date.now() - rangeDays * 86_400_000).toISOString();

	const perPage = 200;
	let page = 1;
	const events: AnalyticsRecord[] = [];

	for (;;) {
		const list = await pb.collection('analytics_events').getList(page, perPage, {
			filter: `created >= "${since}"`,
			sort: '-created'
		});
		events.push(...(list.items as unknown as AnalyticsRecord[]));
		if (page >= list.totalPages) break;
		page += 1;
	}

	const totalEvents = events.length;
	let pageViews = 0;
	const sessions = new Set<string>();
	const users = new Set<string>();
	const pageCounts = new Map<string, number>();

	const vitalsAccumulator = {
		lcp: [] as number[],
		cls: [] as number[],
		fid: [] as number[]
	};

	const seriesMap = new Map<string, { pageViews: number; events: number }>();

	for (const event of events) {
		const type = event.type as AnalyticsEventInput['type'];
		if (type === 'page') pageViews += 1;
		if (event.sessionId) sessions.add(event.sessionId);
		if (event.user) users.add(event.user as string);
		if (event.page) {
			pageCounts.set(event.page, (pageCounts.get(event.page) ?? 0) + 1);
		}

		const day = (event.created as string).slice(0, 10);
		const bucket = seriesMap.get(day) ?? { pageViews: 0, events: 0 };
		bucket.events += 1;
		if (type === 'page') bucket.pageViews += 1;
		seriesMap.set(day, bucket);

		if (type === 'vital' && typeof event.value === 'number') {
			if (event.name === 'lcp') vitalsAccumulator.lcp.push(event.value);
			if (event.name === 'cls') vitalsAccumulator.cls.push(event.value);
			if (event.name === 'fid') vitalsAccumulator.fid.push(event.value);
		}
	}

	const average = (values: number[]) =>
		values.length
			? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(3))
			: null;

	const topPages = Array.from(pageCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([page, count]) => ({ page, count }));

	const timeSeries = Array.from(seriesMap.entries())
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([date, value]) => ({ date, ...value }));

	return {
		rangeDays,
		totalEvents,
		pageViews,
		uniqueSessions: sessions.size,
		uniqueUsers: users.size,
		vitals: {
			lcp: average(vitalsAccumulator.lcp),
			cls: average(vitalsAccumulator.cls),
			fid: average(vitalsAccumulator.fid)
		},
		topPages,
		timeSeries
	};
}

export async function getRecentAnalyticsEvents(pb: PocketBase, limit = 20) {
	const list = await pb.collection('analytics_events').getList(1, limit, {
		sort: '-created'
	});
	return list.items;
}
