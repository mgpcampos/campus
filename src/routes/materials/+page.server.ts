import { error, fail } from '@sveltejs/kit'
import { superValidate } from 'sveltekit-superforms/server'
import { materialCreateSchema, materialSearchSchema } from '$lib/schemas/material.js'
import type { MaterialWithUploader } from '$lib/types/materials'
import { normalizeError } from '$lib/utils/errors.ts'
import { withZod } from '$lib/validation/index.js'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		// Build search form from query params
		const queryParams = Object.fromEntries(url.searchParams)
		const searchForm = await superValidate(queryParams, withZod(materialSearchSchema))

		// Build PocketBase filter - only show current user's materials
		const filters: string[] = [`uploader = "${locals.user!.id}"`]

		// Text search across searchTerms field
		if (searchForm.data.q) {
			const searchTerm = searchForm.data.q.toLowerCase().trim()
			filters.push(`searchTerms ~ "${searchTerm}"`)
		}

		const filterString = filters.join(' && ')

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
			)

		// Initialize upload form with file support
		const uploadForm = await superValidate(withZod(materialCreateSchema), {
			allowFiles: true
		})

		return {
			materials: results.items,
			total: results.totalItems,
			page: results.page,
			perPage: results.perPage,
			totalPages: results.totalPages,
			searchForm,
			uploadForm
		}
	} catch (err) {
		const normalized = normalizeError(err, { context: 'load materials' })
		console.error('Error loading materials:', normalized)
		return error(500, normalized.userMessage || 'Failed to load materials')
	}
}

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		if (!locals.pb.authStore.isValid) {
			return fail(401, { message: 'Authentication required' })
		}

		const uploadForm = await superValidate(request, withZod(materialCreateSchema), {
			allowFiles: true
		})

		if (!uploadForm.valid) {
			return fail(400, { uploadForm })
		}

		try {
			// Simple: just prepare form data with title, description, and file
			const formData = new FormData()
			formData.append('uploader', locals.user!.id)
			formData.append('title', uploadForm.data.title as string)
			formData.append('format', 'document') // Default format
			formData.append('visibility', 'public') // Default visibility

			if (uploadForm.data.description) {
				formData.append('description', uploadForm.data.description as string)
			}

			if (uploadForm.data.file) {
				formData.append('file', uploadForm.data.file as File)
			}

			// Create material record
			await locals.pb.collection('materials').create(formData)

			// Success - return message for superforms to handle
			return { uploadForm }
		} catch (err) {
			const normalized = normalizeError(err, { context: 'upload material' })
			console.error('Error uploading material:', normalized)

			return fail(500, {
				uploadForm,
				message: normalized.userMessage || 'Failed to upload material'
			})
		}
	}
}
