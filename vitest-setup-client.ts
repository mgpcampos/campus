/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

// Axe-core injection for accessibility tests
import 'axe-core/axe.min.js';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { writable } from 'svelte/store';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Global env mock for tests referencing PocketBase URL
vi.mock('$env/static/public', () => ({ PUBLIC_POCKETBASE_URL: 'http://127.0.0.1:8090' }));

// Global mock for $lib/pocketbase.js used by notification client & services
vi.mock('$lib/pocketbase.js', () => {
	const currentUser = writable({ id: 'test-user', name: 'Test User', username: 'testuser' });
	const pb = {
		collection: () => ({
			getList: async () => ({ items: [] }),
			subscribe: async (_topic: string, _callback: (e: unknown) => void) => () => {},
			unsubscribe: () => {},
			update: async () => ({}),
			create: async () => ({}),
			getFirstListItem: async () => ({ id: 'u-mention' })
		})
	};
	return { pb, currentUser };
});
