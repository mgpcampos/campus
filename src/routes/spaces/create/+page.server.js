import { fail, redirect } from '@sveltejs/kit'
import { ClientResponseError } from 'pocketbase'
import { requireAuth } from '$lib/auth.js'
import { createSpace } from '$lib/services/spaces.js'

/** @type {import('./$types').PageServerLoad} */
export function load({ url, locals }) {
	requireAuth(locals, url.pathname)
	return {}
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ url, request, locals }) => {
		requireAuth(locals, url.pathname)

		const userId = locals.user?.id
		if (!userId) {
			return fail(401, { error: 'You must be logged in to create a space' })
		}

		const formData = await request.formData()
		const name = formData.get('name')?.toString().trim() || ''
		const slug =
			formData
				.get('slug')
				?.toString()
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-]/g, '-')
				.replace(/-+/g, '-')
				.replace(/^-|-$/g, '') || ''
		const description = formData.get('description')?.toString().trim() || ''
		const avatarFile = formData.get('avatar')
		const avatar = avatarFile instanceof File && avatarFile.size > 0 ? avatarFile : undefined

		if (!name) {
			return fail(400, {
				error: 'Space name is required',
				values: { name, slug, description }
			})
		}
		if (!slug) {
			return fail(400, {
				error: 'Space URL is required',
				values: { name, slug, description }
			})
		}

		// Check slug availability
		try {
			await locals.pb
				.collection('spaces')
				.getFirstListItem(`slug = "${slug.replace(/"/g, '\\"')}"`)
			return fail(400, {
				error: 'This URL is already taken',
				values: { name, slug, description }
			})
		} catch (err) {
			if (!(err instanceof ClientResponseError) || err.status !== 404) {
				return fail(500, { error: 'Server error', values: { name, slug, description } })
			}
		}

		// Create space
		try {
			const space = await createSpace({
				name,
				slug,
				description,
				avatar,
				userId,
				pb: locals.pb
			})
			redirect(303, `/spaces/${space.slug || space.id}`)
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) throw err
			console.error('Space creation error:', err)
			const msg =
				err instanceof ClientResponseError
					? JSON.stringify(err.response?.data)
					: String(err)
			return fail(400, { error: msg, values: { name, slug, description } })
		}
	}
}
