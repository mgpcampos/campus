import { describe, it, expect } from 'vitest';
import { rateLimit, RATE_LIMIT_TOKENS } from './rate-limit';

describe('rateLimit util', () => {
	it('enforces token bucket', () => {
		const ip = 'test-ip-1';
		let allowed = 0;
		for (let i = 0; i < RATE_LIMIT_TOKENS + 5; i++) {
			if (rateLimit(ip)) allowed++;
		}
		expect(allowed).toBeLessThanOrEqual(RATE_LIMIT_TOKENS);
	});
});
