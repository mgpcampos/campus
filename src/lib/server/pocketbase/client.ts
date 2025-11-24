import type { RequestEvent } from '@sveltejs/kit'
import PocketBase from 'pocketbase'
import { dev } from '$app/environment'
import { getPocketBaseUrl } from '$lib/utils/pocketbase-url.js'

export { getPocketBaseUrl }

export const getAuthCookieOptions = (pathname?: string, secureOverride?: boolean) => {
	const securityCritical = pathname?.startsWith('/auth') || pathname?.startsWith('/api/auth')
	const sameSite = securityCritical ? 'strict' : 'lax'
	const defaultSecure = !dev
	const secure = secureOverride ?? defaultSecure

	return {
		secure,
		httpOnly: true,
		sameSite,
		path: '/',
		maxAge: 60 * 60 * 24 * 7
	} as const
}

export const createPocketBaseClient = (event: RequestEvent) => {
	const pb = new PocketBase(getPocketBaseUrl())

	pb.authStore.loadFromCookie(event.request.headers.get('cookie') ?? '')
	pb.autoCancellation(false)

	const syncAuthToLocals = () => {
		const { authStore } = pb
		event.locals.user = authStore.model ?? null
		event.locals.sessionToken = authStore.isValid ? (authStore.token ?? null) : null
	}

	return { pb, syncAuthToLocals }
}

export const exportAuthCookie = (
	pb: PocketBase,
	options?: { pathname?: string; secure?: boolean }
) =>
	pb.authStore.exportToCookie({
		...getAuthCookieOptions(options?.pathname, options?.secure)
	})
