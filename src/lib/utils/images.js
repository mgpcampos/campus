import { pocketBaseUrl } from '$lib/utils/pocketbase-url.js'

const BASE_URL = pocketBaseUrl

/**
 * Build a PocketBase file URL with optional thumb (widthxheight or preset) and token options.
 * PocketBase supports thumb queries like ?thumb=100x100 or ?thumb=0x300 which preserves aspect.
 * @param {string} collection
 * @param {string} recordId
 * @param {string} filename
 * @param {{thumb?:string}} [opts]
 */
export function pbFileUrl(collection, recordId, filename, opts = {}) {
	if (!collection || !recordId || !filename) return ''
	const u = new URL(`${BASE_URL}/api/files/${collection}/${recordId}/${filename}`)
	if (opts.thumb) u.searchParams.set('thumb', opts.thumb)
	return u.toString()
}

/**
 * Generate srcset for responsive images for given widths.
 * @param {string} collection
 * @param {string} recordId
 * @param {string} filename
 * @param {number[]} widths
 * @param {number} height Height to constrain (0 means auto)
 */
export function pbSrcSet(collection, recordId, filename, widths = [64, 128, 256, 512], height = 0) {
	return widths
		.map((w) => {
			const thumb = `${w}x${height}`
			const url = pbFileUrl(collection, recordId, filename, { thumb })
			return `${url} ${w}w`
		})
		.join(', ')
}

/**
 * Convenience helper to build avatar props
 */
/**
 * @param {{id:string; avatar?:string; username?:string; name?:string} | null | undefined} user
 * @param {number} size
 */
export function avatarImageProps(user, size = 64) {
	if (!user?.avatar) return { src: '', alt: user?.username || 'user' }
	return {
		src: pbFileUrl('users', user.id, user.avatar, { thumb: `${size}x${size}` }),
		srcset: pbSrcSet('users', user.id, user.avatar, [32, 64, 96, 128], size),
		sizes: '(max-width: 640px) 64px, 96px',
		alt: user.username || user.name || 'user'
	}
}
