// Type extensions for jest-dom matchers
declare module 'vitest' {
	interface Assertion<T> {
		toBeInTheDocument(): T;
		toHaveAccessibleName(name?: string | RegExp): T;
		// Add other jest-dom matchers as needed
	}
}

// Axe-core injection for accessibility tests
import 'axe-core/axe.min.js';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
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
}

// Mock IntersectionObserver
if (!('IntersectionObserver' in globalThis)) {
	// @ts-ignore - assigning to global for test env
	globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn()
	}));
}

// Mock ResizeObserver
if (!('ResizeObserver' in globalThis)) {
	// @ts-ignore - assigning to global for test env
	globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn()
	}));
}

// Global env mock for tests referencing PocketBase URL
vi.mock('$env/static/public', () => ({ PUBLIC_POCKETBASE_URL: 'http://127.0.0.1:8090' }));

// Global mock for $lib/pocketbase.js used by notification client & services
vi.mock('$lib/pocketbase.js', async () => {
	return await import('./src/lib/pocketbase.mock.js');
});
