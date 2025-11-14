import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock PocketBase before importing the service
const mockCollection = {
	create: vi.fn(),
	getList: vi.fn(),
	getOne: vi.fn(),
	update: vi.fn(),
	delete: vi.fn()
}

vi.mock('../pocketbase.js', () => ({
	pb: {
		authStore: {
			model: { id: 'user123' }
		},
		collection: vi.fn(() => mockCollection)
	}
}))

import { createPost, deletePost, getPost, getPosts, updatePost } from './posts.js'

describe('Posts Service', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCollection.create.mockResolvedValue({ id: 'post123', content: 'clean content' })
	})

	describe('createPost', () => {
		it('sanitizes content and emits moderation metadata', async () => {
			const emitModerationMetadata = vi.fn()
			const mockFile = new File(['image'], 'sample.png', { type: 'image/png' })
			const postData = {
				content: '<script>alert(1)</script><p>Hello campus</p>',
				scope: /** @type {'global'} */ ('global'),
				mediaType: /** @type {'images'} */ ('images'),
				attachments: [mockFile],
				mediaAltText: '  accessible media  '
			}

			// @ts-expect-no-error - mock data intentionally loose
			const result = await createPost(postData, { emitModerationMetadata })

			expect(result).toEqual({ id: 'post123', content: 'clean content' })
			expect(mockCollection.create).toHaveBeenCalledTimes(1)
			const formData = mockCollection.create.mock.calls[0][0]
			expect(formData).toBeInstanceOf(FormData)
			expect(formData.get('content')).toBe('<p>Hello campus</p>')
			expect(formData.get('mediaType')).toBe('images')
			expect(formData.get('mediaAltText')).toBe('accessible media')
			const attachments = formData.getAll('attachments')
			expect(attachments).toHaveLength(1)
			expect(attachments[0]).toBe(mockFile)
			expect(emitModerationMetadata).toHaveBeenCalledWith(
				expect.objectContaining({
					resource: 'post',
					scope: 'global',
					mediaType: 'images',
					attachmentCount: 1,
					hasAltText: true,
					postId: 'post123',
					authorId: 'user123'
				})
			)
		})

		it('normalizes blob attachments and poster metadata', async () => {
			const emitModerationMetadata = vi.fn()
			const videoBlob = new Blob(['video'], { type: 'video/mp4' })
			const posterBlob = new Blob(['poster'], { type: 'image/jpeg' })
			const postData = {
				content: '<p>Lecture recording</p>',
				scope: /** @type {'global'} */ ('global'),
				mediaType: /** @type {'video'} */ ('video'),
				attachments: [videoBlob],
				mediaAltText: 'Lecture walk-through',
				videoPoster: posterBlob,
				videoDuration: 45
			}

			// @ts-expect-no-error - mock data intentionally loose
			await createPost(postData, { emitModerationMetadata })

			const formData = mockCollection.create.mock.calls[0][0]
			expect(formData.get('mediaType')).toBe('video')
			expect(formData.get('videoDuration')).toBe('45')
			const videoPoster = formData.get('videoPoster')
			expect(videoPoster).toBeInstanceOf(File)
			expect((videoPoster instanceof File && videoPoster.name) || '').toBe('video-poster.jpg')
			const [attachment] = formData.getAll('attachments')
			expect(attachment).toBeInstanceOf(File)
			expect((attachment instanceof File && attachment.name) || '').toBe('attachment-1.mp4')
			expect(emitModerationMetadata).toHaveBeenCalledWith(
				expect.objectContaining({
					mediaType: 'video',
					hasPoster: true,
					videoDuration: 45,
					attachmentCount: 1
				})
			)
		})
	})

	describe('getPosts', () => {
		it('should fetch posts with default options', async () => {
			const mockResult = {
				items: [{ id: 'post1' }, { id: 'post2' }],
				page: 1,
				totalPages: 1
			}
			mockCollection.getList.mockResolvedValue(mockResult)

			const result = await getPosts()

			expect(mockCollection.getList).toHaveBeenCalledWith(1, 20, {
				filter: '',
				sort: '-created',
				expand: 'author,space,group'
			})
			expect(result).toEqual(mockResult)
		})

		it('should apply filters correctly', async () => {
			const mockResult = { items: [], page: 1, totalPages: 1 }
			mockCollection.getList.mockResolvedValue(mockResult)

			await getPosts({ scope: 'space', space: 'space123' })

			expect(mockCollection.getList).toHaveBeenCalledWith(1, 20, {
				filter: 'scope = "space" && space = "space123"',
				sort: '-created',
				expand: 'author,space,group'
			})
		})
	})

	describe('getPost', () => {
		it('should fetch a single post by ID', async () => {
			const mockPost = { id: 'post123', content: 'Test post' }
			mockCollection.getOne.mockResolvedValue(mockPost)

			const result = await getPost('post123')

			expect(mockCollection.getOne).toHaveBeenCalledWith('post123', {
				expand: 'author,space,group'
			})
			expect(result).toEqual(mockPost)
		})
	})

	describe('updatePost', () => {
		it('sanitizes payload and normalizes scheduling fields', async () => {
			const mockPost = { id: 'post123', content: 'Updated content' }
			mockCollection.update.mockResolvedValue(mockPost)

			const updateData = {
				content: '<script>alert(1)</script><p>Updated <strong>post</strong></p>',
				mediaAltText: '  sample alt  ',
				mediaType: 'images',
				videoDuration: '42.3',
				publishedAt: new Date('2025-10-06T12:34:56.000Z'),
				scope: 'group',
				group: 'group123'
			}
			const result = await updatePost('post123', updateData)

			expect(mockCollection.update).toHaveBeenCalledTimes(1)
			const [, payload] = mockCollection.update.mock.calls[0]
			expect(payload).toMatchObject({
				content: '<p>Updated <strong>post</strong></p>',
				mediaAltText: 'sample alt',
				mediaType: 'images',
				videoDuration: 42,
				publishedAt: '2025-10-06T12:34:56.000Z',
				scope: 'group',
				group: 'group123'
			})
			expect(result).toEqual(mockPost)
		})

		it('drops blank fields and ignores invalid publishedAt', async () => {
			mockCollection.update.mockResolvedValue({ id: 'post456' })
			await updatePost('post456', {
				content: '  Trim me  ',
				mediaAltText: '',
				publishedAt: '  '
			})
			const [, payload] = mockCollection.update.mock.calls[0]
			expect(payload).toMatchObject({ content: 'Trim me' })
			expect(Object.hasOwn(payload, 'mediaAltText')).toBe(true)
			expect(payload.mediaAltText).toBe('')
			expect(Object.hasOwn(payload, 'publishedAt')).toBe(true)
			expect(payload.publishedAt).toBeNull()
		})
	})

	describe('deletePost', () => {
		it('should delete a post', async () => {
			mockCollection.delete.mockResolvedValue(true)

			const result = await deletePost('post123')

			expect(mockCollection.delete).toHaveBeenCalledWith('post123')
			expect(result).toBe(true)
		})
	})
})
