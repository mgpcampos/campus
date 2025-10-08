import { defineConfig, devices } from '@playwright/test';
import type { Project } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const includeWebkit = Boolean(process.env.CI || process.env.PLAYWRIGHT_ENABLE_WEBKIT === '1');

const projects: Project[] = [
	{
		name: 'chromium',
		use: { ...devices['Desktop Chrome'] }
	},
	{
		name: 'firefox',
		use: { ...devices['Desktop Firefox'] }
	},
	/* Test against mobile viewports. */
	{
		name: 'Mobile Chrome',
		use: { ...devices['Pixel 5'] }
	}
];

if (includeWebkit) {
	projects.push(
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		},
		{
			name: 'Mobile Safari',
			use: { ...devices['iPhone 12'] }
		}
	);
} else {
	if (!process.env.PLAYWRIGHT_SKIP_WEBKIT_NOTICE) {
		console.warn(
			'Skipping WebKit-based Playwright projects; set PLAYWRIGHT_ENABLE_WEBKIT=1 to include them locally.'
		);
		process.env.PLAYWRIGHT_SKIP_WEBKIT_NOTICE = '1';
	}
}

export default defineConfig({
	testDir: 'e2e',
	/* Run tests in files in parallel */ fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */ forbidOnly:
		!!process.env.CI,
	/* Retry on CI only */ retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */ workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */ reporter: 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */ use: {
		/* Base URL to use in actions like `await page.goto('/')`. */ baseURL:
			process.env.BASE_URL || 'http://localhost:4173',
		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */ trace:
			'on-first-retry',
		/* Take screenshot on failure */ screenshot: 'only-on-failure',
		/* Record video on first retry */ video: 'retain-on-failure'
	},
	/* Configure projects for major browsers */ projects /* Test against branded browsers. */,
	// {
	//   name: 'Microsoft Edge',
	//   use: { ...devices['Desktop Edge'], channel: 'msedge' },
	// },
	// {
	//   name: 'Google Chrome',
	//   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
	// },
	/* Run your local dev server before starting the tests */ webServer: {
		command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
		port: 4173,
		timeout: 120000,
		reuseExistingServer: !process.env.CI
	},
	/* Global setup and teardown */ globalSetup: './tests/global-setup.ts',
	globalTeardown: './tests/global-teardown.ts'
});
