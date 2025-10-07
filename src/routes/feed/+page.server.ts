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

export const load: PageServerLoad = async () => {
	const form = await superValidate(withZod(createPostSchema), {
		id: 'create-post',
		allowFiles: true,
		defaults: createDefaultFormState()
	});

	return {
		form
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, withZod(createPostSchema), {
			id: 'create-post',
			allowFiles: true
		});

		if (!locals.pb.authStore.isValid) {
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
			const newPost = await createPost(postPayload, {
				pb: locals.pb,
				emitModerationMetadata: async (metadata) =>
					await recordPostModerationSignal(metadata, { pbClient: locals.pb })
			});

			form.data = createDefaultFormState() as CreatePostInput;

			return message(
				form,
				{ type: 'success', text: 'Post published successfully!', post: newPost },
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
