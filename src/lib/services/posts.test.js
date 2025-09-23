import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PocketBase before importing the service
const mockCollection = {
	create: vi.fn(),
	getList: vi.fn(),
	getOne: vi.fn(),
	update: vi.fn(),
	delete: vi.fn()
};

vi.mock('../pocketbase.js', () => ({
	pb: {
		authStore: {
			model: { id: 'user123' }
		},
		collection: vi.fn(() => mockCollection)
	}
}));

import { createPost, getPosts, getPost, updatePost, deletePost } from './posts.js';

describe('Posts Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createPost', () => {
		it('should create a post with valid data', async () => {
			const mockPost = { id: 'post123', content: 'Test post', author: 'user123' };
			mockCollection.create.mockResolvedValue(mockPost);

			const postData = {
				content: 'Test post',
				scope: 'global'
			};

			// @ts-ignore - Mock test data

			const result = await createPost(postData);

			expect(mockCollection.create).toHaveBeenCalled();
			expect(result).toEqual(mockPost);
		});

		it('should handle file attachments', async () => {
			const mockPost = { id: 'post123', content: 'Test post with image' };
			mockCollection.create.mockResolvedValue(mockPost);

			const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
			const postData = {
				content: 'Test post with image',
				scope: 'global',
				attachments: [mockFile]
			};

			// @ts-ignore - Mock test data

			await createPost(postData);

			expect(mockCollection.create).toHaveBeenCalled();
			const formData = mockCollection.create.mock.calls[0][0];
			expect(formData).toBeInstanceOf(FormData);
		});
	});

	describe('getPosts', () => {
		it('should fetch posts with default options', async () => {
			const mockResult = {
				items: [{ id: 'post1' }, { id: 'post2' }],
				page: 1,
				totalPages: 1
			};
			mockCollection.getList.mockResolvedValue(mockResult);

			const result = await getPosts();

			expect(mockCollection.getList).toHaveBeenCalledWith(1, 20, {
				filter: '',
				sort: '-created',
				expand: 'author,space,group'
			});
			expect(result).toEqual(mockResult);
		});

		it('should apply filters correctly', async () => {
			const mockResult = { items: [], page: 1, totalPages: 1 };
			mockCollection.getList.mockResolvedValue(mockResult);

			await getPosts({ scope: 'space', space: 'space123' });

			expect(mockCollection.getList).toHaveBeenCalledWith(1, 20, {
				filter: 'scope = "space" && space = "space123"',
				sort: '-created',
				expand: 'author,space,group'
			});
		});
	});

	describe('getPost', () => {
		it('should fetch a single post by ID', async () => {
			const mockPost = { id: 'post123', content: 'Test post' };
			mockCollection.getOne.mockResolvedValue(mockPost);

			const result = await getPost('post123');

			expect(mockCollection.getOne).toHaveBeenCalledWith('post123', {
				expand: 'author,space,group'
			});
			expect(result).toEqual(mockPost);
		});
	});

	describe('updatePost', () => {
		it('should update a post', async () => {
			const mockPost = { id: 'post123', content: 'Updated content' };
			mockCollection.update.mockResolvedValue(mockPost);

			const updateData = { content: 'Updated content' };
			const result = await updatePost('post123', updateData);

			expect(mockCollection.update).toHaveBeenCalledWith('post123', updateData);
			expect(result).toEqual(mockPost);
		});
	});

	describe('deletePost', () => {
		it('should delete a post', async () => {
			mockCollection.delete.mockResolvedValue(true);

			const result = await deletePost('post123');

			expect(mockCollection.delete).toHaveBeenCalledWith('post123');
			expect(result).toBe(true);
		});
	});
});