import { superValidate, message, withFiles } from 'sveltekit-superforms/server';
import { fail } from '@sveltejs/kit';
import { createPostSchema } from '$lib/schemas/post.js';
import { withZod } from '$lib/validation';
import { createPost } from '$lib/services/posts.js';
import { normalizeError, getUserMessage } from '$lib/utils/errors.js';
import { recordPostModerationSignal } from '$lib/services/moderation.js';
import type { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

type CreatePostInput = z.infer<typeof createPostSchema>;

const createDefaultFormState = () =>
	withFiles({
		content: '',
		scope: 'global' as const,
		space: undefined,
		group: undefined,
		mediaType: 'text' as const,
		attachments: [] as File[],
		mediaAltText: '',
		videoPoster: undefined as File | undefined,
		videoDuration: undefined as number | undefined,
		publishedAt: null as CreatePostInput['publishedAt']
	});

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	const form = await superValidate(withZod(createPostSchema), {
		id: 'create-post',
		allowFiles: true,
		defaults: createDefaultFormState()
	});

	return {
		...parentData,
		form,
		meta: {
			title: 'Campus | Feed',
			description:
				'See the latest posts, research updates, and questions from across Campus in the collaborative community feed.',
			ogImage: '/og-default.png'
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, withZod(createPostSchema), {
			id: 'create-post',
			allowFiles: true
		});

		const pbClient = locals.pb;
		if (!pbClient || !pbClient.authStore?.isValid) {
			return message(
				form,
				{ type: 'error', text: 'You need to sign in to post updates.' },
				{ status: 401, removeFiles: true }
			);
		}

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const postPayload: CreatePostInput = {
				...form.data,
				publishedAt: form.data.publishedAt ?? undefined
			};
			const createdPost = await createPost(postPayload, {
				pb: pbClient,
				emitModerationMetadata: async (metadata) =>
					await recordPostModerationSignal(metadata, { pbClient })
			});

			let hydratedPost = createdPost;
			const createdPostId =
				typeof createdPost === 'object' &&
				createdPost !== null &&
				'id' in createdPost &&
				typeof (createdPost as { id?: unknown }).id === 'string'
					? (createdPost as { id: string }).id
					: null;
			if (createdPostId) {
				try {
					hydratedPost = await pbClient.collection('posts').getOne(createdPostId, {
						expand: 'author,space,group'
					});
				} catch (err) {
					// Hydration failures shouldn't block the optimistic success path
					console.warn('posts:create:hydrateFailed', err);
				}
			}

			form.data = createDefaultFormState() as CreatePostInput;

			return message(
				form,
				{ type: 'success', text: 'Post published successfully!', post: hydratedPost },
				{ removeFiles: true }
			);
		} catch (error) {
			const normalized = normalizeError(error, { context: 'feed:createPost' });
			return message(
				form,
				{
					type: 'error',
					text: getUserMessage(normalized)
				},
				{ status: normalized.status ?? 500 }
			);
		}
	}
};
