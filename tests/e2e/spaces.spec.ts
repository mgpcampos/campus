import { test, expect } from '@playwright/test';
import { AuthHelpers, SpaceHelpers, NavigationHelpers } from './helpers';

test.describe('Spaces and Groups', () => {
	let authHelpers: AuthHelpers;
	let spaceHelpers: SpaceHelpers;
	let navigationHelpers: NavigationHelpers;

	test.beforeEach(async ({ page }) => {
		authHelpers = new AuthHelpers(page);
		spaceHelpers = new SpaceHelpers(page);
		navigationHelpers = new NavigationHelpers(page);

		// Create and login a user for each test
		const userData = {
			email: `spacetest-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Space Test User',
			username: `spacetest${Date.now()}`
		};

		await authHelpers.registerUser(userData);
	});

	test('should browse available spaces', async ({ page }) => {
		await navigationHelpers.goToSpaces();

		// Should show spaces page
		await expect(page.locator('h1, h2').filter({ hasText: 'Spaces' })).toBeVisible();

		// Should show space listings or empty state
		const spacesList = page.locator('[data-testid="spaces-list"], [data-testid="space-card"]');
		const emptyState = page.locator('text="No spaces found", text="Create the first space"');

		// Either spaces exist or empty state is shown
		expect((await spacesList.count()) > 0 || (await emptyState.isVisible())).toBeTruthy();
	});

	test('should create a new space', async ({ page }) => {
		const spaceData = {
			name: `Test Space ${Date.now()}`,
			slug: `test-space-${Date.now()}`,
			description: 'A test space for automated testing',
			isPublic: true
		};

		await spaceHelpers.createSpace(spaceData);

		// Should be on the new space page
		expect(page.url()).toContain(`/spaces/${spaceData.slug}`);

		// Should show space details
		await expect(page.locator(`text="${spaceData.name}"`)).toBeVisible();
		await expect(page.locator(`text="${spaceData.description}"`)).toBeVisible();

		// User should be a member (owner)
		await expect(page.locator('button:has-text("Leave"), text="Owner"')).toBeVisible();
	});

	test('should join and leave a space', async ({ page }) => {
		// First, create a space with one user
		const spaceData = {
			name: `Join Test Space ${Date.now()}`,
			slug: `join-test-space-${Date.now()}`,
			description: 'A space for testing join/leave functionality',
			isPublic: true
		};

		await spaceHelpers.createSpace(spaceData);
		await authHelpers.logout();

		// Create and login as a different user
		const joinUserData = {
			email: `joinuser-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Join Test User',
			username: `joinuser${Date.now()}`
		};

		await authHelpers.registerUser(joinUserData);

		// Join the space
		await spaceHelpers.joinSpace(spaceData.slug);

		// Should show as member
		await expect(page.locator('button:has-text("Leave")')).toBeVisible();

		// Leave the space
		await spaceHelpers.leaveSpace(spaceData.slug);

		// Should show join button again
		await expect(page.locator('button:has-text("Join")')).toBeVisible();
	});

	test('should display space-specific feed', async ({ page }) => {
		const spaceData = {
			name: `Feed Test Space ${Date.now()}`,
			slug: `feed-test-space-${Date.now()}`,
			description: 'A space for testing feeds',
			isPublic: true
		};

		await spaceHelpers.createSpace(spaceData);

		// Should show space feed page
		await expect(page.locator('[data-testid="space-feed"], [data-testid="feed"]')).toBeVisible();

		// Should have post composer for space
		await expect(page.locator('textarea, [data-testid="compose-post"]')).toBeVisible();

		// Create a post in the space
		const spacePostContent = `Space post ${Date.now()}`;
		const composeArea = page.locator('textarea').first();
		await composeArea.fill(spacePostContent);
		await page.click('button:has-text("Post")');

		// Post should appear in space feed
		await expect(page.locator(`text="${spacePostContent}"`)).toBeVisible();
	});

	test('should validate space creation form', async ({ page }) => {
		await page.goto('/spaces/new');

		// Try submitting empty form
		await page.click('button[type="submit"]');

		// Should show validation errors
		await expect(page.locator('text="Name is required"')).toBeVisible();
		await expect(page.locator('text="Slug is required"')).toBeVisible();

		// Test invalid slug format
		await page.fill('input[name="name"]', 'Test Space');
		await page.fill('input[name="slug"]', 'Invalid Slug!');
		await page.click('button[type="submit"]');

		await expect(
			page.locator('text="Invalid slug format", text="Slug must contain only lowercase letters"')
		).toBeVisible();
	});

	test('should show space member count', async ({ page }) => {
		const spaceData = {
			name: `Member Count Space ${Date.now()}`,
			slug: `member-count-space-${Date.now()}`,
			description: 'A space for testing member counts',
			isPublic: true
		};

		await spaceHelpers.createSpace(spaceData);

		// Should show member count (at least 1 - the owner)
		await expect(page.locator('text="1 member", text="1 Member"')).toBeVisible();

		await authHelpers.logout();

		// Create second user and join
		const secondUserData = {
			email: `member2-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Member 2',
			username: `member2${Date.now()}`
		};

		await authHelpers.registerUser(secondUserData);
		await spaceHelpers.joinSpace(spaceData.slug);

		// Should show updated member count
		await expect(page.locator('text="2 members", text="2 Members"')).toBeVisible();
	});

	test('should handle non-existent space gracefully', async ({ page }) => {
		await page.goto('/spaces/non-existent-space-123');

		// Should show 404 or error page
		await expect(
			page.locator('text="Space not found", text="404", h1:has-text("Not found")')
		).toBeVisible();
	});
});
