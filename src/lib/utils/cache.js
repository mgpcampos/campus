// Simple in-memory LRU + TTL cache for server runtime only.
// Not suitable for multi-instance deployments; replace with Redis or external store when scaling horizontally.

class CacheEntry {
	/**
	 * @param {any} value
	 * @param {number|null} ttlMs
	 */
	constructor(value, ttlMs) {
		this.value = value;
		this.expiry = ttlMs ? Date.now() + ttlMs : null;
		this.hits = 0;
		this.created = Date.now();
	}
	isExpired() {
		return this.expiry !== null && Date.now() > this.expiry;
	}
}

export class LruTtlCache {
	/**
	 * @param {{max?:number, defaultTtlMs?:number, name?:string}} opts
	 */
	constructor(opts = {}) {
		this.max = opts.max || 500; // generous ceiling; adjust by memory profiling
		this.defaultTtlMs = opts.defaultTtlMs || 30_000; // 30s default unless overridden
		this.name = opts.name || 'default';
		this.map = new Map(); // key -> CacheEntry
		this.stats = { hits: 0, misses: 0, evictions: 0, sets: 0 };
	}

	/**
	 * @param {string} key
	 * @param {CacheEntry} entry
	 */
	_touch(key, entry) {
		// LRU: re-insert to end
		this.map.delete(key);
		this.map.set(key, entry);
	}

	/**
	 * @template T
	 * @param {string} key
	 * @returns {T | undefined}
	 */
	get(key) {
		const entry = this.map.get(key);
		if (!entry) {
			this.stats.misses++;
			return undefined;
		}
		if (entry.isExpired()) {
			this.map.delete(key);
			this.stats.misses++;
			return undefined;
		}
		entry.hits++;
		this.stats.hits++;
		this._touch(key, entry);
		return entry.value;
	}

	/**
	 * @template T
	 * @param {string} key
	 * @param {T} value
	 * @param {{ttlMs?:number}} [opts]
	 */
	set(key, value, opts = {}) {
		if (this.map.has(key)) {
			this.map.delete(key);
		}
		const ttlMs = opts.ttlMs ?? this.defaultTtlMs;
		const entry = new CacheEntry(value, ttlMs);
		this.map.set(key, entry);
		this.stats.sets++;
		if (this.map.size > this.max) {
			const firstKey = this.map.keys().next().value;
			if (firstKey !== undefined) {
				this.map.delete(firstKey);
				this.stats.evictions++;
			}
		}
		return value;
	}

	/**
	 * @param {string} key
	 */
	has(key) {
		return this.get(key) !== undefined;
	}

	/**
	 * @param {string} key
	 */
	delete(key) {
		return this.map.delete(key);
	}

	clear() {
		this.map.clear();
	}

	/** Remove all expired entries proactively */
	sweep() {
		const now = Date.now();
		for (const [key, entry] of this.map.entries()) {
			if (entry.expiry && now > entry.expiry) {
				this.map.delete(key);
			}
		}
	}

	snapshot() {
		return { ...this.stats, size: this.map.size };
	}
}

// Singleton caches for common data categories (server-only)
export const serverCaches = {
	lists: new LruTtlCache({ name: 'lists', max: 300, defaultTtlMs: 20_000 }),
	images: new LruTtlCache({ name: 'images', max: 200, defaultTtlMs: 60_000 })
};

/**
 * Helper to get or prime a cache in one call.
 * @template T
 * @param {LruTtlCache} cache
 * @param {string} key
 * @param {() => Promise<T>} factory
 * @param {{ttlMs?:number}} [opts]
 * @returns {Promise<T>}
 */
export async function getOrSet(cache, key, factory, opts = {}) {
	const existing = cache.get(key);
	if (existing !== undefined) return existing;
	const value = await factory();
	cache.set(key, value, opts);
	return value;
}
