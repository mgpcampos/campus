import { get, writable } from 'svelte/store'
import { pb } from '../pocketbase.js'

/** @type {import('svelte/store').Writable<any[]>} */
export const feedPosts = writable([]) // array of post records
/** @type {import('svelte/store').Writable<{scope:string; space:string|null; group:string|null}>} */
export const feedContext = writable({ scope: 'global', space: null, group: null })
/** @type {import('svelte/store').Writable<{connected:boolean; lastEvent:number}>} */
export const realtimeStatus = writable({
	connected: Boolean(pb.realtime.isConnected),
	lastEvent: Date.now()
})

/** @type {null | (()=>void)} */
let postsUnsub = null
let realtimeEventsSetup = false

async function ensureRealtimeEvents() {
	if (realtimeEventsSetup) return
	realtimeEventsSetup = true

	const previousOnDisconnect = pb.realtime.onDisconnect
	pb.realtime.onDisconnect = (activeSubscriptions) => {
		if (typeof previousOnDisconnect === 'function') {
			try {
				previousOnDisconnect(activeSubscriptions)
			} catch {
				/* ignore chained disconnect handler error */
			}
		}
		realtimeStatus.update((status) => ({ ...status, connected: false }))
	}

	try {
		await pb.realtime.subscribe('PB_CONNECT', () => {
			realtimeStatus.update((status) => ({
				...status,
				connected: true,
				lastEvent: Date.now()
			}))
		})
	} catch (error) {
		console.warn('Failed to subscribe to PB_CONNECT', error)
	}

	realtimeStatus.update((status) => ({ ...status, connected: Boolean(pb.realtime.isConnected) }))
}

/**
 * @param {any} record
 * @param {{scope:string; space:string|null; group:string|null}} ctx
 */
function matchesContext(record, ctx) {
	if (ctx.scope === 'global') return record.scope === 'global'
	if (ctx.scope === 'space') return record.scope === 'space' && record.space === ctx.space
	if (ctx.scope === 'group') return record.scope === 'group' && record.group === ctx.group
	return false
}

/**
 * @param {{scope:string; space:string|null; group:string|null}} ctx
 */
export async function subscribeFeed(ctx) {
	feedContext.set(ctx)
	await unsubscribeFeed()
	await ensureRealtimeEvents()
	postsUnsub = await pb.collection('posts').subscribe('*', (e) => {
		realtimeStatus.update((s) => ({
			...s,
			lastEvent: Date.now(),
			connected: Boolean(pb.realtime.isConnected)
		}))
		const current = /** @type {any[]} */ (get(feedPosts))
		if (!matchesContext(e.record, ctx)) return
		if (e.action === 'create') {
			feedPosts.set([e.record, ...current])
		} else if (e.action === 'update') {
			feedPosts.set(current.map((p) => (p.id === e.record.id ? { ...p, ...e.record } : p)))
		} else if (e.action === 'delete') {
			feedPosts.set(current.filter((p) => p.id !== e.record.id))
		}
	})
	return postsUnsub
}

export async function unsubscribeFeed() {
	if (postsUnsub) {
		try {
			postsUnsub()
		} catch {
			/* ignore unsubscribe error */
		}
		try {
			pb.collection('posts').unsubscribe('*')
		} catch {
			/* ignore collection unsubscribe error */
		}
		postsUnsub = null
	}
}

// Simple polling fallback when disconnected
/** @type {null | ReturnType<typeof setInterval>} */
let pollInterval = null
/**
 * @param {() => Promise<void>} fetchFn
 */
export function enablePolling(fetchFn) {
	disablePolling()
	pollInterval = setInterval(async () => {
		const status = get(realtimeStatus)
		if (status.connected) return // skip if reconnected
		try {
			await fetchFn()
		} catch {
			/* polling fetch failed, ignore */
		}
	}, 15000)
}
export function disablePolling() {
	if (pollInterval) clearInterval(pollInterval)
	pollInterval = null
}

// Notifications subscription will live elsewhere
