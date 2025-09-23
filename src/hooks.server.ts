import PocketBase from 'pocketbase';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { dev } from '$app/environment';

// Helper to build secure cookie export options
function cookieOptions() {
  return {
    secure: !dev, // only secure in production (HTTPS)
    httpOnly: true,
    sameSite: 'lax' as const,
    // 1 week session; adjust later when implementing refresh/remember-me toggles
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

  const response = await resolve(event);

  // Always re-export cookie so client stays in sync; httpOnly to mitigate XSS
  response.headers.append(
    'set-cookie',
    event.locals.pb.authStore.exportToCookie({
      ...cookieOptions()
    })
  );

  return response;
};
