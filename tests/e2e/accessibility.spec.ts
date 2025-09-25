import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
	test('homepage should be accessible', async ({ page }) => {
		await page.goto('/');

		const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('login page should be accessible', async ({ page }) => {
		await page.goto('/auth/login');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('registration page should be accessible', async ({ page }) => {
		await page.goto('/auth/register');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('spaces listing should be accessible', async ({ page }) => {
		await page.goto('/spaces');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('should have proper color contrast', async ({ page }) => {
		await page.goto('/');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2aa'])
			.include('.text-foreground, .text-muted-foreground, .text-primary')
			.analyze();

		const contrastViolations = accessibilityScanResults.violations.filter(
			(violation) => violation.id === 'color-contrast'
		);

		expect(contrastViolations).toEqual([]);
	});

	test('forms should be properly labeled', async ({ page }) => {
		await page.goto('/auth/login');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a'])
			.include('form')
			.analyze();

		const labelViolations = accessibilityScanResults.violations.filter(
			(violation) => violation.id === 'label' || violation.id === 'form-field-multiple-labels'
		);

		expect(labelViolations).toEqual([]);
	});

	test('should have proper heading hierarchy', async ({ page }) => {
		await page.goto('/');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withRules(['heading-order'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('interactive elements should be keyboard accessible', async ({ page }) => {
		await page.goto('/');

		// Test tab navigation
		await page.keyboard.press('Tab');
		const firstFocusable = page.locator(':focus');
		expect(await firstFocusable.count()).toBeGreaterThan(0);

		// Test navigation through interactive elements
		const focusableElements = page.locator('a, button, input, textarea, select');
		const count = await focusableElements.count();

		if (count > 0) {
			// Tab through some elements
			for (let i = 0; i < Math.min(count, 5); i++) {
				await page.keyboard.press('Tab');
				const focused = page.locator(':focus');
				expect(await focused.count()).toBeGreaterThan(0);
			}
		}
	});

	test('should have proper ARIA landmarks', async ({ page }) => {
		await page.goto('/');

		const accessibilityScanResults = await new AxeBuilder({ page }).withRules(['region']).analyze();

		expect(accessibilityScanResults.violations).toEqual([]);

		// Check for main landmarks
		await expect(page.locator('main, [role="main"]')).toBeVisible();
		await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
	});

	test('images should have alt text', async ({ page }) => {
		await page.goto('/');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withRules(['image-alt'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('should work with screen reader simulation', async ({ page }) => {
		await page.goto('/');

		// Check that screen reader would find meaningful content
		const headings = page.locator('h1, h2, h3, h4, h5, h6');
		expect(await headings.count()).toBeGreaterThan(0);

		// Check for descriptive text
		const textContent = await page.textContent('body');
		expect(textContent?.length).toBeGreaterThan(50); // Should have meaningful content

		// Check for skip links or focus management
		await page.keyboard.press('Tab');
		const firstFocused = page.locator(':focus');
		expect(await firstFocused.count()).toBeGreaterThan(0);
	});
});
