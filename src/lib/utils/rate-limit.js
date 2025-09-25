// Simple in-memory token bucket rate limiter (NOT for multi-instance production)
// Exports kept intentionally small & framework-agnostic for ease of testing.
const buckets = new Map();
export const RATE_LIMIT_WINDOW_MS = 60_000; // 60s window
export const RATE_LIMIT_TOKENS = 30; // 30 requests per window

/**
 * Consume a single token for an identifier (e.g., IP address).
 * Returns true if the request is allowed, false if rate limited.
 * Algorithm: token bucket with lazy refill proportional to elapsed time.
 * @param {string} ip
 * @returns {boolean}
 */
export function rateLimit(ip) {
	const now = Date.now();
	let bucket = buckets.get(ip);
	if (!bucket) {
		bucket = { tokens: RATE_LIMIT_TOKENS, lastRefill: now };
		buckets.set(ip, bucket);
	}

	const elapsed = now - bucket.lastRefill;
	if (elapsed > 0) {
		const refill = Math.floor((elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_TOKENS);
		if (refill > 0) {
			bucket.tokens = Math.min(RATE_LIMIT_TOKENS, bucket.tokens + refill);
			bucket.lastRefill = now;
		}
	}

	if (bucket.tokens <= 0) return false;
	bucket.tokens -= 1;
	return true;
}

// For tests or diagnostics (not exported publicly). Could add reset if needed.
