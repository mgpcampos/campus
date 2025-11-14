import { render, screen } from '@testing-library/svelte'
// Mock pocketbase early (align with other tests)
import { describe, expect, it, vi } from 'vitest'
import Layout from '../routes/+layout.svelte'

vi.mock('$lib/pocketbase.js', async () => {
	return await import('../lib/pocketbase.mock.js')
})

// Helper to override navigator.onLine
function setOnline(value: boolean) {
	const nav = globalThis.navigator
	if (!nav) {
		return () => undefined
	}
	const desc = Object.getOwnPropertyDescriptor(nav, 'onLine')
	if (desc && desc.configurable) {
		Object.defineProperty(nav, 'onLine', { configurable: true, value })
	} else {
		// Fallback define if not present/configurable
		try {
			Object.defineProperty(nav, 'onLine', { configurable: true, value })
		} catch {
			// ignore if cannot redefine
		}
	}
	return () => {
		if (desc) {
			Object.defineProperty(nav, 'onLine', desc)
		} else {
			Object.defineProperty(nav, 'onLine', { configurable: true, value: true })
		}
	}
}

describe('Layout offline banner', () => {
	it('shows offline banner when offline', async () => {
		const restore = setOnline(false)
		try {
			render(Layout, {
				props: {
					data: { user: null, sessionToken: null },
					// @ts-expect-error fake snippet for testing
					children: () => undefined
				}
			})
			const banner = await screen.findByText(
				/Offline\. Some actions may fail until connection is restored\./
			)
			expect(banner).toBeTruthy()
		} finally {
			restore()
		}
	})

	it('does not show offline banner when online', async () => {
		const restore = setOnline(true)
		try {
			render(Layout, {
				props: {
					data: { user: null, sessionToken: null },
					// @ts-expect-error fake snippet for testing
					children: () => undefined
				}
			})
			const bannerQuery = screen.queryByText(
				/Offline\. Some actions may fail until connection is restored\./
			)
			expect(bannerQuery).toBeNull()
		} finally {
			restore()
		}
	})
})
