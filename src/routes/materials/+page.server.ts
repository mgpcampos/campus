import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { materialCreateSchema, materialSearchSchema } from '$lib/schemas/material.js';
import { withZod } from '$lib/validation/index.js';
import { normalizeError } from '$lib/utils/errors.js';
import type { MaterialWithUploader } from '$lib/types/materials';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required');
	}

	try {
		// Build search form from query params
		const queryParams = Object.fromEntries(url.searchParams);
		const searchForm = await superValidate(queryParams, withZod(materialSearchSchema));

		// Build PocketBase filter
		const filters: string[] = [];

		// Text search across searchTerms field
		if (searchForm.data.q) {
			const searchTerm = searchForm.data.q.toLowerCase().trim();
			filters.push(`searchTerms ~ "${searchTerm}"`);
		}

		// Filter by tags
		if (searchForm.data.tags && searchForm.data.tags.length > 0) {
			const tagFilters = searchForm.data.tags.map(
				(tag: string) => `tags ~ "${tag.toLowerCase().replace(/"/g, '\\"')}"`
			);
			filters.push(`(${tagFilters.join(' || ')})`);
		}

		// Filter by format
		if (searchForm.data.format) {
			filters.push(`format = "${searchForm.data.format}"`);
		}

		// Filter by visibility
		if (searchForm.data.visibility) {
			filters.push(`visibility = "${searchForm.data.visibility}"`);
		}

		// Filter by course code
		if (searchForm.data.courseCode) {
			filters.push(`courseCode = "${searchForm.data.courseCode}"`);
		}

		const filterString = filters.length > 0 ? filters.join(' && ') : '';

		// Fetch materials with expanded uploader info
		const results = await locals.pb
			.collection('materials')
			.getList<MaterialWithUploader>(
				(searchForm.data.page as number) || 1,
				(searchForm.data.perPage as number) || 20,
				{
					filter: filterString,
					sort: searchForm.data.sort === 'relevance' ? '-created' : '-created',
					expand: 'uploader'
				}
			);

		// Initialize upload form
		const uploadForm = await superValidate(withZod(materialCreateSchema));

		return {
			materials: results.items,
			total: results.totalItems,
			page: results.page,
			perPage: results.perPage,
			totalPages: results.totalPages,
			searchForm,
			uploadForm
		};
	} catch (err) {
		const normalized = normalizeError(err, { context: 'load materials' });
		console.error('Error loading materials:', normalized);
		return error(500, normalized.userMessage || 'Failed to load materials');
	}
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' });
		}

		try {
			const uploadForm = await superValidate(request, withZod(materialCreateSchema));

			if (!uploadForm.valid) {
				return fail(400, { uploadForm });
			}

			// Prepare form data for PocketBase
			const formData = new FormData();
			formData.append('uploader', locals.user!.id);
			formData.append('title', uploadForm.data.title as string);
			formData.append('format', uploadForm.data.format as string);
			formData.append('visibility', uploadForm.data.visibility as string);

			if (uploadForm.data.description) {
				formData.append('description', uploadForm.data.description as string);
			}

			if (uploadForm.data.courseCode) {
				formData.append('courseCode', uploadForm.data.courseCode as string);
			}

			if (uploadForm.data.tags && uploadForm.data.tags.length > 0) {
				uploadForm.data.tags.forEach((tag: string) => {
					formData.append('tags', tag);
				});
			}

			if (uploadForm.data.keywords) {
				formData.append('keywords', uploadForm.data.keywords as string);
			}

			// Handle file or link
			if (uploadForm.data.file) {
				formData.append('file', uploadForm.data.file as File);
			}

			if (uploadForm.data.linkUrl) {
				formData.append('linkUrl', uploadForm.data.linkUrl as string);
			}

			// Create material record
			const material = await locals.pb.collection('materials').create(formData);

			// Log analytics event
			try {
				await locals.pb.collection('analytics_events').create({
					eventType: 'material_upload',
					userId: locals.user!.id,
					metadata: {
						materialId: material.id,
						format: uploadForm.data.format,
						visibility: uploadForm.data.visibility
					}
				});
			} catch (analyticsErr) {
				console.error('Failed to log material upload analytics:', analyticsErr);
			}

			return { uploadForm, success: true };
		} catch (err) {
			const normalized = normalizeError(err, { context: 'upload material' });
			console.error('Error uploading material:', normalized);
			return fail(500, {
				message: normalized.userMessage || 'Failed to upload material'
			});
		}
	}
};
