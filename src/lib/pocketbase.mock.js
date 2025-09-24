// Test mock for $lib/pocketbase.js to avoid real network and env dependency
import { writable } from 'svelte/store';
export const currentUser = writable({ id: 'u-test', name: 'Test User', username: 'testuser' });
