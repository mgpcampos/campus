import { describe, it, expect } from 'vitest';
import { createPostSchema, updatePostSchema, postQuerySchema } from './post.js';

/**
 * @param {string} name
 * @param {string} type
 */
const createMockFile = (name, type) => ({
	name,
	type,
	size: 1024,
	arrayBuffer: () => Promise.resolve(new ArrayBuffer(1))
});

describe('Post Schemas', () => {
	describe('createPostSchema', () => {
		it('should validate text-only post data with defaults', () => {
			const validData = {
				content: 'This is a test post'
			};

			const result = createPostSchema.parse(validData);
			expect(result.scope).toBe('global');
			expect(result.mediaType).toBe('text');
			expect(result.attachments).toEqual([]);
		});

		it('should set default scope to global', () => {
			const data = {
				content: 'Test post without scope'
			};

			const result = createPostSchema.parse(data);
			expect(result.scope).toBe('global');
		});

		it('should validate image posts with alt text', () => {
			const files = [createMockFile('image.jpg', 'image/jpeg')];
			const data = {
				content: 'Look at this image',
				scope: 'global',
				mediaType: 'images',
				attachments: files,
				mediaAltText: 'A test image'
			};

			const result = createPostSchema.parse(data);
			expect(result.attachments).toHaveLength(1);
			expect(result.mediaAltText).toBe('A test image');
		});

		it('should reject image posts without alt text', () => {
			const files = [createMockFile('image.jpg', 'image/jpeg')];
			const data = {
				content: 'Look at this image',
				scope: 'global',
				mediaType: 'images',
				attachments: files
			};

			expect(() => createPostSchema.parse(data)).toThrowError(
				/Alt text is required for image posts/
			);
		});

		it('should validate video posts with poster and duration', () => {
			const videoFile = createMockFile('video.mp4', 'video/mp4');
			const posterFile = createMockFile('poster.jpg', 'image/jpeg');
			const data = {
				content: 'Watch this video',
				scope: 'global',
				mediaType: 'video',
				attachments: [videoFile],
				mediaAltText: 'Demonstrating the project',
				videoPoster: posterFile,
				videoDuration: 120
			};

			const result = createPostSchema.parse(data);
			expect(result.attachments).toHaveLength(1);
			expect(result.videoDuration).toBe(120);
		});

		it('should reject video posts without poster or duration', () => {
			const videoFile = createMockFile('video.mp4', 'video/mp4');
			const data = {
				content: 'Watch this video',
				scope: 'global',
				mediaType: 'video',
				attachments: [videoFile],
				mediaAltText: 'Project walkthrough'
			};

			expect(() => createPostSchema.parse(data)).toThrow();
		});

		it('should reject empty content', () => {
			const invalidData = {
				content: '',
				scope: 'global'
			};

			expect(() => createPostSchema.parse(invalidData)).toThrow();
		});

		it('should reject content over 2000 characters', () => {
			const invalidData = {
				content: 'a'.repeat(2001),
				scope: 'global'
			};

			expect(() => createPostSchema.parse(invalidData)).toThrow();
		});

		it('should validate space and group fields', () => {
			const validData = {
				content: 'Test post',
				scope: 'space',
				space: 'space123'
			};

			const result = createPostSchema.parse(validData);
			expect(result.space).toBe('space123');
		});

		it('should reject invalid scope values', () => {
			const invalidData = {
				content: 'Test post',
				scope: 'invalid'
			};

			expect(() => createPostSchema.parse(invalidData)).toThrow();
		});
	});

	describe('updatePostSchema', () => {
		it('should validate update content', () => {
			const validData = {
				content: 'Updated post content'
			};

			const result = updatePostSchema.parse(validData);
			expect(result.content).toBe('Updated post content');
		});

		it('should reject empty content when provided', () => {
			const invalidData = {
				content: ''
			};

			expect(() => updatePostSchema.parse(invalidData)).toThrow();
		});

		it('should require mediaType when updating media fields', () => {
			const invalidData = {
				attachments: [createMockFile('image.jpg', 'image/jpeg')]
			};

			expect(() => updatePostSchema.parse(invalidData)).toThrow(/mediaType/);
		});

		it('should validate media updates when mediaType included', () => {
			const data = {
				mediaType: 'images',
				attachments: [createMockFile('image.jpg', 'image/jpeg')],
				mediaAltText: 'Accessible description'
			};

			const result = updatePostSchema.parse(data);
			expect(result.mediaType).toBe('images');
		});
	});

	describe('postQuerySchema', () => {
		it('should parse valid query parameters', () => {
			const validQuery = {
				page: '2',
				perPage: '10',
				scope: 'global'
			};

			const result = postQuerySchema.parse(validQuery);
			expect(result.page).toBe(2);
			expect(result.perPage).toBe(10);
			expect(result.scope).toBe('global');
		});

		it('should set default values', () => {
			const result = postQuerySchema.parse({});
			expect(result.page).toBe(1);
			expect(result.perPage).toBe(20);
		});

		it('should enforce minimum page value', () => {
			const invalidQuery = {
				page: '0'
			};

			expect(() => postQuerySchema.parse(invalidQuery)).toThrow();
		});

		it('should enforce maximum perPage value', () => {
			const invalidQuery = {
				perPage: '100'
			};

			expect(() => postQuerySchema.parse(invalidQuery)).toThrow();
		});
	});
});
