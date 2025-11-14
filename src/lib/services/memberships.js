import { pb } from '../pocketbase.js'
import { normalizeError } from '../utils/errors.js'

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

/** Join a space (creates membership)
 * @param {string} spaceId
 */
export async function joinSpace(spaceId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb)
		if (!client.authStore.model?.id) throw new Error('Not authenticated')
		return await client.collection('space_members').create({
			space: spaceId,
			user: client.authStore.model.id,
			role: 'member'
		})
	} catch (error) {
		console.error('Error joining space:', error)
		throw normalizeError(error, { context: 'joinSpace' })
	}
}

/** Leave a space (delete membership)
 * @param {string} spaceId
 */
export async function leaveSpace(spaceId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb)
		if (!client.authStore.model?.id) throw new Error('Not authenticated')
		// Find membership record id first
		const list = await client.collection('space_members').getList(1, 1, {
			filter: `space = "${spaceId}" && user = "${client.authStore.model.id}"`
		})
		if (list.items.length === 0) return false
		await client.collection('space_members').delete(list.items[0].id)
		return true
	} catch (error) {
		console.error('Error leaving space:', error)
		throw normalizeError(error, { context: 'leaveSpace' })
	}
}

/** Check if current user is member of space
 * @param {string} spaceId
 */
export async function isMember(spaceId, serviceOptions = /** @type {ServiceOptions} */ ({})) {
	try {
		const client = resolveClient(serviceOptions.pb)
		if (!client.authStore.model?.id) return false
		const list = await client.collection('space_members').getList(1, 1, {
			filter: `space = "${spaceId}" && user = "${client.authStore.model.id}"`
		})
		return list.items.length > 0
	} catch (error) {
		console.error('Error checking membership:', error)
		normalizeError(error, { context: 'isMember' }) // swallow
		return false
	}
}

/** Get role of current user in space
 * @param {string} spaceId
 */
export async function getMembershipRole(
	spaceId,
	serviceOptions = /** @type {ServiceOptions} */ ({})
) {
	try {
		const client = resolveClient(serviceOptions.pb)
		if (!client.authStore.model?.id) return null
		const list = await client.collection('space_members').getList(1, 1, {
			filter: `space = "${spaceId}" && user = "${client.authStore.model.id}"`
		})
		return list.items[0]?.role || null
	} catch (error) {
		console.error('Error getting membership role:', error)
		normalizeError(error, { context: 'getMembershipRole' }) // swallow
		return null
	}
}
