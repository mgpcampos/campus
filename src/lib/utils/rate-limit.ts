interface Bucket {
	tokens: number;
	lastRefill: number;
}
const buckets = new Map<string, Bucket>();
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_TOKENS = 30;

export function rateLimit(ip: string): boolean {
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
