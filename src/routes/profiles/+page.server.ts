import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		// Fetch all academic profiles with expanded user data
		const profiles = await locals.pb.collection('profiles').getFullList({
			sort: '-created',
			expand: 'user',
			fields: 'id,user,displayName,role,department,biography,pronouns,links,created,expand.user.email'
		})

		// Fetch publication counts for each profile
		const profilesWithCounts = await Promise.all(
			profiles.map(async (profile) => {
				try {
					const publications = await locals.pb.collection('publications').getFullList({
						filter: `profile = "${profile.id}"`,
						fields: 'id'
					})

					return {
						...profile,
						publicationCount: publications.length
					}
				} catch (err) {
					console.warn(`Failed to fetch publications for profile ${profile.id}:`, err)
					return {
						...profile,
						publicationCount: 0
					}
				}
			})
		)

		return {
			profiles: profilesWithCounts,
			meta: {
				title: 'Academic Profiles | Campus',
				description:
					'Browse faculty, researchers, and students with their scientific production records',
				ogImage: '/og-default.png'
			}
		}
	} catch (err) {
		console.error('Error loading profiles:', err)
		return error(500, 'Failed to load profiles')
	}
}
