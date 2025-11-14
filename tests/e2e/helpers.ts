import { type Page } from '@playwright/test'

export class AuthHelpers {
	constructor(private page: Page) {}

	async registerUser(userData: {
		email: string
		password: string
		name: string
		username: string
	}) {
		await this.page.goto('/auth/register')
		await this.page.fill('input[name="email"]', userData.email)
		await this.page.fill('input[name="password"]', userData.password)
		await this.page.fill('input[name="passwordConfirm"]', userData.password)
		await this.page.click('button[type="submit"]')

		// Wait for redirect to profile setup
		await this.page.waitForURL('**/profile/setup')
		await this.page.fill('input[name="name"]', userData.name)
		await this.page.fill('input[name="username"]', userData.username)
		await this.page.click('button[type="submit"]')

		// Wait for redirect to home
		await this.page.waitForURL('**/')
	}

	async loginUser(email: string, password: string) {
		await this.page.goto('/auth/login')
		await this.page.fill('input[name="email"]', email)
		await this.page.fill('input[name="password"]', password)
		await this.page.click('button[type="submit"]')

		// Wait for redirect to home
		await this.page.waitForURL('**/')
	}

	async logout() {
		// Find and click logout button/link
		await this.page.click(
			'[data-testid="logout-button"], button:has-text("Logout"), a:has-text("Logout")'
		)
		await this.page.waitForURL('**/')
	}

	async isLoggedIn(): Promise<boolean> {
		// Check if user is logged in by looking for authenticated elements
		return this.page
			.locator('[data-testid="user-menu"], [data-testid="compose-post"]')
			.first()
			.isVisible()
	}
}

export class PostHelpers {
	constructor(private page: Page) {}

	async createPost(content: string, scope: 'global' | 'space' | 'group' = 'global') {
		// Find the compose area
		const composeArea = this.page
			.locator('[data-testid="compose-post"], textarea[placeholder*="What\'s happening"]')
			.first()
		await composeArea.fill(content)

		if (scope !== 'global') {
			// Handle scope selection if needed
			const scopeSelector = this.page.locator(
				'select[name="scope"], [data-testid="scope-selector"]'
			)
			if (await scopeSelector.isVisible()) {
				await scopeSelector.selectOption(scope)
			}
		}

		await this.page.click('button:has-text("Post"), button[type="submit"]:near(textarea)')

		// Wait for post to appear in feed
		await this.page.waitForSelector(`text="${content}"`, { timeout: 5000 })
	}

	async likePost(postContent: string) {
		const postCard = this.page.locator('[data-testid="post-card"]').filter({ hasText: postContent })
		const likeButton = postCard
			.locator('[data-testid="like-button"], button:has-text("Like")')
			.first()
		await likeButton.click()
	}

	async commentOnPost(postContent: string, commentText: string) {
		const postCard = this.page.locator('[data-testid="post-card"]').filter({ hasText: postContent })
		const commentButton = postCard
			.locator('[data-testid="comment-button"], button:has-text("Comment")')
			.first()
		await commentButton.click()

		// Fill comment form
		const commentInput = this.page
			.locator('textarea[placeholder*="comment"], textarea[name="content"]')
			.last()
		await commentInput.fill(commentText)
		await this.page.click('button:has-text("Comment"), button[type="submit"]:near(textarea)')

		// Wait for comment to appear
		await this.page.waitForSelector(`text="${commentText}"`, { timeout: 5000 })
	}
}

export class SpaceHelpers {
	constructor(private page: Page) {}

	async createSpace(spaceData: {
		name: string
		slug: string
		description: string
		isPublic: boolean
	}) {
		await this.page.goto('/spaces/new')
		await this.page.fill('input[name="name"]', spaceData.name)
		await this.page.fill('input[name="slug"]', spaceData.slug)
		await this.page.fill('textarea[name="description"]', spaceData.description)

		const publicCheckbox = this.page.locator('input[name="isPublic"]')
		if (spaceData.isPublic !== (await publicCheckbox.isChecked())) {
			await publicCheckbox.click()
		}

		await this.page.click('button[type="submit"]')
		await this.page.waitForURL(`**/spaces/${spaceData.slug}`)
	}

	async joinSpace(spaceSlug: string) {
		await this.page.goto(`/spaces/${spaceSlug}`)
		const joinButton = this.page.locator('button:has-text("Join"), [data-testid="join-space"]')
		await joinButton.click()

		// Wait for button to change to "Leave"
		await this.page.waitForSelector('button:has-text("Leave"), [data-testid="leave-space"]')
	}

	async leaveSpace(spaceSlug: string) {
		await this.page.goto(`/spaces/${spaceSlug}`)
		const leaveButton = this.page.locator('button:has-text("Leave"), [data-testid="leave-space"]')
		await leaveButton.click()

		// Wait for button to change to "Join"
		await this.page.waitForSelector('button:has-text("Join"), [data-testid="join-space"]')
	}
}

export class NavigationHelpers {
	constructor(private page: Page) {}

	async goToSpaces() {
		await this.page.click('a[href="/spaces"], nav a:has-text("Spaces")')
		await this.page.waitForURL('**/spaces')
	}

	async goToProfile() {
		await this.page.click('a[href^="/profile"], [data-testid="profile-link"]')
		await this.page.waitForURL('**/profile/**')
	}

	async goToHome() {
		await this.page.click('a[href="/"], nav a:has-text("Home")')
		await this.page.waitForURL('**/')
	}
}
