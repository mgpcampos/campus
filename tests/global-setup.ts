import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
	console.log('🔧 Running global setup...');

	// Wait for servers to be ready
	const baseURL = config.projects[0].use.baseURL!;

	// Simple health check
	const browser = await chromium.launch();
	const page = await browser.newPage();

	try {
		// Wait for app to be ready
		console.log('⏳ Waiting for app server...');
		await page.goto(baseURL, { waitUntil: 'networkidle' });
		console.log('✅ App server is ready');

		// Wait for PocketBase to be ready
		console.log('⏳ Waiting for PocketBase...');
		await page.goto('http://localhost:8090/api/health', { waitUntil: 'networkidle' });
		console.log('✅ PocketBase is ready');
	} catch (error) {
		console.error('❌ Global setup failed:', error);
		throw error;
	} finally {
		await browser.close();
	}

	console.log('✅ Global setup completed');
}

export default globalSetup;
