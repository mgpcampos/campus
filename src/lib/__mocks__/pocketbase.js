import { writable } from 'svelte/store';

export const currentUser = writable({ id: 'test-user', name: 'Test User', username: 'testuser' });

// Minimal mock of PocketBase client with collections returning noop methods
export const pb = {
  collection: () => ({
    getList: async () => ({ items: [] }),
  /** @param {string} __t @param {(e:any)=>void} __cb */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subscribe: async (__t, __cb) => () => {},
    unsubscribe: () => {},
    update: async () => ({}),
    create: async () => ({}),
    getFirstListItem: async () => ({ id: 'u-mention' })
  })
};
