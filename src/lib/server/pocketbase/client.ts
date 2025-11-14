import type { RequestEvent } from '@sveltejs/kit'
import PocketBase from 'pocketbase'
import { dev } from '$app/environment'
import { env as privateEnv } from '$env/dynamic/private'
import { PUBLIC_POCKETBASE_URL } from '$env/static/public'

const DEFAULT_PB_URL = dev ? 'http://127.0.0.1:8090' : 'https://pb-campus-production.example.com'

export const getPocketBaseUrl = () =>
	privateEnv.PB_INTERNAL_URL || PUBLIC_POCKETBASE_URL || DEFAULT_PB_URL

export const getAuthCookieOptions = (pathname?: string, secureOverride?: boolean) => {
	const securityCritical = pathname?.startsWith('/auth') || pathname?.startsWith('/api/auth')
	const sameSite = securityCritical ? 'strict' : 'lax'
	const defaultSecure = dev ? false : true
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
