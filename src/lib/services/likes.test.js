import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLikeCount, hasUserLikedPost, toggleLike } from './likes.js'

// Mock PocketBase
vi.mock('../pocketbase.js', () => ({
	pb: {
		authStore: {
			model: { id: 'user123' }
		},
		collection: vi.fn()
	}
}))

describe('Likes Service', () => {
	/** @type {any} */ let mockLikesCollection
	/** @type {any} */ let mockPostsCollection
	/** @type {any} */ let mockPb

	beforeEach(async () => {
		vi.clearAllMocks()

		// Import the mocked module
		const { pb } = await import('../pocketbase.js')
		mockPb = pb

		// Reset auth state (cast to any to bypass readonly typing)
		/** @type {any} */
		mockPb.authStore.model = { id: 'user123' }

		mockLikesCollection = {
			getFirstListItem: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			getList: vi.fn()
		}

		mockPostsCollection = {
			getOne: vi.fn(),
			update: vi.fn()
		}

		mockPb.collection.mockImplementation((/** @type {any} */ name) => {
			if (name === 'likes') return mockLikesCollection
			if (name === 'posts') return mockPostsCollection
			return {}
		})
	})

	describe('toggleLike', () => {
		it('should create a like when user has not liked the post', async () => {
			const postId = 'post123'

			// Mock no existing like
			mockLikesCollection.getFirstListItem.mockRejectedValue(new Error('Not found'))

			// Mock post data
			mockPostsCollection.getOne.mockResolvedValue({ id: postId, likeCount: 5 })
			mockPostsCollection.update.mockResolvedValue({ id: postId, likeCount: 6 })

			// Mock like creation
			mockLikesCollection.create.mockResolvedValue({ id: 'like123' })

			const result = await toggleLike(postId)

			expect(mockLikesCollection.create).toHaveBeenCalledWith({
				post: postId,
				user: 'user123'
			})
			expect(mockPostsCollection.update).toHaveBeenCalledWith(postId, { likeCount: 6 })
			expect(result).toEqual({ liked: true, likeCount: 6 })
		})

		it('should remove a like when user has already liked the post', async () => {
			const postId = 'post123'
			const existingLike = { id: 'like123' }

			// Mock existing like
			mockLikesCollection.getFirstListItem.mockResolvedValue(existingLike)

			// Mock post data
			mockPostsCollection.getOne.mockResolvedValue({ id: postId, likeCount: 5 })
			mockPostsCollection.update.mockResolvedValue({ id: postId, likeCount: 4 })

			// Mock like deletion
			mockLikesCollection.delete.mockResolvedValue(true)

			const result = await toggleLike(postId)

			expect(mockLikesCollection.delete).toHaveBeenCalledWith('like123')
			expect(mockPostsCollection.update).toHaveBeenCalledWith(postId, { likeCount: 4 })
			expect(result).toEqual({ liked: false, likeCount: 4 })
		})

		it('should throw error when user is not authenticated', async () => {
			mockPb.authStore.model = null

			await expect(toggleLike('post123')).rejects.toThrow(
				'User must be authenticated to like posts'
			)
		})

		it('should handle minimum like count of 0', async () => {
			const postId = 'post123'
			const existingLike = { id: 'like123' }

			// Ensure user is authenticated
			mockPb.authStore.model = { id: 'user123' }

			mockLikesCollection.getFirstListItem.mockResolvedValue(existingLike)
			mockPostsCollection.getOne.mockResolvedValue({ id: postId, likeCount: 1 })
			mockPostsCollection.update.mockResolvedValue({ id: postId, likeCount: 0 })
			mockLikesCollection.delete.mockResolvedValue(true)

			const result = await toggleLike(postId)

			expect(result).toEqual({ liked: false, likeCount: 0 })
		})
	})

	describe('hasUserLikedPost', () => {
		it('should return true when user has liked the post', async () => {
			// Ensure user is authenticated
			mockPb.authStore.model = { id: 'user123' }

			mockLikesCollection.getFirstListItem.mockResolvedValue({ id: 'like123' })

			const result = await hasUserLikedPost('post123')

			expect(result).toBe(true)
			expect(mockLikesCollection.getFirstListItem).toHaveBeenCalledWith(
				'post = "post123" && user = "user123"'
			)
		})

		it('should return false when user has not liked the post', async () => {
			mockLikesCollection.getFirstListItem.mockRejectedValue(new Error('Not found'))

			const result = await hasUserLikedPost('post123')

			expect(result).toBe(false)
		})

		it('should return false when user is not authenticated', async () => {
			mockPb.authStore.model = null

			const result = await hasUserLikedPost('post123')

			expect(result).toBe(false)
		})
	})

	describe('getLikeCount', () => {
		it('should return the correct like count', async () => {
			mockLikesCollection.getList.mockResolvedValue({
				totalItems: 42
			})

			const result = await getLikeCount('post123')

			expect(result).toBe(42)
			expect(mockLikesCollection.getList).toHaveBeenCalledWith(1, 1, {
				filter: 'post = "post123"',
				totalCount: true
			})
		})

		it('should return 0 on error', async () => {
			mockLikesCollection.getList.mockRejectedValue(new Error('Database error'))

			const result = await getLikeCount('post123')

			expect(result).toBe(0)
		})
	})
})
