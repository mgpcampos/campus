import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { RequestEvent } from '@sveltejs/kit';

const DEFAULT_PB_URL = dev ? 'http://127.0.0.1:8090' : 'https://pb-campus-production.example.com';

export const getPocketBaseUrl = () =>
	privateEnv.PB_INTERNAL_URL || PUBLIC_POCKETBASE_URL || DEFAULT_PB_URL;

export const getAuthCookieOptions = (pathname?: string, secureOverride?: boolean) => {
	const securityCritical = pathname?.startsWith('/auth') || pathname?.startsWith('/api/auth');
	const sameSite = securityCritical ? 'strict' : 'lax';
	const secure = secureOverride !== undefined ? secureOverride : !dev;

	return {
		secure,
		httpOnly: true,
		sameSite,
		path: '/',
		maxAge: 60 * 60 * 24 * 7
	} as const;
};

export const createPocketBaseClient = (event: RequestEvent) => {
	const pb = new PocketBase(getPocketBaseUrl());

	pb.authStore.loadFromCookie(event.request.headers.get('cookie') ?? '');
	pb.autoCancellation(false);

	const syncAuthToLocals = () => {
		const { authStore } = pb;
		event.locals.user = authStore.model ?? null;
		event.locals.sessionToken = authStore.isValid ? (authStore.token ?? null) : null;
	};

	return { pb, syncAuthToLocals };
};

export const exportAuthCookie = (
	pb: PocketBase,
	options?: { pathname?: string; secure?: boolean }
) =>
	pb.authStore.exportToCookie({
		...getAuthCookieOptions(options?.pathname, options?.secure)
	});
