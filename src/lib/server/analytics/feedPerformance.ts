import { performance } from 'node:perf_hooks'
import type PocketBase from 'pocketbase'
import { config } from '$lib/config.js'
import { recordAnalyticsEvents } from '$lib/services/analytics.server'

export type FeedQueryParams = {
	scope?: 'global' | 'space' | 'group'
	space?: string
	group?: string
	page?: number
	perPage?: number
	sort?: 'new' | 'top'
	q?: string
}

type EmitOptions = {
	status: 'success' | 'error'
	durationMs: number
	params: FeedQueryParams
	items?: number
	totalPages?: number
}

async function emitEvent(pb: PocketBase, options: EmitOptions) {
	if (!config.analytics.enabled) return
	try {
		await recordAnalyticsEvents(pb, [
			{
				type: 'event',
				name: 'feed_load',
				sessionId: 'feed-performance-server',
				value: options.durationMs,
				metadata: {
					status: options.status,
					scope: options.params.scope ?? 'global',
					sort: options.params.sort ?? 'new',
					page: options.params.page ?? 1,
					perPage: options.params.perPage ?? 20,
					hasQuery: Boolean(options.params.q && options.params.q.length > 0),
					items: options.items,
					totalPages: options.totalPages
				}
			}
		])
	} catch (error) {
		console.warn('[analytics] failed to emit feed_load event', error)
	}
}

export async function trackFeedPerformance<T>(
	pb: PocketBase,
	params: FeedQueryParams,
	executor: () => Promise<T & { items?: unknown[]; totalPages?: number }>
) {
	const start = performance.now()
	try {
		const result = await executor()
		await emitEvent(pb, {
			status: 'success',
			durationMs: Math.round(performance.now() - start),
			params,
			items: Array.isArray(result?.items) ? result.items.length : undefined,
			totalPages: typeof result?.totalPages === 'number' ? result.totalPages : undefined
		})
		return result
	} catch (error) {
		await emitEvent(pb, {
			status: 'error',
			durationMs: Math.round(performance.now() - start),
			params
		})
		throw error
	}
}
