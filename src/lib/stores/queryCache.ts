import { type Readable, readable, writable } from 'svelte/store'

interface CacheRecord<T> {
	data: T
	updated: number
	promise?: Promise<T>
	ttlMs: number
}
interface Options<T> {
	ttlMs?: number
	revalidate?: boolean
	fetcher: () => Promise<T>
}

const cache = new Map<string, CacheRecord<any>>()

export function useQuery<T>(
	key: string,
	opts: Options<T>
): Readable<{ data: T | null; loading: boolean; error: any }> {
	const { ttlMs = 15_000, fetcher, revalidate = true } = opts
	const state = writable<{ data: T | null; loading: boolean; error: any }>({
		data: null,
		loading: true,
		error: null
	})

	async function load(force = false) {
		const rec = cache.get(key) as CacheRecord<T> | undefined
		const now = Date.now()
		const isStale = !rec || rec.updated + rec.ttlMs < now
		if (!rec || force || (revalidate && isStale)) {
			const promise = fetcher()
				.then((d) => {
					cache.set(key, { data: d, updated: Date.now(), ttlMs, promise: undefined })
					state.set({ data: d, loading: false, error: null })
					return d
				})
				.catch((e) => {
					if (rec) state.set({ data: rec.data, loading: false, error: e })
					else state.set({ data: null, loading: false, error: e })
					return Promise.reject(e)
				})
			cache.set(key, { data: rec?.data ?? null, updated: rec?.updated ?? 0, ttlMs, promise })
			state.set({ data: rec?.data ?? null, loading: true, error: null })
			try {
				await promise
			} catch {}
		} else {
			state.set({ data: rec.data, loading: false, error: null })
		}
	}

	load()

	return readable<{ data: T | null; loading: boolean; error: any }>(undefined, (set) => {
		const unsub = state.subscribe(set)
		return () => unsub()
	})
}

export function invalidateQuery(key: string) {
	cache.delete(key)
}

export function querySnapshot() {
	return Array.from(cache.entries()).map(([k, v]) => ({
		key: k,
		ageMs: Date.now() - v.updated,
		ttlMs: v.ttlMs
	}))
}
