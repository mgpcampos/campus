import { expect, test } from '@playwright/test'
import { AuthHelpers } from './helpers'

test.describe('Authentication Flow', () => {
	let authHelpers: AuthHelpers

	test.beforeEach(async ({ page }) => {
		authHelpers = new AuthHelpers(page)
	})

	test('should register new user successfully', async ({ page }) => {
		const userData = {
			email: `test-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Test User',
			username: `testuser${Date.now()}`
		}

		await authHelpers.registerUser(userData)

		// Verify user is on home page and logged in
		expect(page.url()).toContain('/')
		expect(await authHelpers.isLoggedIn()).toBe(true)

		// Check for user profile elements
		await expect(page.locator('text="' + userData.name + '"')).toBeVisible()
	})

	test('should login existing user successfully', async ({ page }) => {
		// First register a user
		const userData = {
			email: `logintest-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Login Test User',
			username: `logintest${Date.now()}`
		}

		await authHelpers.registerUser(userData)
		await authHelpers.logout()

		// Now test login
		await authHelpers.loginUser(userData.email, userData.password)

		expect(page.url()).toContain('/')
		expect(await authHelpers.isLoggedIn()).toBe(true)
	})

	test('should show error for invalid login credentials', async ({ page }) => {
		await page.goto('/auth/login')
		await page.fill('input[name="email"]', 'invalid@example.com')
		await page.fill('input[name="password"]', 'wrongpassword')
		await page.click('button[type="submit"]')

		// Should show error message
		await expect(page.locator('text="Invalid credentials"')).toBeVisible({ timeout: 5000 })
		// Should still be on login page
		expect(page.url()).toContain('/auth/login')
	})

	test('should logout user successfully', async ({ page }) => {
		// Register and login user
		const userData = {
			email: `logouttest-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Logout Test User',
			username: `logouttest${Date.now()}`
		}

		await authHelpers.registerUser(userData)
		expect(await authHelpers.isLoggedIn()).toBe(true)

		// Logout
		await authHelpers.logout()

		// Verify user is logged out
		expect(await authHelpers.isLoggedIn()).toBe(false)

		// Check for login/register links
		await expect(page.locator('a:has-text("Login"), a:has-text("Sign in")')).toBeVisible()
	})

	test('should require authentication for protected routes', async ({ page }) => {
		// Try to access profile without being logged in
		await page.goto('/profile/edit')

		// Should redirect to login
		await page.waitForURL('**/auth/login**')
		expect(page.url()).toContain('/auth/login')
	})

	test('should validate registration form', async ({ page }) => {
		await page.goto('/auth/register')

		// Try submitting empty form
		await page.click('button[type="submit"]')

		// Should show validation errors
		await expect(page.locator('text="Email is required"')).toBeVisible()
		await expect(page.locator('text="Password is required"')).toBeVisible()

		// Test password mismatch
		await page.fill('input[name="email"]', 'test@example.com')
		await page.fill('input[name="password"]', 'password123')
		await page.fill('input[name="passwordConfirm"]', 'differentpassword')
		await page.click('button[type="submit"]')

		await expect(page.locator('text="Passwords do not match"')).toBeVisible()
	})
})
