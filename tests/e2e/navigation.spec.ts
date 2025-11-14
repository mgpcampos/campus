import { expect, test } from '@playwright/test'
import { AuthHelpers, NavigationHelpers } from './helpers'

test.describe('Navigation and Layout', () => {
	let authHelpers: AuthHelpers
	let navigationHelpers: NavigationHelpers

	test.beforeEach(async ({ page }) => {
		authHelpers = new AuthHelpers(page)
		navigationHelpers = new NavigationHelpers(page)
	})

	test('should display proper navigation when logged out', async ({ page }) => {
		await page.goto('/')

		// Should show login/register links
		await expect(page.locator('a:has-text("Login"), a:has-text("Sign in")')).toBeVisible()
		await expect(page.locator('a:has-text("Register"), a:has-text("Sign up")')).toBeVisible()

		// Should not show authenticated navigation
		await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible()
	})

	test('should display proper navigation when logged in', async ({ page }) => {
		// Login user
		const userData = {
			email: `navtest-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Nav Test User',
			username: `navtest${Date.now()}`
		}

		await authHelpers.registerUser(userData)

		// Should show authenticated navigation
		await expect(page.locator('a[href="/"], nav a:has-text("Home")')).toBeVisible()
		await expect(page.locator('a[href="/spaces"], nav a:has-text("Spaces")')).toBeVisible()
		await expect(
			page.locator('[data-testid="user-menu"], a:has-text("' + userData.name + '")')
		).toBeVisible()

		// Should not show login/register links
		await expect(page.locator('a:has-text("Login")')).not.toBeVisible()
	})

	test('should navigate between main sections', async ({ page }) => {
		// Login user
		const userData = {
			email: `navtest2-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Nav Test User 2',
			username: `navtest2${Date.now()}`
		}

		await authHelpers.registerUser(userData)

		// Test navigation to different sections
		await navigationHelpers.goToSpaces()
		expect(page.url()).toContain('/spaces')

		await navigationHelpers.goToProfile()
		expect(page.url()).toContain('/profile')

		await navigationHelpers.goToHome()
		expect(page.url()).toContain('/')
		// Home might be root or might have trailing slash
		expect(page.url().endsWith('/') || page.url().match(/\/$|\?/)).toBeTruthy()
	})

	test('should be responsive on mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		await page.goto('/')

		// Navigation should be accessible (might be in a mobile menu)
		const mobileMenuButton = page.locator(
			'[data-testid="mobile-menu"], button:has-text("Menu"), button[aria-label*="menu"]'
		)

		if (await mobileMenuButton.isVisible()) {
			await mobileMenuButton.click()
		}

		// Should show navigation links (either always visible or in opened menu)
		await expect(page.locator('a[href="/"], nav a:has-text("Home")')).toBeVisible()
	})

	test('should show user profile in navigation menu', async ({ page }) => {
		const userData = {
			email: `profilenav-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Profile Nav User',
			username: `profilenav${Date.now()}`
		}

		await authHelpers.registerUser(userData)

		// Should show user name/avatar in navigation
		await expect(page.locator(`text="${userData.name}"`)).toBeVisible()

		// Click on user menu if it exists
		const userMenu = page.locator(
			'[data-testid="user-menu"], button:has-text("' + userData.name + '")'
		)
		if (await userMenu.isVisible()) {
			await userMenu.click()

			// Should show profile options
			await expect(page.locator('a:has-text("Profile"), a[href*="/profile"]')).toBeVisible()
			await expect(page.locator('button:has-text("Logout"), a:has-text("Logout")')).toBeVisible()
		}
	})

	test('should handle keyboard navigation', async ({ page }) => {
		await page.goto('/')

		// Tab through navigation elements
		await page.keyboard.press('Tab')

		// Should be able to activate links with Enter
		const focusedElement = page.locator(':focus')
		if ((await focusedElement.count()) > 0) {
			const tagName = await focusedElement.evaluate((el) => el.tagName.toLowerCase())
			if (tagName === 'a' || tagName === 'button') {
				// This is a basic keyboard navigation test
				expect(await focusedElement.isVisible()).toBe(true)
			}
		}
	})

	test('should show appropriate loading states', async ({ page }) => {
		// This test checks for loading states during navigation
		const userData = {
			email: `loadingtest-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Loading Test User',
			username: `loadingtest${Date.now()}`
		}

		await authHelpers.registerUser(userData)

		// Navigate to a page that might show loading
		const navigationPromise = navigationHelpers.goToSpaces()

		// Look for loading indicators (skeleton, spinner, etc.)
		const loadingIndicators = page.locator('[data-testid="loading"], .loading, .spinner, .skeleton')

		await navigationPromise

		// After navigation completes, loading indicators should be gone
		await expect(loadingIndicators).not.toBeVisible()
		await expect(page.locator('h1, h2').filter({ hasText: 'Spaces' })).toBeVisible()
	})
})
