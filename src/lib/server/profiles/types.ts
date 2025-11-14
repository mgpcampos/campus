/**
 * Server-side utilities and types for academic profiles
 */

import type {
	ProfileRecord,
	PublicationCreateInput,
	PublicationDedupeResult,
	PublicationRecord
} from '../../../types/profiles.js'

export type { ProfileRecord, PublicationRecord, PublicationCreateInput }

/**
 * Generate a slug hash for a publication to enable deduplication
 * @param title - Publication title
 * @param year - Publication year (optional)
 * @returns Normalized slug hash
 */
export function generatePublicationSlugHash(title: string, year?: number): string {
	// Normalize title: lowercase, remove special chars, collapse whitespace
	const normalized = title
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim()

	// Include year if provided for additional uniqueness
	const slug = year ? `${normalized}-${year}` : normalized

	// Generate a simple hash (for production, use a proper hash function like crypto.subtle.digest)
	let hash = 0
	for (let i = 0; i < slug.length; i++) {
		const char = slug.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32-bit integer
	}

	return Math.abs(hash).toString(36)
}

/**
 * Check if a publication already exists based on DOI or title+year
 * @param pb - PocketBase client
 * @param input - Publication create input
 * @returns Deduplication result indicating if publication exists
 */
export async function checkPublicationExists(
	pb: any,
	input: PublicationCreateInput
): Promise<PublicationDedupeResult> {
	try {
		// First check DOI if provided
		if (input.doi) {
			try {
				const existing = await pb
					.collection('publication_records')
					.getFirstListItem(`doi = "${input.doi}"`)
				if (existing) {
					return {
						exists: true,
						publicationId: existing.id,
						matchType: 'doi'
					}
				}
			} catch (err: any) {
				// 404 means no match, continue to slug check
				if (err?.status !== 404) {
					throw err
				}
			}
		}

		// Check slug hash
		const slugHash = generatePublicationSlugHash(input.title, input.year)
		try {
			const existing = await pb
				.collection('publication_records')
				.getFirstListItem(`slugHash = "${slugHash}"`)
			if (existing) {
				return {
					exists: true,
					publicationId: existing.id,
					matchType: 'slugHash'
				}
			}
		} catch (err: any) {
			// 404 means no match
			if (err?.status !== 404) {
				throw err
			}
		}

		return { exists: false }
	} catch (error) {
		console.error('Error checking publication existence:', error)
		throw error
	}
}

/**
 * Create a new publication record with deduplication
 * @param pb - PocketBase client
 * @param input - Publication create input
 * @returns Created or existing publication record
 */
export async function createPublicationRecord(
	pb: any,
	input: PublicationCreateInput
): Promise<PublicationRecord> {
	// Check for existing publication
	const dedupeResult = await checkPublicationExists(pb, input)

	if (dedupeResult.exists && dedupeResult.publicationId) {
		// Return existing publication
		return await pb.collection('publication_records').getOne(dedupeResult.publicationId)
	}

	// Create new publication
	const slugHash = generatePublicationSlugHash(input.title, input.year)
	const publicationData = {
		title: input.title,
		doi: input.doi || null,
		slugHash,
		abstract: input.abstract || null,
		year: input.year || null,
		venue: input.venue || null,
		authors: input.authors || [],
		material: input.materialId || null
	}

	return await pb.collection('publication_records').create(publicationData)
}

/**
 * Link a publication to a profile
 * @param pb - PocketBase client
 * @param profileId - Profile ID
 * @param publicationId - Publication ID
 * @param contributionRole - Role in the publication
 * @returns Profile-publication link record
 */
export async function linkPublicationToProfile(
	pb: any,
	profileId: string,
	publicationId: string,
	contributionRole: 'author' | 'editor' | 'advisor' = 'author'
): Promise<any> {
	try {
		// Check if link already exists
		const existing = await pb
			.collection('profile_publications')
			.getFirstListItem(`profile = "${profileId}" && publication = "${publicationId}"`)

		return existing
	} catch (err: any) {
		// 404 means no link exists, create it
		if (err?.status === 404) {
			return await pb.collection('profile_publications').create({
				profile: profileId,
				publication: publicationId,
				contributionRole
			})
		}
		throw err
	}
}

/**
 * Get all publications for a profile
 * @param pb - PocketBase client
 * @param profileId - Profile ID
 * @returns List of publications with contribution roles
 */
export async function getProfilePublications(pb: any, profileId: string): Promise<any[]> {
	const links = await pb.collection('profile_publications').getFullList({
		filter: `profile = "${profileId}"`,
		expand: 'publication,publication.material',
		sort: '-publication.year'
	})

	return links.map((link: any) => ({
		...link.expand?.publication,
		contributionRole: link.contributionRole,
		linkId: link.id
	}))
}
