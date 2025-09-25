import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Layout from '../routes/+layout.svelte';

// Mock pocketbase early (align with other tests)
import { vi } from 'vitest';
vi.mock('$lib/pocketbase.js', async () => {
	return await import('../lib/pocketbase.mock.js');
});

// Helper to override navigator.onLine
function setOnline(value: boolean) {
	const desc = Object.getOwnPropertyDescriptor(global.navigator, 'onLine');
	if (desc && desc.configurable) {
		Object.defineProperty(global.navigator, 'onLine', { configurable: true, value });
	} else {
		// Fallback define if not present/configurable
		try {
			Object.defineProperty(global.navigator, 'onLine', { configurable: true, value });
		} catch {
			// ignore if cannot redefine
		}
	}
	return () => {
		if (desc) {
			Object.defineProperty(global.navigator, 'onLine', desc);
		} else {
			Object.defineProperty(global.navigator, 'onLine', { configurable: true, value: true });
		}
	};
}

describe('Layout offline banner', () => {
	it('shows offline banner when offline', async () => {
		const restore = setOnline(false);
		try {
			render(Layout, {
				props: {
					data: { user: null },
					// @ts-expect-error fake snippet for testing
					children: () => {}
				}
			});
			const banner = await screen.findByText(
				/Offline\. Some actions may fail until connection is restored\./
			);
			expect(banner).toBeTruthy();
		} finally {
			restore();
		}
	});

	it('does not show offline banner when online', async () => {
		const restore = setOnline(true);
		try {
			render(Layout, {
				props: {
					data: { user: null },
					// @ts-expect-error fake snippet for testing
					children: () => {}
				}
			});
			const bannerQuery = screen.queryByText(
				/Offline\. Some actions may fail until connection is restored\./
			);
			expect(bannerQuery).toBeNull();
		} finally {
			restore();
		}
	});
});
