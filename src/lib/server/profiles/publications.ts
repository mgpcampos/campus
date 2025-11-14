/**
 * Publication dedupe and slug generation utilities
 * Enforces DOI/title uniqueness per research decisions
 */

import type PocketBase from 'pocketbase'
import {
	checkPublicationExists,
	createPublicationRecord,
	generatePublicationSlugHash,
	getProfilePublications,
	linkPublicationToProfile
} from './types.js'

export {
	generatePublicationSlugHash,
	checkPublicationExists,
	createPublicationRecord,
	linkPublicationToProfile,
	getProfilePublications
}

/**
 * Add a publication to a profile with full deduplication logic
 * This is the main entry point for adding publications through the API
 *
 * @param pb - PocketBase client
 * @param profileId - Profile ID to add publication to
 * @param input - Publication details
 * @returns The publication record and link information
 */
type PublicationInput = {
	title: string
	doi?: string
	year?: number
	venue?: string
	abstract?: string
	authors?: Array<{ name: string; affiliation?: string }>
	materialId?: string
	contributionRole?: 'author' | 'editor' | 'advisor'
}

export async function addPublicationToProfile(
	pb: PocketBase,
	profileId: string,
	input: PublicationInput
) {
	// Create or find existing publication record
	const publication = await createPublicationRecord(pb, input)

	// Link to profile
	const link = await linkPublicationToProfile(
		pb,
		profileId,
		publication.id,
		input.contributionRole || 'author'
	)

	return {
		publication,
		link,
		wasNewPublication: !link.created || link.created === link.updated
	}
}

/**
 * Remove a publication from a profile (unlinks but doesn't delete the publication record)
 *
 * @param pb - PocketBase client
 * @param profileId - Profile ID
 * @param publicationId - Publication ID to remove
 */
export async function removePublicationFromProfile(
	pb: PocketBase,
	profileId: string,
	publicationId: string
): Promise<void> {
	try {
		const link = await pb
			.collection('profile_publications')
			.getFirstListItem(`profile = "${profileId}" && publication = "${publicationId}"`)

		if (link) {
			await pb.collection('profile_publications').delete(link.id)
		}
	} catch (err: unknown) {
		const status =
			typeof err === 'object' && err && 'status' in err
				? (err as { status?: number }).status
				: undefined
		// If 404, publication wasn't linked anyway
		if (status !== 404) {
			throw err
		}
	}
}

/**
 * Bulk import publications for a profile
 * Useful for importing from external sources like ORCID, Google Scholar, etc.
 *
 * @param pb - PocketBase client
 * @param profileId - Profile ID
 * @param publications - Array of publication inputs
 * @returns Summary of import results
 */
export async function bulkImportPublications(
	pb: PocketBase,
	profileId: string,
	publications: PublicationInput[]
) {
	const results = {
		imported: 0,
		skipped: 0,
		errors: [] as Array<{ title: string; error: string }>
	}

	for (const pub of publications) {
		try {
			const result = await addPublicationToProfile(pb, profileId, pub)

			if (result.wasNewPublication) {
				results.imported++
			} else {
				results.skipped++
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			results.errors.push({
				title: pub.title,
				error: message
			})
		}
	}

	return results
}

/**
 * Search for publications across all profiles
 *
 * @param pb - PocketBase client
 * @param query - Search query string
 * @param filters - Optional filters
 * @returns List of matching publications with profile information
 */
export async function searchPublications(
	pb: PocketBase,
	query: string,
	filters?: {
		year?: number
		yearMin?: number
		yearMax?: number
		venue?: string
	}
) {
	let filter = `title ~ "${query}" || abstract ~ "${query}"`

	if (filters?.year) {
		filter += ` && year = ${filters.year}`
	}
	if (filters?.yearMin) {
		filter += ` && year >= ${filters.yearMin}`
	}
	if (filters?.yearMax) {
		filter += ` && year <= ${filters.yearMax}`
	}
	if (filters?.venue) {
		filter += ` && venue ~ "${filters.venue}"`
	}

	const publications = await pb.collection('publication_records').getList(1, 50, {
		filter,
		sort: '-year,-created',
		expand: 'profile_publications_via_publication.profile,material'
	})

	return publications
}
