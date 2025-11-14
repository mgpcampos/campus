import { describe, expect, it, vi } from 'vitest'
import { getCurrentUser, isAuthenticated, requireAuth } from './auth.js'

class RedirectError extends Error {
	status: number
	location: string

	constructor(status: number, location: string) {
		super(`Redirect to ${location}`)
		this.name = 'RedirectError'
		this.status = status
		this.location = location
	}
}

// Mock SvelteKit redirect
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status: number, location: string) => {
		throw new RedirectError(status, location)
	})
}))

type MockAuthStore = {
	isValid: boolean
	model?: unknown
}

// Helper function to create mock locals with proper typing
function createMockLocals(authStore: MockAuthStore) {
	return {
		pb: {
			authStore
		}
	} as unknown as App.Locals
}

describe('requireAuth', () => {
	it('should return user when authenticated', () => {
		const mockUser = { id: '1', name: 'Test User' }
		const locals = createMockLocals({
			isValid: true,
			model: mockUser
		})

		const result = requireAuth(locals)
		expect(result).toBe(mockUser)
	})

	it('should redirect to login when not authenticated', () => {
		const locals = createMockLocals({
			isValid: false,
			model: null
		})

		expect(() => requireAuth(locals)).toThrow('Redirect to /auth/login')
	})

	it('should redirect to login with return URL when provided', () => {
		const locals = createMockLocals({
			isValid: false,
			model: null
		})

		expect(() => requireAuth(locals, '/profile')).toThrow(
			'Redirect to /auth/login?returnUrl=%2Fprofile'
		)
	})
})

describe('isAuthenticated', () => {
	it('should return true when authenticated', () => {
		const locals = createMockLocals({
			isValid: true
		})

		expect(isAuthenticated(locals)).toBe(true)
	})

	it('should return false when not authenticated', () => {
		const locals = createMockLocals({
			isValid: false
		})

		expect(isAuthenticated(locals)).toBe(false)
	})
})

describe('getCurrentUser', () => {
	it('should return user when authenticated', () => {
		const mockUser = { id: '1', name: 'Test User' }
		const locals = createMockLocals({
			isValid: true,
			model: mockUser
		})

		expect(getCurrentUser(locals)).toBe(mockUser)
	})

	it('should return null when not authenticated', () => {
		const locals = createMockLocals({
			isValid: false,
			model: null
		})

		expect(getCurrentUser(locals)).toBe(null)
	})
})
