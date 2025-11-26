import { fail, redirect } from '@sveltejs/kit'
import { ClientResponseError } from 'pocketbase'
import { requireAuth } from '$lib/auth.js'
import { createSpace } from '$lib/services/spaces.js'

/**
 * Normalize a slug to a URL-safe format.
 * @param {string} value
 */
function slugify(value) {
	return value
		.trim()
		.toLowerCase()
		.replaceAll(/[^a-z0-9-]/g, '-')
		.replaceAll(/-+/g, '-')
		.replaceAll(/(?:^-)|(?:-$)/g, '')
}

/** @type {import('./$types').PageServerLoad} */
export function load({ url, locals }) {
	requireAuth(locals, url.pathname)
	return {}
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ url, request, locals }) => {
		requireAuth(locals, url.pathname)

		// Ensure user is authenticated
		const userId = locals.user?.id
		if (!userId) {
			return fail(401, { error: 'You must be logged in to create a space' })
		}

		const formData = await request.formData()

		const name = formData.get('name')?.toString().trim() || ''
		const slugRaw = formData.get('slug')?.toString().trim() || ''
		const description = formData.get('description')?.toString().trim() || ''
		const isPublicRaw = formData.get('isPublic')
		const isPublic = isPublicRaw === 'on' || isPublicRaw === 'true'
		const avatarFile = formData.get('avatar')
		const avatar = avatarFile instanceof File && avatarFile.size > 0 ? avatarFile : undefined

		// Validation
		if (!name) {
			return fail(400, {
				error: 'Space name is required',
				values: { name, slug: slugRaw, description, isPublic }
			})
		}

		if (!slugRaw) {
			return fail(400, {
				error: 'Space URL identifier is required',
				values: { name, slug: slugRaw, description, isPublic }
			})
		}

		const slug = slugify(slugRaw)
		if (!slug) {
			return fail(400, {
				error: 'URL identifier must contain letters or numbers',
				values: { name, slug: slugRaw, description, isPublic }
			})
		}

		// Check if slug is already taken
		try {
			const safeSlug = slug.replaceAll('"', '\\"')
			await locals.pb.collection('spaces').getFirstListItem(`slug = "${safeSlug}"`)
			// If we get here, slug exists
			return fail(400, {
				error: 'This URL identifier is already in use. Please choose another.',
				values: { name, slug: slugRaw, description, isPublic }
			})
		} catch (err) {
			// 404 means slug is available - that's what we want
			if (!(err instanceof ClientResponseError) || err.status !== 404) {
				// Some other error occurred
				console.error('Error checking slug availability:', err)
				return fail(500, {
					error: 'Failed to verify URL availability. Please try again.',
					values: { name, slug: slugRaw, description, isPublic }
				})
			}
		}

		// Create the space
		try {
			const space = await createSpace({
				name,
				slug,
				description,
				isPublic,
				avatar,
				userId,
				pb: locals.pb
			})

			// Redirect to the new space
			redirect(303, `/spaces/${space.slug || space.id}`)
		} catch (err) {
			// Handle redirect (it's thrown, not returned)
			if (err instanceof Error && 'status' in err && err.status === 303) {
				throw err
			}

			// Extract error message
			let errorMessage = 'Failed to create space. Please try again.'

			if (err instanceof ClientResponseError) {
				// Try to get field-specific errors from PocketBase
				const data = err.response?.data
				if (data && typeof data === 'object') {
					const fieldErrors = Object.entries(data)
						.filter(([_, v]) => v && typeof v === 'object' && 'message' in v)
						.map(([field, v]) => `${field}: ${v.message}`)
						.join('; ')
					if (fieldErrors) {
						errorMessage = fieldErrors
					}
				} else if (err.message) {
					errorMessage = err.message
				}
			} else if (err instanceof Error) {
				errorMessage = err.message
			}

			console.error('Space creation error:', err)

			return fail(400, {
				error: errorMessage,
				values: { name, slug: slugRaw, description, isPublic }
			})
		}
	}
}
