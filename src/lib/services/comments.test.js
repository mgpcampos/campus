import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createComment,
	getComments,
	updateComment,
	deleteComment,
	getCommentCount
} from './comments.js';

// Mock PocketBase
vi.mock('../pocketbase.js', () => ({
	pb: {
		authStore: {
			model: { id: 'user123' }
		},
		collection: vi.fn()
	}
}));

describe('Comments Service', () => {
	/** @type {any} */ let mockCommentsCollection;
	/** @type {any} */ let mockPostsCollection;
	/** @type {any} */ let mockPb;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import the mocked module
		const { pb } = await import('../pocketbase.js');
		mockPb = pb;

		// Reset auth state
		mockPb.authStore.model = { id: 'user123' };

		mockCommentsCollection = {
			create: vi.fn(),
			getList: vi.fn(),
			getOne: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		};

		mockPostsCollection = {
			getOne: vi.fn(),
			update: vi.fn()
		};

		mockPb.collection.mockImplementation((/** @type {any} */ name) => {
			if (name === 'comments') return mockCommentsCollection;
			if (name === 'posts') return mockPostsCollection;
			return {};
		});
	});

	describe('createComment', () => {
		it('should create a comment and update post comment count', async () => {
			const postId = 'post123';
			const content = 'This is a test comment';
			const newComment = { id: 'comment123', content, post: postId, author: 'user123' };
			const expandedComment = { ...newComment, expand: { author: { name: 'Test User' } } };

			mockCommentsCollection.create.mockResolvedValue(newComment);
			mockCommentsCollection.getOne.mockResolvedValue(expandedComment);
			mockPostsCollection.getOne.mockResolvedValue({ id: postId, commentCount: 5 });
			mockPostsCollection.update.mockResolvedValue({ id: postId, commentCount: 6 });

			const result = await createComment(postId, content, undefined);

			expect(mockCommentsCollection.create).toHaveBeenCalledWith({
				post: postId,
				author: 'user123',
				content: content
			});
			expect(mockPostsCollection.update).toHaveBeenCalledWith(postId, { commentCount: 6 });
			expect(result).toEqual(expandedComment);
		});

		it('should throw error when user is not authenticated', async () => {
			mockPb.authStore.model = null;

			await expect(createComment('post123', 'test', undefined)).rejects.toThrow(
				'User must be authenticated to comment'
			);
		});

		it('should throw error when content is empty', async () => {
			// Ensure user is authenticated
			mockPb.authStore.model = { id: 'user123' };

			await expect(createComment('post123', '', undefined)).rejects.toThrow(
				'Comment content cannot be empty'
			);
			await expect(createComment('post123', '   ', undefined)).rejects.toThrow(
				'Comment content cannot be empty'
			);
		});

		it('should trim whitespace from content', async () => {
			const postId = 'post123';
			const content = '  This is a test comment  ';
			const trimmedContent = 'This is a test comment';

			// Ensure user is authenticated
			mockPb.authStore.model = { id: 'user123' };

			mockCommentsCollection.create.mockResolvedValue({ id: 'comment123' });
			mockCommentsCollection.getOne.mockResolvedValue({
				id: 'comment123',
				content: trimmedContent
			});
			mockPostsCollection.getOne.mockResolvedValue({ id: postId, commentCount: 0 });
			mockPostsCollection.update.mockResolvedValue({ id: postId, commentCount: 1 });

			await createComment(postId, content, undefined);

			expect(mockCommentsCollection.create).toHaveBeenCalledWith({
				post: postId,
				author: 'user123',
				content: trimmedContent
			});
		});
	});

	describe('getComments', () => {
		it('should get comments for a post with default pagination', async () => {
			const postId = 'post123';
			const mockComments = {
				items: [
					{ id: 'comment1', content: 'First comment' },
					{ id: 'comment2', content: 'Second comment' }
				],
				page: 1,
				totalPages: 1
			};

			mockCommentsCollection.getList.mockResolvedValue(mockComments);

			const result = await getComments(postId);

			expect(mockCommentsCollection.getList).toHaveBeenCalledWith(1, 50, {
				filter: `post = "${postId}"`,
				sort: 'created',
				expand: 'author'
			});
			expect(result).toEqual(mockComments);
		});

		it('should get comments with custom pagination', async () => {
			const postId = 'post123';
			const options = { page: 2, perPage: 10 };

			mockCommentsCollection.getList.mockResolvedValue({ items: [] });

			await getComments(postId, options);

			expect(mockCommentsCollection.getList).toHaveBeenCalledWith(2, 10, {
				filter: `post = "${postId}"`,
				sort: 'created',
				expand: 'author'
			});
		});
	});

	describe('updateComment', () => {
		it('should update comment content', async () => {
			const commentId = 'comment123';
			const newContent = 'Updated comment content';
			const updatedComment = { id: commentId, content: newContent };

			mockCommentsCollection.update.mockResolvedValue(updatedComment);

			const result = await updateComment(commentId, newContent);

			expect(mockCommentsCollection.update).toHaveBeenCalledWith(commentId, {
				content: newContent
			});
			expect(result).toEqual(updatedComment);
		});

		it('should throw error when content is empty', async () => {
			await expect(updateComment('comment123', '')).rejects.toThrow(
				'Comment content cannot be empty'
			);
			await expect(updateComment('comment123', '   ')).rejects.toThrow(
				'Comment content cannot be empty'
			);
		});

		it('should trim whitespace from content', async () => {
			const commentId = 'comment123';
			const content = '  Updated content  ';
			const trimmedContent = 'Updated content';

			mockCommentsCollection.update.mockResolvedValue({ id: commentId, content: trimmedContent });

			await updateComment(commentId, content);

			expect(mockCommentsCollection.update).toHaveBeenCalledWith(commentId, {
				content: trimmedContent
			});
		});
	});

	describe('deleteComment', () => {
		it('should delete comment and update post comment count', async () => {
			const commentId = 'comment123';
			const postId = 'post123';

			mockCommentsCollection.delete.mockResolvedValue(true);
			mockPostsCollection.getOne.mockResolvedValue({ id: postId, commentCount: 5 });
			mockPostsCollection.update.mockResolvedValue({ id: postId, commentCount: 4 });

			const result = await deleteComment(commentId, postId);

			expect(mockCommentsCollection.delete).toHaveBeenCalledWith(commentId);
			expect(mockPostsCollection.update).toHaveBeenCalledWith(postId, { commentCount: 4 });
			expect(result).toBe(true);
		});

		it('should handle minimum comment count of 0', async () => {
			const commentId = 'comment123';
			const postId = 'post123';

			mockCommentsCollection.delete.mockResolvedValue(true);
			mockPostsCollection.getOne.mockResolvedValue({ id: postId, commentCount: 1 });
			mockPostsCollection.update.mockResolvedValue({ id: postId, commentCount: 0 });

			await deleteComment(commentId, postId);

			expect(mockPostsCollection.update).toHaveBeenCalledWith(postId, { commentCount: 0 });
		});
	});

	describe('getCommentCount', () => {
		it('should return the correct comment count', async () => {
			mockCommentsCollection.getList.mockResolvedValue({
				totalItems: 15
			});

			const result = await getCommentCount('post123');

			expect(result).toBe(15);
			expect(mockCommentsCollection.getList).toHaveBeenCalledWith(1, 1, {
				filter: 'post = "post123"',
				totalCount: true
			});
		});

		it('should return 0 on error', async () => {
			mockCommentsCollection.getList.mockRejectedValue(new Error('Database error'));

			const result = await getCommentCount('post123');

			expect(result).toBe(0);
		});
	});
});
