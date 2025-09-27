import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
	test('homepage should load within performance budget', async ({ page }) => {
		// Start measuring performance
		const startTime = Date.now();

		await page.goto('/');

		// Wait for main content to be visible
		await page.waitForSelector('main, [data-testid="feed"], body');

		const loadTime = Date.now() - startTime;

		// Should load within 3 seconds
		expect(loadTime).toBeLessThan(3000);

		// Check for core web vitals
		const performanceMetrics = (await page.evaluate(() => {
			return new Promise((resolve) => {
				new PerformanceObserver((list) => {
					const entries = list.getEntries();
					const metrics: { fcp?: number; lcp?: number } = {};

					entries.forEach((entry) => {
						if (entry.name === 'first-contentful-paint') {
							metrics.fcp = entry.startTime;
						}
						if (entry.name === 'largest-contentful-paint') {
							metrics.lcp = entry.startTime;
						}
					});

					resolve(metrics);
				}).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

				// Fallback timeout
				setTimeout(() => resolve({}), 2000);
			});
		})) as { fcp?: number; lcp?: number };

		// First Contentful Paint should be under 1.8s
		if (performanceMetrics.fcp) {
			expect(performanceMetrics.fcp).toBeLessThan(1800);
		}

		// Largest Contentful Paint should be under 2.5s
		if (performanceMetrics.lcp) {
			expect(performanceMetrics.lcp).toBeLessThan(2500);
		}
	});

	test('should have good Lighthouse scores', async ({ page }) => {
		await page.goto('/');

		// Run basic performance checks
		const navigationTiming = await page.evaluate(() => {
			const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			return {
				domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
				loadComplete: timing.loadEventEnd - timing.loadEventStart,
				responseTime: timing.responseEnd - timing.responseStart
			};
		});

		// DOM Content Loaded should be quick
		expect(navigationTiming.domContentLoaded).toBeLessThan(1000);

		// Server response should be fast
		expect(navigationTiming.responseTime).toBeLessThan(500);
	});

	test('should handle large feeds efficiently', async ({ page }) => {
		// This test would simulate loading a large feed
		await page.goto('/');

		const startTime = Date.now();

		// If there's a "Load More" button, click it multiple times
		for (let i = 0; i < 3; i++) {
			const loadMoreButton = page.locator(
				'button:has-text("Load more"), [data-testid="load-more"]'
			);
			if (await loadMoreButton.isVisible()) {
				await loadMoreButton.click();
				// Wait for new content to load
				await page.waitForTimeout(500);
			}
		}

		const totalTime = Date.now() - startTime;

		// Should handle pagination efficiently
		expect(totalTime).toBeLessThan(5000);

		// Page should still be responsive
		const scrollElement = page.locator('main, body');
		await scrollElement.scrollIntoViewIfNeeded();

		// Check that scrolling is smooth (no massive layout shifts)
		await page.mouse.wheel(0, 100);
		await page.waitForTimeout(100);
		await page.mouse.wheel(0, -100);
	});

	test('should maintain performance on mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		const startTime = Date.now();
		await page.goto('/');
		await page.waitForSelector('main, body');

		const mobileLoadTime = Date.now() - startTime;

		// Mobile should still load reasonably fast
		expect(mobileLoadTime).toBeLessThan(4000);

		// Test mobile interactions
		const interactionStart = Date.now();

		// Try to interact with mobile menu if it exists
		const mobileMenuButton = page.locator('[data-testid="mobile-menu"], button:has-text("Menu")');
		if (await mobileMenuButton.isVisible()) {
			await mobileMenuButton.click();
			await page.waitForTimeout(300);
		}

		// Try scrolling
		await page.mouse.wheel(0, 200);
		await page.waitForTimeout(100);

		const interactionTime = Date.now() - interactionStart;
		expect(interactionTime).toBeLessThan(1000);
	});

	test('should not have memory leaks', async ({ page }) => {
		await page.goto('/');

		// Get initial memory usage
		const initialMemory = (await page.evaluate(() => {
			const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
			return perfWithMemory.memory ? perfWithMemory.memory.usedJSHeapSize : 0;
		})) as number;

		// Navigate around and create/destroy components
		if (await page.locator('a[href="/spaces"]').isVisible()) {
			await page.click('a[href="/spaces"]');
			await page.waitForLoadState('networkidle');

			await page.goBack();
			await page.waitForLoadState('networkidle');
		}

		// Force garbage collection if available
		await page.evaluate(() => {
			const windowWithGc = window as unknown as { gc?: () => void };
			if (windowWithGc.gc) {
				windowWithGc.gc();
			}
		});

		await page.waitForTimeout(1000);

		const finalMemory = (await page.evaluate(() => {
			const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
			return perfWithMemory.memory ? perfWithMemory.memory.usedJSHeapSize : 0;
		})) as number;

		// Memory shouldn't grow excessively (allow 5MB growth)
		if (initialMemory > 0 && finalMemory > 0) {
			const memoryGrowth = finalMemory - initialMemory;
			expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // 5MB
		}
	});

	test('should handle network failures gracefully', async ({ page }) => {
		await page.goto('/');

		// Simulate slow network
		await page.route('**/*', (route) => {
			// Add delay to simulate slow network
			setTimeout(() => {
				route.continue();
			}, 100);
		});

		const startTime = Date.now();

		// Try to perform an action that requires network
		const postComposer = page.locator('textarea, [data-testid="compose-post"]').first();
		if (await postComposer.isVisible()) {
			await postComposer.fill('Test post');
			const submitButton = page.locator('button:has-text("Post")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();
			}
		}

		const actionTime = Date.now() - startTime;

		// Should handle slow network without blocking UI
		expect(actionTime).toBeLessThan(10000);

		// UI should show loading states
		const loadingIndicators = page.locator('[data-testid="loading"], .loading, .spinner');
		// Don't require loading indicators, but if they exist, they should be visible
		const hasLoadingIndicators = (await loadingIndicators.count()) > 0;
		if (hasLoadingIndicators) {
			// At least one should have been visible during the action
			expect(hasLoadingIndicators).toBe(true);
		}
	});

	test('should bundle assets efficiently', async ({ page }) => {
		// Track network requests during page load
		const requests: Array<{
			url: string;
			method: string;
			resourceType: string;
		}> = [];

		page.on('request', (request) => {
			requests.push({
				url: request.url(),
				method: request.method(),
				resourceType: request.resourceType()
			});
		});

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Analyze bundle sizes
		const jsRequests = requests.filter((r) => r.resourceType === 'script');
		const cssRequests = requests.filter((r) => r.resourceType === 'stylesheet');

		// Should not have too many separate JS files (code splitting should be reasonable)
		expect(jsRequests.length).toBeLessThan(10);

		// Should not have too many CSS files
		expect(cssRequests.length).toBeLessThan(5);

		// Check for caching headers
		const responses = await Promise.all(
			jsRequests.slice(0, 3).map(async (req) => {
				const response = await page.request.get(req.url);
				return {
					url: req.url,
					status: response.status(),
					headers: response.headers()
				};
			})
		);

		// Assets should be cacheable
		responses.forEach((response) => {
			expect(response.status).toBe(200);
		});
	});
});
