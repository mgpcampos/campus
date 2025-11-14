import { error, json } from '@sveltejs/kit'
import type { ProfileUpdateInput } from '$lib/../types/profiles.js'
import { getProfilePublications } from '$lib/server/profiles/publications.js'
import { normalizeError, toErrorPayload } from '$lib/utils/errors.ts'
import { getPocketBaseStatus } from '$lib/utils/pocketbase'

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const { profileId } = params

		// Fetch profile with user expansion
		const profile = await locals.pb.collection('profiles').getOne(profileId, {
			expand: 'user'
		})

		// Fetch publications for this profile
		const publications = await getProfilePublications(locals.pb, profileId)

		return json({
			profile: {
				...profile,
				publications
			}
		})
	} catch (err: unknown) {
		if (getPocketBaseStatus(err) === 404) {
			return error(404, 'Profile not found')
		}

		const n = normalizeError(err, { context: 'api:getProfile' })
		console.error('Error fetching profile:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PATCH({ params, request, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const { profileId } = params

		// Fetch existing profile to check permissions
		const existingProfile = await locals.pb.collection('profiles').getOne(profileId)

		// Check permissions: owner or admin
		if (existingProfile.user !== locals.user?.id && !locals.user?.is_admin) {
			return error(403, 'You do not have permission to update this profile')
		}

		const body = await request.json()

		const updateData: Partial<ProfileUpdateInput> = {}

		// Only update provided fields
		if (body.displayName !== undefined) {
			updateData.displayName = body.displayName
		}

		if (body.department !== undefined) {
			updateData.department = body.department
		}

		if (body.role !== undefined) {
			// Validate role
			const validRoles = ['student', 'professor', 'researcher', 'staff']
			if (!validRoles.includes(body.role)) {
				return error(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`)
			}
			updateData.role = body.role
		}

		if (body.biography !== undefined) {
			updateData.biography = body.biography
		}

		if (body.pronouns !== undefined) {
			updateData.pronouns = body.pronouns
		}

		if (body.links !== undefined) {
			updateData.links = body.links
		}

		if (Object.keys(updateData).length === 0) {
			return error(400, 'No valid fields to update')
		}

		// Update profile
		const profile = await locals.pb.collection('profiles').update(profileId, updateData)

		return json({
			profile,
			message: 'Profile updated successfully'
		})
	} catch (err: unknown) {
		if (getPocketBaseStatus(err) === 404) {
			return error(404, 'Profile not found')
		}

		const n = normalizeError(err, { context: 'api:updateProfile' })
		console.error('Error updating profile:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const { profileId } = params

		// Fetch existing profile to check permissions
		const existingProfile = await locals.pb.collection('profiles').getOne(profileId)

		// Check permissions: owner or admin
		if (existingProfile.user !== locals.user?.id && !locals.user?.is_admin) {
			return error(403, 'You do not have permission to delete this profile')
		}

		await locals.pb.collection('profiles').delete(profileId)

		return json({
			message: 'Profile deleted successfully'
		})
	} catch (err: unknown) {
		if (getPocketBaseStatus(err) === 404) {
			return error(404, 'Profile not found')
		}

		const n = normalizeError(err, { context: 'api:deleteProfile' })
		console.error('Error deleting profile:', n.toString())
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 })
	}
}
