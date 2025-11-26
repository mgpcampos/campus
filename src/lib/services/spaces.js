import { ClientResponseError } from 'pocketbase'
import { pb } from '../pocketbase.js'
import { getOrSet, serverCaches } from '../utils/cache.js'

/**
 * @typedef {{ pb?: import('pocketbase').default }} ServiceOptions
 */

/**
 * @param {import('pocketbase').default | undefined} provided
 * @returns {import('pocketbase').default}
 */
function resolveClient(provided) {
	return provided ?? pb
}

/**
 * Create a new space and assign owner membership.
 * This is a simplified, reliable implementation.
 *
 * @param {Object} params
 * @param {string} params.name - Space name
 * @param {string} params.slug - URL slug
 * @param {string} params.userId - Owner user ID
 * @param {string} [params.description] - Optional description
 * @param {boolean} [params.isPublic] - Whether space is public (defaults to true)
 * @param {File} [params.avatar] - Optional avatar file
 * @param {import('pocketbase').default} params.pb - PocketBase client instance
 */
export async function createSpace({ name, slug, description, avatar, userId, pb }) {
	if (!name || !slug || !userId || !pb) {
		throw new Error('name, slug, userId, and pb are required')
	}

	// Build payload - always use FormData for consistency
	const formData = new FormData()
	formData.append('name', name)
	formData.append('slug', slug)
	formData.append('description', description || '')
	formData.append('isPublic', 'true')
	formData.append('owners', userId)

	if (avatar instanceof File && avatar.size > 0) {
		formData.append('avatar', avatar)
	}

	const space = await pb.collection('spaces').create(formData)

	// Create membership record
	try {
		await pb.collection('space_members').create({
			space: space.id,
			user: userId,
			role: 'owner'
		})
	} catch (e) {
		console.warn('Failed to create owner membership:', e)
	}

	return space
}

/** Fetch spaces with optional search */
export async function getSpaces(
	{ page = 1, perPage = 20, search = '' } = {},
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	const client = resolveClient(serviceOptions.pb)
	let filter = ''
	if (search) {
		// Basic name/slug search
		filter = `(name ~ "%${search}%" || slug ~ "%${search}%")`
	}
	const allowCache = !serviceOptions.pb
	const useCache = allowCache && page === 1 && !search // only cache first page unfiltered list
	const cacheKey = `spaces:p${page}:pp${perPage}:f${filter || 'none'}`
	if (!useCache) {
		return await client
			.collection('spaces')
			.getList(page, perPage, { filter, sort: '-created' })
	}
	if (!allowCache) {
		return await client
			.collection('spaces')
			.getList(page, perPage, { filter, sort: '-created' })
	}
	return await getOrSet(
		serverCaches.lists,
		cacheKey,
		async () => {
			return await client
				.collection('spaces')
				.getList(page, perPage, { filter, sort: '-created' })
		},
		{ ttlMs: 30_000 }
	)
}

/**
 * Fetch a space by its record id or slug.
 * @param {string} identifier
 */
export async function getSpace(identifier, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	const client = resolveClient(serviceOptions.pb)
	try {
		return await client.collection('spaces').getOne(identifier, {
			expand: 'owners,moderators'
		})
	} catch (error) {
		if (error instanceof ClientResponseError && error.status === 404) {
			const safeSlug = identifier.replaceAll('"', String.raw`\"`)
			return await client.collection('spaces').getFirstListItem(`slug = "${safeSlug}"`, {
				expand: 'owners,moderators'
			})
		}
		throw error
	}
}

/** @param {string} id @param {Record<string, any>} data */
export async function updateSpace(id, data, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	const client = resolveClient(serviceOptions.pb)
	return await client.collection('spaces').update(id, data)
}

/** @param {string} id */
export async function deleteSpace(id, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	const client = resolveClient(serviceOptions.pb)
	return await client.collection('spaces').delete(id)
}

/** Get membership count for a space @param {string} spaceId */
export async function getSpaceMemberCount(
	spaceId,
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	const cacheKey = `spaceMemberCount:${spaceId}`
	const client = resolveClient(serviceOptions.pb)
	const allowCache = !serviceOptions.pb
	const fetchCount = async () => {
		try {
			const result = await client.collection('space_members').getList(1, 1, {
				filter: `space = "${spaceId}"`,
				totalCount: true,
				requestKey: `spaceMemberCount:${spaceId}`
			})
			return result.totalItems
		} catch (error) {
			if (error instanceof ClientResponseError) {
				if (error.status === 403) {
					return null // hidden for private spaces or insufficient permissions
				}
				if (error.status === 404) {
					return 0
				}
			}
			throw error
		}
	}

	if (!allowCache) {
		return await fetchCount()
	}

	return await getOrSet(serverCaches.lists, cacheKey, fetchCount, { ttlMs: 20_000 })
}

/** List members of a space with optional search over user fields
 * @param {string} spaceId
 * @param {{ page?: number; perPage?: number; search?: string }} [opts]
 */
export async function getSpaceMembers(
	spaceId,
	{ page = 1, perPage = 50, search = '' } = {},
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	const client = resolveClient(serviceOptions.pb)
	// Always expand user for potential filtering
	const result = await client.collection('space_members').getList(page, perPage, {
		filter: `space = "${spaceId}"`,
		expand: 'user'
	})
	if (!search) return result
	const s = search.toLowerCase()
	const filtered = result.items.filter((/** @type {any} */ m) => {
		const u = m.expand?.user
		if (!u) return false
		return u.username?.toLowerCase().includes(s) || u.name?.toLowerCase().includes(s)
	})
	return {
		...result,
		items: filtered,
		totalItems: filtered.length,
		totalPages: 1,
		page: 1
	}
}
