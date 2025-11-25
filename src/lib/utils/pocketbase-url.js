import { browser } from '$app/environment'

/**
 * Get the PocketBase URL based on the runtime environment.
 * 
 * - Browser: Always uses same-origin (window.location.origin) since Caddy proxies /api/* to PocketBase
 * - Server: Uses INTERNAL_POCKETBASE_URL env var (defaults to http://127.0.0.1:8090)
 */
const sanitizedPocketBaseUrl = (() => {
	// In browser, always use same-origin since Caddy proxies /api/* to PocketBase
	if (browser) {
		return window.location.origin
	}
	
	// Server-side: use internal URL for direct communication with PocketBase
	// This is set in docker-entrypoint.sh and defaults to localhost:8090
	const internalUrl = process.env.INTERNAL_POCKETBASE_URL || 'http://127.0.0.1:8090'
	
	let parsed
	try {
		parsed = new URL(internalUrl)
	} catch (cause) {
		throw new Error(
			`INTERNAL_POCKETBASE_URL must be a valid absolute URL. Received: ${internalUrl}`,
			{ cause }
		)
	}

	return parsed.toString().replace(/\/$/, '')
})()

/** @type {string} */
export const pocketBaseUrl = sanitizedPocketBaseUrl

export function getPocketBaseUrl() {
	return pocketBaseUrl
}
