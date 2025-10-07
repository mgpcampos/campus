import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { dev } from '$app/environment';
import type { RequestEvent } from '@sveltejs/kit';

const DEFAULT_PB_URL = 'http://127.0.0.1:8090';

export const getPocketBaseUrl = () => PUBLIC_POCKETBASE_URL || DEFAULT_PB_URL;

export const getAuthCookieOptions = (pathname?: string) => {
	const securityCritical = pathname?.startsWith('/auth') || pathname?.startsWith('/api/auth');
	const sameSite = securityCritical ? 'strict' : 'lax';

	return {
		secure: !dev,
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

export const exportAuthCookie = (pb: PocketBase, pathname?: string) =>
	pb.authStore.exportToCookie({ ...getAuthCookieOptions(pathname) });
