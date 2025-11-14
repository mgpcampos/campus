import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canModeratePost } from './permissions.js'

type PostRecord = { id: string; author: string; space?: string; group?: string; expand?: unknown }

vi.mock('../pocketbase.js', () => ({
	pb: {
		authStore: { model: { id: 'user1' } },
		collection: () => ({ getOne: vi.fn(), getList: vi.fn() })
	}
}))

describe('permissions', () => {
	beforeEach(() => {
		// reset mocks if needed
	})
	it('canModeratePost true for author', async () => {
		const post: PostRecord = { id: 'p1', author: 'user1' }
		const result = await canModeratePost(post)
		expect(result).toBe(true)
	})
})
