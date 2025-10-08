import { test, expect } from '@playwright/test';

/**
 * Performance benchmarks for materials search
 * Tests NFR-002: Search response times should be ≤2s p95
 */
test.describe('Materials Search Performance', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to materials page
		await page.goto('/materials');
		// Wait for initial load
		await page.waitForSelector('[data-testid="materials-grid"], main');
	});

	test('empty search (all materials) loads within performance budget', async ({ page }) => {
		const startTime = Date.now();

		// Trigger search with no filters
		await page.click('button:has-text("Search")');

		// Wait for results to appear
		await page.waitForSelector(
			'[data-testid="materials-grid"], .materials-list, [data-testid="material-card"]',
			{
				timeout: 3000
			}
		);

		const loadTime = Date.now() - startTime;

		// Should load within 2 seconds (per NFR-002)
		expect(loadTime).toBeLessThan(2000);

		// Verify results are displayed
		const resultsExist = await page.locator('[data-testid="material-card"]').count();
		expect(resultsExist).toBeGreaterThan(0);
	});

	test('text search with query performs within budget', async ({ page }) => {
		const queries = ['calculus', 'python', 'biology'];

		for (const query of queries) {
			const startTime = Date.now();

			// Enter search query
			await page.fill('input[name="q"], input[placeholder*="Search"]', query);
			await page.click('button:has-text("Search")');

			// Wait for results or empty state
			await page.waitForSelector(
				'[data-testid="materials-grid"], .materials-list, [data-testid="empty-state"]',
				{
					timeout: 3000
				}
			);

			const loadTime = Date.now() - startTime;

			// Should complete within 2 seconds
			expect(loadTime).toBeLessThan(2000);

			// Clear for next iteration
			await page.fill('input[name="q"], input[placeholder*="Search"]', '');
		}
	});

	test('tag filtering performs within budget', async ({ page }) => {
		const startTime = Date.now();

		// Open tags filter if collapsed
		const tagsButton = page.locator('button:has-text("Tags"), button:has-text("Filters")').first();
		if ((await tagsButton.count()) > 0) {
			await tagsButton.click();
		}

		// Select a tag (assuming tags are checkboxes or buttons)
		const firstTag = page.locator('[data-testid="tag-filter"], input[type="checkbox"]').first();
		if ((await firstTag.count()) > 0) {
			await firstTag.click();
		}

		// Trigger search
		await page.click('button:has-text("Search")');

		// Wait for filtered results
		await page.waitForSelector('[data-testid="materials-grid"], .materials-list', {
			timeout: 3000
		});

		const loadTime = Date.now() - startTime;

		// Should complete within 2 seconds
		expect(loadTime).toBeLessThan(2000);
	});

	test('combined filters (format + visibility + course) perform within budget', async ({
		page
	}) => {
		const startTime = Date.now();

		// Apply format filter
		const formatFilter = page
			.locator('select[name="format"], [data-testid="format-filter"]')
			.first();
		if ((await formatFilter.count()) > 0) {
			await formatFilter.selectOption({ index: 1 }); // Select first non-empty option
		}

		// Apply visibility filter
		const visibilityFilter = page
			.locator('select[name="visibility"], [data-testid="visibility-filter"]')
			.first();
		if ((await visibilityFilter.count()) > 0) {
			await visibilityFilter.selectOption({ index: 1 });
		}

		// Apply course code filter
		await page.fill('input[name="courseCode"], input[placeholder*="Course"]', 'CS101');

		// Trigger search
		await page.click('button:has-text("Search")');

		// Wait for results
		await page.waitForSelector(
			'[data-testid="materials-grid"], .materials-list, [data-testid="empty-state"]',
			{
				timeout: 3000
			}
		);

		const loadTime = Date.now() - startTime;

		// Should complete within 2 seconds even with multiple filters
		expect(loadTime).toBeLessThan(2000);
	});

	test('pagination navigation performs within budget', async ({ page }) => {
		// Ensure we have results
		await page.click('button:has-text("Search")');
		await page.waitForSelector('[data-testid="materials-grid"], .materials-list', {
			timeout: 2000
		});

		// Check if pagination exists
		const nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();
		if ((await nextButton.count()) === 0) {
			test.skip();
		}

		const startTime = Date.now();

		// Navigate to page 2
		await nextButton.click();

		// Wait for new page results
		await page.waitForSelector('[data-testid="materials-grid"], .materials-list', {
			timeout: 3000
		});

		const loadTime = Date.now() - startTime;

		// Page navigation should be quick
		expect(loadTime).toBeLessThan(1500);
	});

	test('API response time meets NFR-002 requirements', async ({ page, request }) => {
		const measurements: number[] = [];

		// Perform 10 search requests to measure p95
		for (let i = 0; i < 10; i++) {
			const startTime = Date.now();

			const response = await request.get('/api/materials', {
				params: {
					q: i % 2 === 0 ? 'test' : '',
					page: String((i % 3) + 1),
					perPage: '20'
				}
			});

			const responseTime = Date.now() - startTime;
			measurements.push(responseTime);

			expect(response.ok()).toBeTruthy();
		}

		// Calculate p95
		measurements.sort((a, b) => a - b);
		const p95Index = Math.ceil(measurements.length * 0.95) - 1;
		const p95 = measurements[p95Index];

		console.log(`API Response Times:`, {
			min: measurements[0],
			max: measurements[measurements.length - 1],
			avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
			p95
		});

		// p95 should be under 2 seconds (NFR-002)
		expect(p95).toBeLessThan(2000);
	});
});

/**
 * Unit-level performance tests for search utilities
 * Tests searchTerms aggregation performance
 */
test.describe('Materials Search Utilities Performance', () => {
	test('searchTerms aggregation performs efficiently', async () => {
		// This would typically be a Vitest test, but Playwright can test it via API
		// The actual Vitest test should be in src/lib/server/materials/searchTerms.test.js
		// This is a placeholder showing the E2E impact

		const { aggregateMaterialSearchTerms } = await import(
			'../../src/lib/server/materials/searchTerms.js'
		);

		const sampleMaterials = Array.from({ length: 100 }, (_, i) => ({
			title: `Material ${i}`,
			description: `Description for material ${i} with various keywords`,
			tags: [`tag${i % 5}`, `category${i % 3}`],
			courseCode: `CS${100 + (i % 10)}`,
			format: 'pdf'
		}));

		const startTime = Date.now();

		// Aggregate each material
		sampleMaterials.forEach((material) => {
			aggregateMaterialSearchTerms(material);
		});

		const duration = Date.now() - startTime;

		// Should aggregate 100 materials in under 100ms
		expect(duration).toBeLessThan(100);
	});
});
