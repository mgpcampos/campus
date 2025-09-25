import PocketBase from 'pocketbase';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { dev } from '$app/environment';
import { rateLimit } from '$lib/utils/rate-limit.js';

// Rate limiter now imported from shared util.

// Helper to build secure cookie export options
function cookieOptions(pathname?: string) {
	const securityCritical =
		pathname && (pathname.startsWith('/auth') || pathname.startsWith('/api/auth'));
	/** @type {'lax' | 'strict'} */
	const sameSite = securityCritical ? 'strict' : 'lax';
	return {
		secure: !dev,
		httpOnly: true,
		sameSite,
		path: '/',
		maxAge: 60 * 60 * 24 * 7
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	// Per-request PocketBase instance
	const baseUrl = PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
	event.locals.pb = new PocketBase(baseUrl);

	// Load auth from incoming cookies
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	// Attempt silent refresh if token still valid
	try {
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
		}
	} catch {
		// Clear invalid auth (token expired, revoked, etc.)
		event.locals.pb.authStore.clear();
	}

	// Apply rate limiting to mutating requests under /api (POST/PUT/PATCH/DELETE)
	const method = event.request.method.toUpperCase();
	const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
	if (isWrite && event.url.pathname.startsWith('/api')) {
		const ip =
			event.getClientAddress?.() || event.request.headers.get('x-forwarded-for') || 'unknown';
		if (!rateLimit(ip)) {
			return new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
		}
	}

	const response = await resolve(event);

	// Always re-export cookie so client stays in sync; httpOnly to mitigate XSS
	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			...cookieOptions(event.url.pathname)
		})
	);

	return response;
};
