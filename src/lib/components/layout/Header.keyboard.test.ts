import { fireEvent, render, waitFor } from '@testing-library/svelte'
import type { RecordModel } from 'pocketbase'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from './Header.svelte'

// Mock currentUser store minimal
vi.mock('$lib/pocketbase.js', async () => {
	return await import('../../pocketbase.mock.js')
})

import { currentUser } from '$lib/pocketbase.js'

vi.mock('$app/stores', async () => {
	const { readable } = await import('svelte/store')
	return {
		page: readable({ url: new URL('http://localhost/') })
	}
})

describe('Header keyboard navigation', () => {
	beforeEach(() => {
		const user: RecordModel = {
			id: 'user-1',
			collectionId: 'users',
			collectionName: 'users',
			email: 'user@example.com',
			name: 'Test User',
			username: 'test-user',
			avatar: null,
			isAdmin: false,
			created: '2024-01-01 00:00:00',
			updated: '2024-01-01 00:00:00'
		}
		currentUser.set(user)
	})

	afterEach(() => {
		currentUser.set(null)
	})

	// TODO: Implement mobile menu feature - test skipped until mobile navigation is added to Header
	it.skip('opens mobile menu moves focus then Escape closes and restores focus', async () => {
		const { container } = render(Header, { props: { id: 'navigation' } })
		const getToggle = () =>
			container.querySelector('button[aria-controls="mobile-menu"]') as HTMLElement | null
		await waitFor(() => expect(getToggle()).toBeTruthy())
		const toggle = getToggle()!
		toggle.click()
		const firstLink = () => container.querySelector('#mobile-menu a') as HTMLElement | null
		await waitFor(() => {
			expect(firstLink()).toBeTruthy()
			expect(firstLink()).toHaveFocus()
		})
		fireEvent.keyDown(window, { key: 'Escape' })
		await waitFor(() => {
			expect(container.querySelector('#mobile-menu')).toBeNull()
			expect(toggle).toHaveFocus()
		})
	})
})
