import type { Handle } from '@sveltejs/kit'
import { createPocketBaseClient, exportAuthCookie } from '$lib/server/pocketbase/client'
import { rateLimit } from '$lib/utils/rate-limit.js'

export const handle: Handle = async ({ event, resolve }) => {
	// Per-request PocketBase instance via helper
	const { pb, syncAuthToLocals } = createPocketBaseClient(event)
	event.locals.pb = pb

	syncAuthToLocals()
	const initialState = {
		token: pb.authStore.token ?? null,
		modelId: pb.authStore.model?.id ?? null,
		isValid: pb.authStore.isValid
	}

	// Attempt silent refresh if token still valid
	try {
		if (pb.authStore.isValid) {
			await pb.collection('users').authRefresh()
		}
		// Refresh may update auth data (e.g., rotated token)
		syncAuthToLocals()
	} catch {
		// Clear invalid auth (token expired, revoked, etc.)
		pb.authStore.clear()
		syncAuthToLocals()
	}

	// Apply rate limiting to mutating requests under /api (POST/PUT/PATCH/DELETE)
	const method = event.request.method.toUpperCase()
	const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
	if (isWrite && event.url.pathname.startsWith('/api')) {
		const ip =
			event.getClientAddress?.() || event.request.headers.get('x-forwarded-for') || 'unknown'
		if (!rateLimit(ip)) {
			return new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } })
		}
	}

	const response = await resolve(event)

	// Auth state might have changed during the request lifecycle (e.g., login/logout)
	syncAuthToLocals()

	// Only emit cookie when auth state changed to avoid noisy/expired Set-Cookie headers
	const finalState = {
		token: pb.authStore.token ?? null,
		modelId: pb.authStore.model?.id ?? null,
		isValid: pb.authStore.isValid
	}

	const authChanged =
		initialState.token !== finalState.token ||
		initialState.modelId !== finalState.modelId ||
		initialState.isValid !== finalState.isValid

	if (authChanged) {
		const secure = event.url.protocol === 'https:'
		response.headers.append(
			'set-cookie',
			exportAuthCookie(pb, {
				pathname: event.url.pathname,
				secure
			})
		)
	}

	return response
}
