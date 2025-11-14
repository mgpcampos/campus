import { fail, redirect } from '@sveltejs/kit'
import { ClientResponseError } from 'pocketbase'
import { requireAuth } from '$lib/auth.js'
import { createSpace } from '$lib/services/spaces.js'
import { toErrorPayload } from '$lib/utils/errors.ts'

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
		const data = await request.formData()

		const name = /** @type {string | null} */ (data.get('name'))
		const slug = /** @type {string | null} */ (data.get('slug'))
		const description = /** @type {string | null} */ (data.get('description')) || ''
		const isPublicRaw = data.get('isPublic')
		const isPublic = isPublicRaw === 'on' || isPublicRaw === 'true'
		const avatar = /** @type {File | null} */ (data.get('avatar'))

		if (!name || !slug) {
			return fail(400, {
				error: 'Name and slug are required',
				values: { name, slug, description, isPublic }
			})
		}

		const normalizedSlug = slugify(slug)
		if (!normalizedSlug) {
			return fail(400, {
				error: 'Slug must contain letters or numbers and may include dashes.',
				values: { name, slug, description, isPublic }
			})
		}

		try {
			const safeSlug = normalizedSlug.replaceAll('"', String.raw`\"`)
			await locals.pb.collection('spaces').getFirstListItem(`slug = "${safeSlug}"`)
			return fail(400, {
				error: 'That slug is already in use. Pick another one.',
				values: { name, slug, description, isPublic }
			})
		} catch (lookupError) {
			if (!(lookupError instanceof ClientResponseError) || lookupError.status !== 404) {
				throw lookupError
			}
		}

		try {
			const payload = {
				name,
				slug: normalizedSlug,
				description,
				isPublic,
				...(avatar ? { avatar } : {})
			}
			const space = await createSpace(payload, { pb: locals.pb })
			const targetSlug = space.slug || space.id
			throw redirect(303, `/spaces/${targetSlug}`)
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e && e.status === 303) {
				throw e // Re-throw redirects
			}
			const errorPayload = toErrorPayload(e, { context: 'createSpace' })
			return fail(errorPayload.status || 500, {
				error: errorPayload.message,
				retryable: errorPayload.retryable,
				values: { name, slug, description, isPublic }
			})
		}
	}
}
