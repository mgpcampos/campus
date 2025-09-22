import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import { writable } from 'svelte/store';

// Create the PocketBase client instance
export const pb = new PocketBase(PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Create a writable store for the current user
export const currentUser = writable(pb.authStore.model);

// Update the store when auth state changes
pb.authStore.onChange((auth) => {
	currentUser.set(pb.authStore.model);
});