import { json, error } from '@sveltejs/kit';
import { createPostSchema, postQuerySchema } from '$lib/schemas/post.js';
import { createPost, getPosts } from '$lib/services/posts.js';
import { validateImages } from '$lib/utils/media.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const queryParams = Object.fromEntries(url.searchParams);
		const validatedQuery = postQuerySchema.parse(queryParams);
		
		const result = await getPosts(validatedQuery);
		
		return json(result);
	} catch (err) {
		console.error('Error fetching posts:', err);
		return error(500, 'Failed to fetch posts');
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

		const rawFiles = /** @type {File[]} */(formData.getAll('attachments').filter(f => f instanceof File && f.size > 0));

		// Validate images (server-side defense in depth)
		const { valid, errors: imageErrors } = validateImages(rawFiles);
		if (!valid) {
			return error(400, imageErrors.join('; '));
		}

		// Extract form fields
		const postData = {
			content: formData.get('content'),
			scope: formData.get('scope') || 'global',
			space: formData.get('space') || undefined,
			group: formData.get('group') || undefined,
			attachments: rawFiles
		};

		const validatedData = createPostSchema.parse(postData);

		// For now, we directly forward files to PocketBase. (Optional future: optimize server-side via sharp.)
		const newPost = await createPost(validatedData);
		return json(newPost, { status: 201 });
	} catch (err) {
		console.error('Error creating post:', err);
		if (err instanceof Error && err.name === 'ZodError') {
			return error(400, 'Invalid post data');
		}
		return error(500, 'Failed to create post');
	}
}