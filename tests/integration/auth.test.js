import { beforeEach, describe, expect, it } from 'vitest'
import { getCurrentUser, isAuthenticated, requireAuth } from '$lib/auth.js'

describe('Authentication Integration', () => {
	/** @type {any} */
	let mockLocals

	beforeEach(() => {
		mockLocals = {
			pb: {
				authStore: {
					isValid: false,
					model: null
				}
			}
		}
	})

	describe('requireAuth', () => {
		it('should return user when authenticated', () => {
			const user = { id: 'user123', email: 'test@example.com' }
			mockLocals.pb.authStore.isValid = true
			mockLocals.pb.authStore.model = user

			const result = requireAuth(mockLocals)
			expect(result).toEqual(user)
		})

		it('should redirect to login when not authenticated', () => {
			mockLocals.pb.authStore.isValid = false

			expect(() => requireAuth(mockLocals)).toThrow()
		})

		it('should include return URL in redirect when provided', () => {
			mockLocals.pb.authStore.isValid = false
			const returnUrl = '/protected-page'

			try {
				requireAuth(mockLocals, returnUrl)
			} catch (/** @type {any} */ error) {
				// Check if redirect contains return URL
				expect(error.location).toContain('returnUrl=')
			}
		})
	})

	describe('isAuthenticated', () => {
		it('should return true when user is authenticated', () => {
			mockLocals.pb.authStore.isValid = true
			expect(isAuthenticated(mockLocals)).toBe(true)
		})

		it('should return false when user is not authenticated', () => {
			mockLocals.pb.authStore.isValid = false
			expect(isAuthenticated(mockLocals)).toBe(false)
		})
	})

	describe('getCurrentUser', () => {
		it('should return user when authenticated', () => {
			const user = { id: 'user123', email: 'test@example.com' }
			mockLocals.pb.authStore.isValid = true
			mockLocals.pb.authStore.model = user

			expect(getCurrentUser(mockLocals)).toEqual(user)
		})

		it('should return null when not authenticated', () => {
			mockLocals.pb.authStore.isValid = false
			mockLocals.pb.authStore.model = null

			expect(getCurrentUser(mockLocals)).toBeNull()
		})
	})
})
