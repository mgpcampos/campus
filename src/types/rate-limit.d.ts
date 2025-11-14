declare module '$lib/utils/rate-limit.js' {
	export const RATE_LIMIT_WINDOW_MS: number
	export const RATE_LIMIT_TOKENS: number
	export function rateLimit(ip: string): boolean
	export function __resetRateLimit(): void
	export function __rateLimitStats(): {
		bucketCount: number
	}
}

declare module '$lib/utils/rate-limit' {
	export * from '$lib/utils/rate-limit.js'
}
