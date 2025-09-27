import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from './ErrorBoundary.svelte';
import { normalizeError } from '$lib/utils/errors.js';

describe('ErrorBoundary', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders userMessage from a normalized network error and retries', async () => {
		const retry = vi.fn();
		const err = new Error('Network failure while loading feed');
		const normalized = normalizeError(err, { context: 'errorBoundary.test' });

		const { container } = render(ErrorBoundary, {
			props: {
				error: normalized,
				retry,
				showDetails: false
			}
		});

		// User message from taxonomy
		const msg = screen.getByText(/Network issue|Network/);
		expect(msg).toBeTruthy();

		// Retry button should appear for retryable errors
		const retryBtn = screen.getByRole('button', { name: /Try Again/i });
		expect(retryBtn).toBeTruthy();

		await fireEvent.click(retryBtn);
		expect(retry).toHaveBeenCalledTimes(1);

		// Details toggle
		const detailsToggle = await screen.findByText(/Show details/i);
		await fireEvent.click(detailsToggle);
		expect(container.textContent).toMatch(/code:/);
	});

	it('handles offline classified error messaging', () => {
		// Force offline classification
		const original = Object.getOwnPropertyDescriptor(global.navigator, 'onLine');
		Object.defineProperty(global.navigator, 'onLine', { configurable: true, value: false });
		try {
			const offlineErr = normalizeError(new Error('Request failed'), { context: 'offline.test' });
			render(ErrorBoundary, {
				props: {
					error: offlineErr,
					retry: () => {},
					showDetails: false
				}
			});
			expect(screen.getByText(/You appear to be offline|Offline/)).toBeTruthy();
		} finally {
			if (original) {
				Object.defineProperty(global.navigator, 'onLine', original);
			} else {
				Object.defineProperty(global.navigator, 'onLine', { configurable: true, value: true });
			}
		}
	});

	it('renders dismiss button for non-retryable error', () => {
		const err = { status: 400, message: 'Bad input' };
		const normalized = normalizeError(err);
		render(ErrorBoundary, { props: { error: normalized } });
		const btn = screen.getByRole('button', { name: /Dismiss/i });
		expect(btn).toBeTruthy();
	});
});
