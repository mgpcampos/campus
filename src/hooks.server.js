import PocketBase from 'pocketbase'
import { dev } from '$app/environment'
import { env as privateEnv } from '$env/dynamic/private'
import { PUBLIC_POCKETBASE_URL } from '$env/static/public'
import { rateLimit } from '$lib/utils/rate-limit.js'

function cookieOptions(pathname) {
	const securityCritical =
		pathname && (pathname.startsWith('/auth') || pathname.startsWith('/api/auth'))
	const sameSite = securityCritical ? 'strict' : 'lax'
	return {
		secure: !dev,
		httpOnly: true,
		sameSite,
		path: '/',
		maxAge: 60 * 60 * 24 * 7
	}
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const baseUrl = privateEnv.PB_INTERNAL_URL || PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
	event.locals.pb = new PocketBase(baseUrl)
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '')

	const syncLocalsAuth = () => {
		const { authStore } = event.locals.pb
		event.locals.user = authStore.model || null
		event.locals.sessionToken = authStore.isValid ? (authStore.token ?? null) : null
	}

	syncLocalsAuth()

	try {
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh()
		}
		syncLocalsAuth()
	} catch (/** @type {any} */ _) {
		event.locals.pb.authStore.clear()
		syncLocalsAuth()
	}

	const method = event.request.method.toUpperCase()
	const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
	if (isWrite && event.url.pathname.startsWith('/api')) {
		const ip =
			event.getClientAddress?.() || event.request.headers.get('x-forwarded-for') || 'unknown'
		if (!rateLimit(ip)) {
			return new Response('Too Many Requests', {
				status: 429,
				headers: { 'Retry-After': '60' }
			})
		}
	}

	const response = await resolve(event)
	syncLocalsAuth()

	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			...cookieOptions(event.url.pathname)
		})
	)

	return response
}
