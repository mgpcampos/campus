import { fail } from '@sveltejs/kit'
import { message, superValidate, withFiles } from 'sveltekit-superforms/server'
import type { z } from 'zod'
import { t } from '$lib/i18n'
import { createPostSchema } from '$lib/schemas/post.js'
import { recordPostModerationSignal } from '$lib/services/moderation.js'
import { createPost } from '$lib/services/posts.js'
import { getUserMessage, normalizeError } from '$lib/utils/errors.ts'
import { withZod } from '$lib/validation'
import type { Actions, PageServerLoad } from './$types'

type CreatePostInput = z.infer<typeof createPostSchema>
type UserSpace = { id: string; name: string; avatar?: string }

type MessageOptions = NonNullable<Parameters<typeof message>[2]>
type MessageStatus = NonNullable<MessageOptions['status']>

const isMessageStatus = (value: unknown): value is MessageStatus =>
	typeof value === 'number' && value >= 400 && value <= 599

const createDefaultFormState = () =>
	withFiles({
		content: '',
		scope: 'global' as const,
		space: undefined,
		group: undefined,
		mediaType: undefined,
		attachments: [] as File[],
		mediaAltText: '',
		videoPoster: undefined as File | undefined,
		videoDuration: undefined as number | undefined,
		publishedAt: null as CreatePostInput['publishedAt']
	})

const isValidSpace = (space: unknown): space is UserSpace =>
	Boolean(
		space &&
			typeof space === 'object' &&
			'id' in space &&
			typeof (space as { id?: unknown }).id === 'string' &&
			'name' in space &&
			typeof (space as { name?: unknown }).name === 'string'
	)

export const load: PageServerLoad = async ({ parent, locals }) => {
	const parentData = await parent()

	const form = await superValidate(withZod(createPostSchema), {
		id: 'create-post',
		allowFiles: true,
		defaults: createDefaultFormState()
	})

	// Fetch user's joined spaces (for destination selector)
	let userSpaces: UserSpace[] = []
	if (locals.pb?.authStore?.isValid && locals.pb.authStore.model?.id) {
		try {
			// Fetch memberships with expanded space data
			const memberships = await locals.pb.collection('space_members').getList(1, 100, {
				filter: `user = "${locals.pb.authStore.model.id}"`,
				expand: 'space',
				sort: '-created'
			})

			// Map to simple objects with space details
			userSpaces = memberships.items
				.map((membership) => membership.expand?.space)
				.filter(isValidSpace)
				.map((space) => ({
					id: space.id,
					name: space.name,
					avatar: typeof space.avatar === 'string' ? space.avatar : undefined
				}))
		} catch (error) {
			console.error('Failed to load user spaces:', error)
			// Continue without spaces (user can still post globally)
		}
	}

	return {
		...parentData,
		form,
		userSpaces,
		meta: {
			title: 'Campus | Feed',
			description:
				'See the latest posts, research updates, and questions from across Campus in the collaborative community feed.',
			ogImage: '/og-default.png'
		}
	}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, withZod(createPostSchema), {
			id: 'create-post',
			allowFiles: true
		})

		const pbClient = locals.pb
		if (!pbClient || !pbClient.authStore?.isValid) {
			return message(
				form,
				{ type: 'error', text: 'You need to sign in to post updates.' },
				{ status: 401, removeFiles: true }
			)
		}

		if (!form.valid) {
			return fail(400, { form })
		}

		try {
			const postPayload: CreatePostInput = {
				...form.data,
				publishedAt: form.data.publishedAt ?? undefined
			}
			const createdPost = await createPost(postPayload, {
				pb: pbClient,
				emitModerationMetadata: async (metadata) =>
					await recordPostModerationSignal(metadata, { pbClient })
			})

			let hydratedPost = createdPost
			const createdPostId =
				typeof createdPost === 'object' &&
				createdPost !== null &&
				'id' in createdPost &&
				typeof (createdPost as { id?: unknown }).id === 'string'
					? (createdPost as { id: string }).id
					: null
			if (createdPostId) {
				try {
					hydratedPost = await pbClient.collection('posts').getOne(createdPostId, {
						expand: 'author,space,group'
					})
				} catch (err) {
					// Hydration failures shouldn't block the optimistic success path
					console.warn('posts:create:hydrateFailed', err)
				}
			}

			form.data = createDefaultFormState() as CreatePostInput

			return message(
				form,
				{ type: 'success', text: t('postForm.createdPost'), post: hydratedPost },
				{ removeFiles: true }
			)
		} catch (error) {
			const normalized = normalizeError(error, { context: 'feed:createPost' })
			const status = normalized.status ?? 500
			return message(
				form,
				{
					type: 'error',
					text: getUserMessage(normalized)
				},
				isMessageStatus(status) ? { status } : undefined
			)
		}
	}
}
