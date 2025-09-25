import { pb, currentUser } from '../pocketbase.js';
import { writable, get, derived, type Writable } from 'svelte/store';
import { formatDistanceToNow } from 'date-fns';

export interface NotificationRecord {
	id: string;
	user: string;
	actor: string;
	type: 'like' | 'comment' | 'mention';
	post?: string;
	comment?: string;
	read: boolean;
	created: string;
	// PocketBase expand and dynamic fields (kept as unknown for flexibility)
	expand?: Record<string, unknown>;
	[key: string]: unknown; // allow extra PB fields
}

export const notifications: Writable<NotificationRecord[]> = writable([]);
export const notificationsStatus = writable({ subscribed: false });
export const unreadCount = derived(notifications, ($n) => $n.filter((n) => !n.read).length);

let unsub: null | (() => void) = null;

export async function loadInitialNotifications(limit = 20) {
	const cu = get(currentUser) as unknown as { id?: string } | null;
	if (!cu) return;
	try {
		const list = await pb
			.collection('notifications')
			.getList(1, limit, { sort: '-created', expand: 'actor,post,comment' });
		notifications.set(list.items as unknown as NotificationRecord[]);
	} catch (e) {
		console.warn('load notifications failed', e);
	}
}

export async function subscribeNotifications() {
	if (unsub) return;
	const cu = get(currentUser) as unknown as { id?: string } | null;
	if (!cu) return;
	await loadInitialNotifications();
	unsub = await pb
		.collection('notifications')
		.subscribe('*', (e: { action: string; record: NotificationRecord }) => {
			const me = get(currentUser) as unknown as { id?: string } | null;
			if (!me || e.record.user !== me.id) return;
			if (e.action === 'create') {
				notifications.update((list) => [e.record as NotificationRecord, ...list].slice(0, 50));
			} else if (e.action === 'update') {
				notifications.update((list) => list.map((n) => (n.id === e.record.id ? e.record : n)));
			} else if (e.action === 'delete') {
				notifications.update((list) => list.filter((n) => n.id !== e.record.id));
			}
		});
	notificationsStatus.set({ subscribed: true });
}

export function unsubscribeNotifications() {
	if (unsub) {
		try {
			unsub();
		} catch {
			/* ignore */
		}
		try {
			pb.collection('notifications').unsubscribe('*');
		} catch {
			/* ignore */
		}
		unsub = null;
	}
	notificationsStatus.set({ subscribed: false });
}

export async function markRead(id: string) {
	try {
		await pb.collection('notifications').update(id, { read: true });
	} catch (e) {
		console.warn('markRead failed', e);
	}
}

export async function markAllRead() {
	const list = get(notifications);
	for (const n of list) {
		if (!n.read) {
			try {
				await pb.collection('notifications').update(n.id, { read: true });
			} catch {
				/* ignore */
			}
		}
	}
}

export function describeNotification(n: NotificationRecord) {
	const actorRaw = n.expand?.actor as unknown;
	let actorName = 'Someone';
	if (actorRaw && typeof actorRaw === 'object') {
		const obj = actorRaw as Record<string, unknown>;
		const nameVal = obj['name'];
		if (typeof nameVal === 'string' && nameVal.trim().length > 0) {
			actorName = nameVal;
		}
	}
	const ago = formatDistanceToNow(new Date(n.created), { addSuffix: true });
	if (n.type === 'like') return `${actorName} liked your post · ${ago}`;
	if (n.type === 'comment') return `${actorName} commented on your post · ${ago}`;
	if (n.type === 'mention') return `${actorName} mentioned you · ${ago}`;
	return `${actorName} activity · ${ago}`;
}
