import { vi } from 'vitest';

// Mock the PocketBase client for integration tests
class MockPocketBase {
	constructor() {
		this.authStore = {
			model: null,
			token: '',
			isValid: false,
			clear: vi.fn(),
			save: vi.fn()
		};
		this.collections = new Map();
		this._setupMockCollections();
	}

	_setupMockCollections() {
		// Mock users collection
		this.collections.set('users', {
			create: vi.fn(),
			getFirstListItem: vi.fn(),
			authWithPassword: vi.fn(),
			requestPasswordReset: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		});

		// Mock posts collection
		this.collections.set('posts', {
			create: vi.fn(),
			getList: vi.fn(),
			getOne: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		});

		// Mock spaces collection
		this.collections.set('spaces', {
			create: vi.fn(),
			getList: vi.fn(),
			getFirstListItem: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		});

		// Mock likes collection
		this.collections.set('likes', {
			create: vi.fn(),
			getFirstListItem: vi.fn(),
			delete: vi.fn()
		});

		// Mock comments collection
		this.collections.set('comments', {
			create: vi.fn(),
			getList: vi.fn(),
			delete: vi.fn()
		});
	}

	/**
	 * @param {any} name
	 */
	collection(name) {
		return this.collections.get(name);
	}

	// Add helper methods for test setup
	/**
	 * @param {any} userData
	 */
	mockUser(userData) {
		this.authStore.model = userData;
		this.authStore.isValid = true;
		this.authStore.token = 'mock-token';
		return userData;
	}

	clearAuth() {
		this.authStore.model = null;
		this.authStore.isValid = false;
		this.authStore.token = '';
	}
}

// Mock the global PocketBase instance
vi.mock('$lib/pocketbase.js', () => {
	const mockPb = new MockPocketBase();
	return {
		default: mockPb,
		pb: mockPb,
		currentUser: { subscribe: vi.fn() }
	};
});

export { MockPocketBase };
