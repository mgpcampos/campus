import { browser } from '$app/environment'

/**
 * Default PocketBase URL - Railway hosted instance.
 * Both local and remote frontends connect to the same backend for data consistency.
 */
const DEFAULT_POCKETBASE_URL = 'https://rede-campus.up.railway.app'

/**
 * Get the PocketBase URL.
 * 
 * By default, uses the Railway-hosted PocketBase instance for both local and production.
 * This ensures data consistency across all environments.
 * 
 * Server-side can override via POCKETBASE_URL environment variable if needed.
 */
const sanitizedPocketBaseUrl = (() => {
	let configuredUrl = DEFAULT_POCKETBASE_URL
	
	// Server-side: allow override via environment variable
	if (!browser && typeof process !== 'undefined' && process.env?.POCKETBASE_URL) {
		configuredUrl = process.env.POCKETBASE_URL
	}
	
	let parsed
	try {
		parsed = new URL(configuredUrl)
	} catch (cause) {
		throw new Error(
			`POCKETBASE_URL must be a valid absolute URL. Received: ${configuredUrl}`,
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
