import { describe, it, expect } from 'vitest';
import { createPostSchema, updatePostSchema, postQuerySchema } from './post.js';

describe('Post Schemas', () => {
	describe('createPostSchema', () => {
		it('should validate valid post data', () => {
			const validData = {
				content: 'This is a test post',
				scope: 'global'
			};

			const result = createPostSchema.parse(validData);
			expect(result).toEqual(validData);
		});

		it('should set default scope to global', () => {
			const data = {
				content: 'Test post without scope'
			};

			const result = createPostSchema.parse(data);
			expect(result.scope).toBe('global');
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
		it('should validate update data', () => {
			const validData = {
				content: 'Updated post content'
			};

			const result = updatePostSchema.parse(validData);
			expect(result).toEqual(validData);
		});

		it('should reject empty content', () => {
			const invalidData = {
				content: ''
			};

			expect(() => updatePostSchema.parse(invalidData)).toThrow();
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