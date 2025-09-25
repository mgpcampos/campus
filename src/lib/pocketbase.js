import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Single PocketBase instance for client runtime only. On server we always use event.locals.pb
export const pb = new PocketBase(PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Writable store tracking current authenticated user model
export const currentUser = writable(pb.authStore.model);

if (browser) {
	// We intentionally do NOT loadFromCookie here because cookie is httpOnly;
	// Instead, server layout load passes current user via data and layout sets store.
	// This avoids exposing the raw token to JS and keeps SSR->CSR hydration consistent.
	pb.authStore.onChange(() => {
		currentUser.set(pb.authStore.model);
	});
}
