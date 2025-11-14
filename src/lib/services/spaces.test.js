import { ClientResponseError } from 'pocketbase'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the shared PocketBase client to keep existing imports intact
vi.mock('../pocketbase.js', () => ({
	pb: {
		collection: vi.fn()
	}
}))

import { serverCaches } from '../utils/cache.js'
import { getSpaceMemberCount } from './spaces.js'

function createClient() {
	const getList = vi.fn()
	const collection = vi.fn(() => ({ getList }))
	return { collection, getList }
}

describe('getSpaceMemberCount', () => {
	beforeEach(() => {
		serverCaches.lists.clear()
	})

	it('returns total items when accessible', async () => {
		const client = createClient()
		client.getList.mockResolvedValue({ totalItems: 7 })

		const result = await getSpaceMemberCount('space123', {
			pb: /** @type {any} */ (client)
		})

		expect(result).toBe(7)
		expect(client.collection).toHaveBeenCalledWith('space_members')
		expect(client.getList).toHaveBeenCalledWith(1, 1, {
			filter: 'space = "space123"',
			totalCount: true,
			requestKey: 'spaceMemberCount:space123'
		})
	})

	it('returns null when access is forbidden', async () => {
		const client = createClient()
		client.getList.mockRejectedValue(
			new ClientResponseError({ status: 403, response: { message: 'forbidden' } })
		)

		const result = await getSpaceMemberCount('space123', {
			pb: /** @type {any} */ (client)
		})

		expect(result).toBeNull()
	})

	it('returns zero when space has no memberships or is missing', async () => {
		const client = createClient()
		client.getList.mockRejectedValue(
			new ClientResponseError({ status: 404, response: { message: 'not found' } })
		)

		const result = await getSpaceMemberCount('space123', {
			pb: /** @type {any} */ (client)
		})

		expect(result).toBe(0)
	})

	it('rethrows unexpected errors', async () => {
		const client = createClient()
		client.getList.mockRejectedValue(new Error('network down'))

		await expect(
			getSpaceMemberCount('space123', {
				pb: /** @type {any} */ (client)
			})
		).rejects.toThrow('network down')
	})
})
