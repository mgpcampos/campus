import { env } from '$env/dynamic/public'
import { browser } from '$app/environment'

const sanitizedPocketBaseUrl = (() => {
	const rawValue = env.PUBLIC_POCKETBASE_URL?.trim()
	
	// In browser, if no URL is set, use the current origin (same-origin setup)
	if (!rawValue) {
		if (browser) {
			return window.location.origin
		}
		throw new Error(
			'PUBLIC_POCKETBASE_URL is not defined. Set it in your environment to point at the PocketBase service.'
		)
	}

	let parsed
	try {
		parsed = new URL(rawValue)
	} catch (cause) {
		throw new Error(
			`PUBLIC_POCKETBASE_URL must be a valid absolute URL (including protocol and optional port). Received: ${rawValue}`,
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
