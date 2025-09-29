import { beforeEach, describe, expect, it } from 'vitest';
import { rateLimit, __resetRateLimit, RATE_LIMIT_TOKENS } from '$lib/utils/rate-limit.js';

describe('rateLimit (hooks server duplicate)', () => {
	beforeEach(() => {
		__resetRateLimit();
	});

	it('allows initial bursts within token limit and then blocks', () => {
		const ip = '127.0.0.1-test';
		let allowed = 0;
		for (let i = 0; i < 35; i++) {
			if (rateLimit(ip)) allowed++;
		}
		// Should allow up to 30 tokens
		expect(allowed).toBeGreaterThanOrEqual(RATE_LIMIT_TOKENS - 2);
		expect(allowed).toBeLessThanOrEqual(RATE_LIMIT_TOKENS);
	});
});
