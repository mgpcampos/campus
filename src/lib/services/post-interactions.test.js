import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleLike } from './likes.js';
import { createComment, getComments } from './comments.js';

// Mock PocketBase
vi.mock('$lib/pocketbase.js', () => ({
	pb: {
		authStore: {
			model: { id: 'user123' }
		},
		collection: vi.fn()
	}
}));

describe('Post Interactions Integration', () => {
	/** @type {any} */ let mockLikesCollection;
	/** @type {any} */ let mockCommentsCollection;
	/** @type {any} */ let mockPostsCollection;
	/** @type {any} */ let mockPb;

	beforeEach(async () => {
		vi.clearAllMocks();
		
		const { pb } = await import('$lib/pocketbase.js');
		mockPb = pb;
		/** @type {any} */(mockPb.authStore).model = { id: 'user123' };
		
		mockLikesCollection = {
			getFirstListItem: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			getList: vi.fn()
		};
		
		mockCommentsCollection = {
			create: vi.fn(),
			getList: vi.fn(),
			getOne: vi.fn()
		};
		
		mockPostsCollection = {
			getOne: vi.fn(),
			update: vi.fn()
		};

		mockPb.collection.mockImplementation((/** @type {any} */ name) => {
			if (name === 'likes') return mockLikesCollection;
			if (name === 'comments') return mockCommentsCollection;
			if (name === 'posts') return mockPostsCollection;
			return {};
		});
	});

	it('should handle complete post interaction workflow', async () => {
		const postId = 'post123';
		
		// Setup initial post state
		mockPostsCollection.getOne.mockResolvedValue({ 
			id: postId, 
			likeCount: 0, 
			commentCount: 0 
		});

		// Test liking a post
		mockLikesCollection.getFirstListItem.mockRejectedValue(new Error('Not found'));
		mockLikesCollection.create.mockResolvedValue({ id: 'like123' });
		mockPostsCollection.update.mockResolvedValueOnce({ id: postId, likeCount: 1 });

		const likeResult = await toggleLike(postId);
		expect(likeResult).toEqual({ liked: true, likeCount: 1 });

		// Test adding a comment
		const commentContent = 'This is a great post!';
		const newComment = { 
			id: 'comment123', 
			content: commentContent, 
			post: postId, 
			author: 'user123' 
		};
		const expandedComment = { 
			...newComment, 
			expand: { 
				author: { 
					id: 'user123', 
					name: 'Test User', 
					username: 'testuser' 
				} 
			} 
		};

		mockCommentsCollection.create.mockResolvedValue(newComment);
		mockCommentsCollection.getOne.mockResolvedValue(expandedComment);
		mockPostsCollection.getOne.mockResolvedValue({ id: postId, commentCount: 0 });
		mockPostsCollection.update.mockResolvedValueOnce({ id: postId, commentCount: 1 });

		const commentResult = await createComment(postId, commentContent);
		expect(commentResult).toEqual(expandedComment);

		// Test getting comments
		mockCommentsCollection.getList.mockResolvedValue({
			items: [expandedComment],
			page: 1,
			totalPages: 1,
			totalItems: 1
		});

		const commentsResult = await getComments(postId);
		expect(commentsResult.items).toHaveLength(1);
		expect(commentsResult.items[0].content).toBe(commentContent);

		// Verify all interactions were called correctly
		expect(mockLikesCollection.create).toHaveBeenCalledWith({
			post: postId,
			user: 'user123'
		});
		expect(mockCommentsCollection.create).toHaveBeenCalledWith({
			post: postId,
			author: 'user123',
			content: commentContent
		});
		expect(mockPostsCollection.update).toHaveBeenCalledTimes(2); // Once for like, once for comment
	});

	it('should handle optimistic updates correctly', async () => {
		const postId = 'post123';
		
		// Test unliking a post (removing existing like)
		const existingLike = { id: 'like123' };
		mockLikesCollection.getFirstListItem.mockResolvedValue(existingLike);
		mockLikesCollection.delete.mockResolvedValue(true);
		mockPostsCollection.getOne.mockResolvedValue({ id: postId, likeCount: 5 });
		mockPostsCollection.update.mockResolvedValue({ id: postId, likeCount: 4 });

		const result = await toggleLike(postId);
		
		expect(mockLikesCollection.delete).toHaveBeenCalledWith('like123');
		expect(result).toEqual({ liked: false, likeCount: 4 });
	});

	it('should handle error scenarios gracefully', async () => {
		const postId = 'post123';
		
		// Test like error handling
		mockLikesCollection.getFirstListItem.mockRejectedValue(new Error('Not found'));
		mockLikesCollection.create.mockRejectedValue(new Error('Database error'));

		await expect(toggleLike(postId)).rejects.toThrow('Database error');

		// Test comment error handling
		mockCommentsCollection.create.mockRejectedValue(new Error('Database error'));

		await expect(createComment(postId, 'test comment')).rejects.toThrow('Database error');
	});
});