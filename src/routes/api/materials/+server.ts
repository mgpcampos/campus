import { json, error } from '@sveltejs/kit';
import { materialCreateSchema, materialSearchSchema } from '$lib/schemas/material.js';
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const queryParams = Object.fromEntries(url.searchParams);
		const validatedQuery = materialSearchSchema.parse(queryParams);

		// Build PocketBase filter
		const filters = [];

		// Text search across searchTerms field
		if (validatedQuery.q) {
			const searchTerm = validatedQuery.q.toLowerCase().trim();
			filters.push(`searchTerms ~ "${searchTerm}"`);
		}

		// Filter by tags
		if (validatedQuery.tags && validatedQuery.tags.length > 0) {
			const tagFilters = validatedQuery.tags.map(
				(tag) => `tags ~ "${tag.toLowerCase().replace(/"/g, '\\"')}"`
			);
			filters.push(`(${tagFilters.join(' || ')})`);
		}

		// Filter by format
		if (validatedQuery.format) {
			filters.push(`format = "${validatedQuery.format}"`);
		}

		// Filter by contributor
		if (validatedQuery.contributorId) {
			filters.push(`uploader = "${validatedQuery.contributorId}"`);
		}

		// Filter by visibility
		if (validatedQuery.visibility) {
			filters.push(`visibility = "${validatedQuery.visibility}"`);
		}

		// Filter by course code
		if (validatedQuery.courseCode) {
			filters.push(`courseCode = "${validatedQuery.courseCode}"`);
		}

		const filterString = filters.length > 0 ? filters.join(' && ') : '';

		// Determine sort order
		const sortField = validatedQuery.sort === 'recent' ? '-created' : '-created';

		// Fetch materials from PocketBase
		const result = await locals.pb
			.collection('materials')
			.getList(validatedQuery.page, validatedQuery.perPage, {
				filter: filterString,
				sort: sortField,
				expand: 'uploader'
			});

		return json({
			items: result.items,
			total: result.totalItems,
			page: result.page,
			perPage: result.perPage
		});
	} catch (err) {
		const n = normalizeError(err, { context: 'api:getMaterials' });
		console.error('Error fetching materials:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		const formData = await request.formData();

		// Extract tags array
		const tagsRaw = formData.get('tags');
		const tags = tagsRaw ? JSON.parse(tagsRaw.toString()) : [];

		// Extract file
		const fileEntry = formData.get('file');
		const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : undefined;

		const materialData = {
			title: formData.get('title'),
			description: formData.get('description') || undefined,
			courseCode: formData.get('courseCode') || undefined,
			tags,
			format: formData.get('format'),
			file,
			linkUrl: formData.get('linkUrl') || undefined,
			visibility: formData.get('visibility')
		};

		const validatedData = materialCreateSchema.parse(materialData);

		// Create material record in PocketBase
		const newMaterial = await locals.pb.collection('materials').create({
			uploader: locals.pb.authStore.record?.id,
			title: validatedData.title,
			description: validatedData.description,
			courseCode: validatedData.courseCode,
			tags: validatedData.tags || [],
			format: validatedData.format,
			file: validatedData.file,
			linkUrl: validatedData.linkUrl,
			visibility: validatedData.visibility
		});

		// Log material creation to analytics
		try {
			await locals.pb.collection('analytics_events').create({
				type: 'event',
				name: 'material_upload',
				sessionId: locals.sessionId || 'unknown',
				user: locals.pb.authStore.record?.id,
				metadata: {
					materialId: newMaterial.id,
					format: validatedData.format,
					visibility: validatedData.visibility
				}
			});
		} catch (analyticsError) {
			// Log but don't fail the request
			console.error('Failed to log material upload analytics:', analyticsError);
		}

		return json(newMaterial, { status: 201 });
	} catch (err) {
		const n = normalizeError(err, { context: 'api:createMaterial' });
		console.error('Error creating material:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}
