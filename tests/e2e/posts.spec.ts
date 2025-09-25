import { test, expect } from '@playwright/test';
import { AuthHelpers, PostHelpers } from './helpers';

test.describe('Post Creation and Interaction', () => {
	let authHelpers: AuthHelpers;
	let postHelpers: PostHelpers;

	test.beforeEach(async ({ page }) => {
		authHelpers = new AuthHelpers(page);
		postHelpers = new PostHelpers(page);

		// Create and login a user for each test
		const userData = {
			email: `posttest-${Date.now()}@example.com`,
			password: 'securePassword123!',
			name: 'Post Test User',
			username: `posttest${Date.now()}`
		};

		await authHelpers.registerUser(userData);
	});

	test('should create a post successfully', async ({ page }) => {
		const postContent = `Test post content ${Date.now()}`;

		await postHelpers.createPost(postContent);

		// Verify post appears in feed
		await expect(page.locator(`text="${postContent}"`)).toBeVisible();

		// Verify post has author info
		await expect(
			page.locator('[data-testid="post-card"]').filter({ hasText: postContent })
		).toContainText('Post Test User');
	});

	test('should like a post', async ({ page }) => {
		const postContent = `Like test post ${Date.now()}`;

		await postHelpers.createPost(postContent);

		// Get post card and like the post
		const postCard = page.locator('[data-testid="post-card"]').filter({ hasText: postContent });

		await postHelpers.likePost(postContent);

		// Verify like count increased
		await expect(postCard.locator('[data-testid="like-count"]')).toContainText('1');

		// Verify like button state changed (if it shows as "liked")
		const likeButton = postCard.locator('[data-testid="like-button"]');
		await expect(likeButton).toHaveClass(/liked|active/);
	});

	test('should comment on a post', async ({ page }) => {
		const postContent = `Comment test post ${Date.now()}`;
		const commentContent = `Test comment ${Date.now()}`;

		await postHelpers.createPost(postContent);
		await postHelpers.commentOnPost(postContent, commentContent);

		// Verify comment appears
		await expect(page.locator(`text="${commentContent}"`)).toBeVisible();

		// Verify comment count updated
		const postCard = page.locator('[data-testid="post-card"]').filter({ hasText: postContent });
		await expect(postCard.locator('[data-testid="comment-count"]')).toContainText('1');
	});

	test('should validate post content', async ({ page }) => {
		// Try to create empty post
		await page.goto('/');

		const submitButton = page
			.locator('button:has-text("Post"), button[type="submit"]:near(textarea)')
			.first();
		await submitButton.click();

		// Should show validation error
		await expect(
			page.locator('text="Content is required", text="Post cannot be empty"')
		).toBeVisible();
	});

	test('should handle post creation failure gracefully', async ({ page }) => {
		// This test might need to be adapted based on how errors are handled
		const veryLongContent = 'A'.repeat(2001); // Assuming 2000 char limit

		const composeArea = page
			.locator('[data-testid="compose-post"], textarea[placeholder*="What\'s happening"]')
			.first();
		await composeArea.fill(veryLongContent);

		await page.click('button:has-text("Post"), button[type="submit"]:near(textarea)');

		// Should show error message
		await expect(
			page.locator('text="Post is too long", text="Content exceeds maximum length"')
		).toBeVisible();
	});

	test('should display posts in chronological order', async ({ page }) => {
		const post1Content = `First post ${Date.now()}`;
		const post2Content = `Second post ${Date.now() + 1}`;

		await postHelpers.createPost(post1Content);

		// Wait a moment to ensure different timestamps
		await page.waitForTimeout(1000);

		await postHelpers.createPost(post2Content);

		// Check that the newer post appears first
		const posts = page.locator('[data-testid="post-card"]');
		await expect(posts.first()).toContainText(post2Content);
		await expect(posts.nth(1)).toContainText(post1Content);
	});

	test('should allow user to delete their own post', async ({ page }) => {
		const postContent = `Delete test post ${Date.now()}`;

		await postHelpers.createPost(postContent);

		// Find and click delete button
		const postCard = page.locator('[data-testid="post-card"]').filter({ hasText: postContent });
		const deleteButton = postCard.locator('[data-testid="delete-post"], button:has-text("Delete")');

		// Delete button might be in a dropdown menu
		const moreButton = postCard.locator('[data-testid="post-menu"], button:has-text("⋯")');
		if (await moreButton.isVisible()) {
			await moreButton.click();
		}

		await deleteButton.click();

		// Confirm deletion if there's a confirmation dialog
		if (await page.locator('button:has-text("Confirm"), button:has-text("Delete")').isVisible()) {
			await page.click('button:has-text("Confirm"), button:has-text("Delete")');
		}

		// Verify post is removed
		await expect(page.locator(`text="${postContent}"`)).not.toBeVisible();
	});
});
