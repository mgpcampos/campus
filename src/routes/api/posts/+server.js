import { json, error } from '@sveltejs/kit';
import { createPostSchema, postQuerySchema } from '$lib/schemas/post.js';
import { createPost, getPosts } from '$lib/services/posts.js';
import { validatePostMedia } from '$lib/utils/media.js';
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js';
import { trackFeedPerformance } from '$lib/server/analytics/feedPerformance';
import { recordPostModerationSignal } from '$lib/services/moderation.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
	try {
		const queryParams = Object.fromEntries(url.searchParams);
		// Allow either ?q= or legacy ?search= param
		if (!queryParams.q && queryParams.search) {
			queryParams.q = queryParams.search;
		}
		const validatedQuery = postQuerySchema.parse(queryParams);

		const result = await trackFeedPerformance(locals.pb, validatedQuery, () =>
			getPosts(validatedQuery, { pb: locals.pb })
		);
		// Add short-lived HTTP cache for anonymous global first page to leverage CDN/browser caching
		const headers = new Headers();
		const isCacheable =
			(!validatedQuery.scope || validatedQuery.scope === 'global') &&
			!validatedQuery.space &&
			!validatedQuery.group &&
			(validatedQuery.page == null || Number(validatedQuery.page) === 1) &&
			!validatedQuery.q &&
			(!validatedQuery.sort || validatedQuery.sort === 'new');
		if (isCacheable) {
			headers.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
		}
		return json(result, { headers });
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getPosts' });
		console.error('Error fetching posts:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	// Check authentication
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const formData = await request.formData();

		const rawFiles = /** @type {File[]} */ (
			formData.getAll('attachments').filter((f) => f instanceof File && f.size > 0)
		);
		const mediaTypeValue = (formData.get('mediaType') || 'text').toString();
		const mediaType =
			mediaTypeValue === 'images' || mediaTypeValue === 'video' ? mediaTypeValue : 'text';
		const posterEntry = formData.get('videoPoster');
		const videoPoster =
			posterEntry instanceof File && posterEntry.size > 0 ? posterEntry : undefined;
		const videoDurationRaw = formData.get('videoDuration');
		const videoDuration =
			typeof videoDurationRaw === 'string' && videoDurationRaw.trim().length > 0
				? Number.parseFloat(videoDurationRaw)
				: undefined;
		const publishedAtRaw = formData.get('publishedAt');
		const publishedAt =
			typeof publishedAtRaw === 'string' && publishedAtRaw.trim().length > 0
				? publishedAtRaw
				: undefined;
		const mediaAltTextValue = formData.get('mediaAltText');
		const mediaAltText = typeof mediaAltTextValue === 'string' ? mediaAltTextValue : undefined;

		const mediaValidation = validatePostMedia({
			mediaType,
			attachments: rawFiles,
			poster: videoPoster,
			videoDuration
		});
		if (!mediaValidation.valid) {
			return error(400, mediaValidation.errors.join('; '));
		}

		const postData = {
			content: formData.get('content'),
			scope: formData.get('scope') || 'global',
			space: formData.get('space') || undefined,
			group: formData.get('group') || undefined,
			attachments: rawFiles,
			mediaType,
			mediaAltText,
			videoPoster,
			videoDuration,
			publishedAt
		};

		const validatedData = createPostSchema.parse(postData);

		const newPost = await createPost(validatedData, {
			pb: locals.pb,
			emitModerationMetadata: async (metadata) =>
				await recordPostModerationSignal(metadata, { pbClient: locals.pb })
		});
		return json(newPost, { status: 201 });
	} catch (err) {
		const isZod = err instanceof Error && err.name === 'ZodError';
		const n = isZod
			? normalizeError(err, { context: 'api:createPost' })
			: normalizeError(err, { context: 'api:createPost' });
		console.error('Error creating post:', n.toString());
		const status = isZod ? 400 : n.status || 500;
		return json({ error: toErrorPayload({ ...n, status }) }, { status });
	}
}
