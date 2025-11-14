import { error } from '@sveltejs/kit'
import type {
	ContributionRole,
	ProfilePublicationRecord,
	PublicationRecord
} from '$lib/../types/profiles.js'

type PublicationLinkRecord = ProfilePublicationRecord & {
	expand?: {
		publication?: PublicationRecord
	}
}

type PublicationWithRole = PublicationRecord & {
	contributionRole?: ContributionRole
	linkId: string
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		const { profileId } = params

		// Fetch profile with user and publications
		const profile = await locals.pb.collection('profiles').getOne(profileId, {
			expand: 'user'
		})

		// Fetch publications
		const publicationLinks = await locals.pb
			.collection('profile_publications')
			.getFullList<PublicationLinkRecord>({
				filter: `profile = "${profileId}"`,
				expand: 'publication,publication.material',
				sort: '-publication.year,-created'
			})

		const publications: PublicationWithRole[] = []
		for (const link of publicationLinks) {
			const publication = link.expand?.publication
			if (!publication) continue
			publications.push({
				...publication,
				contributionRole: link.contributionRole,
				linkId: link.id
			})
		}

		return {
			profile,
			publications
		}
	} catch (err: unknown) {
		const status =
			typeof err === 'object' && err && 'status' in err
				? (err as { status?: number }).status
				: undefined
		if (status === 404) {
			return error(404, 'Profile not found')
		}
		throw error(500, 'Error loading profile')
	}
}
