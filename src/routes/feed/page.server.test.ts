import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockForm = {
	valid: true,
	data: {
		content: 'Test post',
		scope: 'global' as const,
		space: undefined,
		group: undefined,
		mediaType: 'text' as const,
		attachments: [] as any[],
		mediaAltText: '',
		videoPoster: undefined,
		videoDuration: undefined,
		publishedAt: null
	}
};

const mockMessage = vi.fn();

vi.mock('sveltekit-superforms/server', () => ({
	superValidate: vi.fn(async () => mockForm),
	message: mockMessage,
	withFiles: <T>(value: T) => value
}));

const createPostMock = vi.fn();

vi.mock('$lib/services/posts.js', () => ({
	createPost: createPostMock
}));

const recordModerationMock = vi.fn();

vi.mock('$lib/services/moderation.js', () => ({
	recordPostModerationSignal: recordModerationMock
}));

const { actions } = await import('./+page.server');

describe('feed actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('hydrates created posts with expanded relations before returning', async () => {
		const createdPost = { id: 'abc123', content: 'Test post' };
		const expandedPost = {
			id: 'abc123',
			content: 'Test post',
			expand: { author: { id: 'user1', name: 'User One' } }
		};

		createPostMock.mockResolvedValue(createdPost);

		const getOne = vi.fn().mockResolvedValue(expandedPost);
		const collection = vi.fn((name: string) => {
			if (name === 'posts') {
				return { getOne } as const;
			}
			throw new Error(`Unexpected collection ${name}`);
		});

		const request = new Request('http://localhost/feed', {
			method: 'POST',
			body: new FormData()
		});

		await actions.default({
			request,
			locals: {
				pb: { collection }
			} as any
		} as unknown as Parameters<(typeof actions)['default']>[0]);

		expect(createPostMock).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'Test post', mediaType: 'text' }),
			expect.objectContaining({ pb: expect.anything() })
		);
		expect(collection).toHaveBeenCalledWith('posts');
		expect(getOne).toHaveBeenCalledWith('abc123', { expand: 'author,space,group' });
		expect(mockMessage).toHaveBeenCalledWith(
			mockForm,
			expect.objectContaining({
				type: 'success',
				post: expandedPost
			}),
			expect.objectContaining({ removeFiles: true })
		);
	});
});
