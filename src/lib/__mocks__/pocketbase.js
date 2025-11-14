import { writable } from 'svelte/store'

export const currentUser = writable({ id: 'test-user', name: 'Test User', username: 'testuser' })

// Minimal mock of PocketBase client with collections returning noop methods
export const pb = {
	collection: () => ({
		getList: async () => ({ items: [] }),
		/** @param {string} _topic @param {(event: unknown) => void} _callback */
		subscribe: async (_topic, _callback) => {
			void _topic
			void _callback
			return () => undefined
		},
		unsubscribe: () => undefined,
		update: async () => ({}),
		create: async () => ({}),
		getFirstListItem: async () => ({ id: 'u-mention' })
	})
}
