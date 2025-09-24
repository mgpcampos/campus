// Test mock for $lib/pocketbase.js to avoid real network and env dependency
import { writable } from 'svelte/store';
export const currentUser = writable({ id: 'u-test', name: 'Test User', username: 'testuser' });

export const pb = {
	collection: () => ({
		getList: async () => ({ items: [] }),
		subscribe: async () => () => {},
		unsubscribe: () => {},
		update: async () => ({}),
		create: async () => ({}),
		getFirstListItem: async () => ({ id: 'u-mention' })
	})
};
