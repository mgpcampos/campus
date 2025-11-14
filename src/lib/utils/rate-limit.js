// Simple in-memory token bucket rate limiter (NOT for multi-instance production)
// Exports kept intentionally small & framework-agnostic for ease of testing.
const buckets = new Map()
export const RATE_LIMIT_WINDOW_MS = 60_000 // 60s window
export const RATE_LIMIT_TOKENS = 30 // 30 requests per window

const REFILL_RATE = RATE_LIMIT_TOKENS / RATE_LIMIT_WINDOW_MS
const STALE_BUCKET_MS = RATE_LIMIT_WINDOW_MS * 3
const CLEANUP_INTERVAL_MS = RATE_LIMIT_WINDOW_MS

let lastCleanup = 0

function cleanupBuckets(now) {
	if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
	lastCleanup = now
	for (const [key, bucket] of buckets.entries()) {
		if (now - bucket.lastRefill > STALE_BUCKET_MS) {
			buckets.delete(key)
		}
	}
}

function getBucket(ip, now) {
	let bucket = buckets.get(ip)
	if (!bucket) {
		bucket = { tokens: RATE_LIMIT_TOKENS, lastRefill: now }
		buckets.set(ip, bucket)
	}
	return bucket
}

/**
 * Consume a single token for an identifier (e.g., IP address).
 * Returns true if the request is allowed, false if rate limited.
 * Algorithm: token bucket with lazy refill proportional to elapsed time.
 * @param {string} ip
 * @returns {boolean}
 */
export function rateLimit(ip) {
	const now = Date.now()
	cleanupBuckets(now)

	const bucket = getBucket(ip, now)
	const elapsed = now - bucket.lastRefill
	if (elapsed > 0) {
		const refill = elapsed * REFILL_RATE
		if (refill > 0) {
			bucket.tokens = Math.min(RATE_LIMIT_TOKENS, bucket.tokens + refill)
			bucket.lastRefill = now
		}
	}

	if (bucket.tokens < 1) return false
	bucket.tokens -= 1
	return true
}

/**
 * Reset internal state – intended for tests only.
 */
export function __resetRateLimit() {
	buckets.clear()
	lastCleanup = 0
}

/**
 * Expose internals for white-box diagnostics in tests.
 * @returns {{ bucketCount: number }}
 */
export function __rateLimitStats() {
	return { bucketCount: buckets.size }
}
