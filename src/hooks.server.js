import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Create a new PocketBase instance for each request
	event.locals.pb = new PocketBase(PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');
	
	// Load auth state from cookies
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');
	
	// Try to refresh the auth if valid
	try {
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
		}
	} catch (_) {
		// Clear auth store on failed refresh
		event.locals.pb.authStore.clear();
	}
	
	const response = await resolve(event);
	
	// Send back the auth cookie to the client
	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			secure: false, // Set to true in production with HTTPS
			httpOnly: false,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 1 week
		})
	);
	
	return response;
}