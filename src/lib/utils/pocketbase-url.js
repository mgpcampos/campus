import { PUBLIC_POCKETBASE_URL } from '$env/static/public'

const sanitizedPocketBaseUrl = (() => {
	const rawValue = PUBLIC_POCKETBASE_URL?.trim()
	if (!rawValue) {
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
