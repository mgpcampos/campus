import { formatDistanceToNow } from 'date-fns'
import { derived, get, writable } from 'svelte/store'
import { currentUser, pb } from '../pocketbase.js'

// Using an untyped array store to avoid strict shape coupling; records come from PocketBase
export const notifications = writable([]) // newest first
export const notificationsStatus = writable({ subscribed: false })
export const unreadCount = derived(notifications, ($n) => $n.filter((n) => !n.read).length)

/** @type {null | (()=>void)} */
let unsub = null

/**
 * Load initial notifications
 * @param {number} limit
 */
export async function loadInitialNotifications(limit = 20) {
	if (!get(currentUser)) return
	try {
		const list = await pb
			.collection('notifications')
			.getList(1, limit, { sort: '-created', expand: 'actor,post,comment' })
		notifications.set(list.items.map((r) => ({ ...r })))
	} catch (e) {
		console.warn('load notifications failed', e)
	}
}

export async function subscribeNotifications() {
	if (unsub) return
	if (!get(currentUser)) return
	await loadInitialNotifications()
	unsub = await pb.collection('notifications').subscribe('*', (e) => {
		// Filter for current user
		const cu = get(currentUser)
		if (!cu || e.record.user !== cu.id) return
		if (e.action === 'create') {
			notifications.update((list) => [{ ...e.record }, ...list].slice(0, 50))
		} else if (e.action === 'update') {
			notifications.update((list) => list.map((n) => (n.id === e.record.id ? { ...e.record } : n)))
		} else if (e.action === 'delete') {
			notifications.update((list) => list.filter((n) => n.id !== e.record.id))
		}
	})
	notificationsStatus.set({ subscribed: true })
}

export function unsubscribeNotifications() {
	if (unsub) {
		try {
			unsub()
		} catch {
			/* ignore */
		}
		try {
			pb.collection('notifications').unsubscribe('*')
		} catch {
			/* ignore */
		}
		unsub = null
	}
	notificationsStatus.set({ subscribed: false })
}

/** @param {string} id */
export async function markRead(id) {
	try {
		await pb.collection('notifications').update(id, { read: true })
	} catch (e) {
		console.warn('markRead failed', e)
	}
}

export async function markAllRead() {
	const list = get(notifications)
	for (const n of list) {
		if (!n.read) {
			try {
				await pb.collection('notifications').update(n.id, { read: true })
			} catch {
				/* ignore */
			}
		}
	}
}
export function describeNotification(n) {
	const actor = n.expand?.actor
	const actorName = actor?.name || 'Someone'
	const ago = formatDistanceToNow(new Date(n.created), { addSuffix: true })
	if (n.type === 'like') return `${actorName} liked your post · ${ago}`
	if (n.type === 'comment') return `${actorName} commented on your post · ${ago}`
	if (n.type === 'mention') return `${actorName} mentioned you · ${ago}`
	return `${actorName} activity · ${ago}`
}
