import { PUBLIC_POCKETBASE_URL } from '$env/static/public'

/**
 * Default PocketBase URL - Railway hosted instance.
 * Both local and remote frontends connect to the same backend for data consistency.
 */
const DEFAULT_POCKETBASE_URL = 'https://rede-campus.up.railway.app'

/**
 * Get the PocketBase URL based on the runtime environment.
 * 
 * Uses PUBLIC_POCKETBASE_URL environment variable if set, otherwise defaults to Railway instance.
 * This ensures both local development and production use the same PocketBase backend.
 */
const sanitizedPocketBaseUrl = (() => {
	// Use the public env variable if set, otherwise default to Railway instance
	const configuredUrl = PUBLIC_POCKETBASE_URL || DEFAULT_POCKETBASE_URL
	
	let parsed
	try {
		parsed = new URL(configuredUrl)
	} catch (cause) {
		throw new Error(
			`PUBLIC_POCKETBASE_URL must be a valid absolute URL. Received: ${configuredUrl}`,
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
