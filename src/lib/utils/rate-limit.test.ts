import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	__rateLimitStats,
	__resetRateLimit,
	RATE_LIMIT_TOKENS,
	RATE_LIMIT_WINDOW_MS,
	rateLimit
} from '$lib/utils/rate-limit.js'

beforeEach(() => {
	__resetRateLimit()
})

afterEach(() => {
	vi.useRealTimers()
})

describe('rateLimit util', () => {
	it('enforces token bucket', () => {
		const ip = 'test-ip-1'
		let allowed = 0
		for (let i = 0; i < RATE_LIMIT_TOKENS + 5; i++) {
			if (rateLimit(ip)) allowed++
		}
		expect(allowed).toBeLessThanOrEqual(RATE_LIMIT_TOKENS)
	})

	it('cleans up stale buckets to avoid memory leaks', () => {
		vi.useFakeTimers()
		const staleIp = 'stale-ip'
		rateLimit(staleIp)
		expect(__rateLimitStats().bucketCount).toBe(1)

		// Advance time beyond stale threshold and trigger cleanup via another call.
		vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS * 4)
		rateLimit('new-ip')
		expect(__rateLimitStats().bucketCount).toBe(1)
	})
})
