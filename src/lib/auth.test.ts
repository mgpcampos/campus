import { describe, it, expect, vi } from 'vitest';
import { requireAuth, isAuthenticated, getCurrentUser } from './auth.js';

// Mock SvelteKit redirect
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status: number, location: string) => {
		const error = new Error(`Redirect to ${location}`) as any;
		error.status = status;
		throw error;
	})
}));

// Helper function to create mock locals with proper typing
function createMockLocals(authStore: any) {
	return {
		pb: {
			authStore
		}
	} as any;
}

describe('requireAuth', () => {
	it('should return user when authenticated', () => {
		const mockUser = { id: '1', name: 'Test User' };
		const locals = createMockLocals({
			isValid: true,
			model: mockUser
		});

		const result = requireAuth(locals);
		expect(result).toBe(mockUser);
	});

	it('should redirect to login when not authenticated', () => {
		const locals = createMockLocals({
			isValid: false,
			model: null
		});

		expect(() => requireAuth(locals)).toThrow('Redirect to /auth/login');
	});

	it('should redirect to login with return URL when provided', () => {
		const locals = createMockLocals({
			isValid: false,
			model: null
		});

		expect(() => requireAuth(locals, '/profile')).toThrow(
			'Redirect to /auth/login?returnUrl=%2Fprofile'
		);
	});
});

describe('isAuthenticated', () => {
	it('should return true when authenticated', () => {
		const locals = createMockLocals({
			isValid: true
		});

		expect(isAuthenticated(locals)).toBe(true);
	});

	it('should return false when not authenticated', () => {
		const locals = createMockLocals({
			isValid: false
		});

		expect(isAuthenticated(locals)).toBe(false);
	});
});

describe('getCurrentUser', () => {
	it('should return user when authenticated', () => {
		const mockUser = { id: '1', name: 'Test User' };
		const locals = createMockLocals({
			isValid: true,
			model: mockUser
		});

		expect(getCurrentUser(locals)).toBe(mockUser);
	});

	it('should return null when not authenticated', () => {
		const locals = createMockLocals({
			isValid: false,
			model: null
		});

		expect(getCurrentUser(locals)).toBe(null);
	});
});
