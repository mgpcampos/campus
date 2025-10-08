import { pb } from '../pocketbase.js';

const mentionRegex = /@([a-zA-Z0-9_]{3,30})/g;

/**
 * Extract unique mentioned usernames from content
 * @param {string} content
 * @returns {string[]}
 */
export function extractMentions(content) {
	const matches = new Set();
	let m;
	while ((m = mentionRegex.exec(content)) !== null) {
		matches.add(m[1]);
	}
	return Array.from(matches);
}

/**
 * Create a notification record
 * @param {Object} data
 * @param {string} data.user - recipient user id
 * @param {string} data.actor - actor user id
 * @param {'like'|'comment'|'mention'|'event_created'|'event_updated'|'event_reminder'|'event_cancelled'} data.type
 * @param {string} [data.post]
 * @param {string} [data.comment]
 * @param {string} [data.event]
 * @param {Object} [data.metadata] - Additional notification metadata
 */
/**
 * @param {{user:string; actor:string; type:'like'|'comment'|'mention'|'event_created'|'event_updated'|'event_reminder'|'event_cancelled'; post?:string; comment?:string; event?:string; metadata?:Object}} data
 */
export async function createNotification(data) {
	try {
		await pb.collection('notifications').create({
			user: data.user,
			actor: data.actor,
			type: data.type,
			post: data.post || undefined,
			comment: data.comment || undefined,
			event: data.event || undefined,
			metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
			read: false
		});
	} catch (e) {
		console.warn('Failed to create notification', e);
	}
}

/**
 * Notify participants about event creation
 * @param {string} eventId - Event ID
 * @param {string} creatorId - Creator user ID
 * @param {string[]} participantIds - Array of participant user IDs
 */
export async function notifyEventCreated(eventId, creatorId, participantIds) {
	const uniqueParticipants = [...new Set(participantIds)].filter((id) => id !== creatorId);

	for (const userId of uniqueParticipants) {
		await createNotification({
			user: userId,
			actor: creatorId,
			type: 'event_created',
			event: eventId
		});
	}
}

/**
 * Notify participants about event updates
 * @param {string} eventId - Event ID
 * @param {string} updaterId - User who updated the event
 * @param {string[]} participantIds - Array of participant user IDs
 * @param {Object} changes - Description of changes
 */
export async function notifyEventUpdated(eventId, updaterId, participantIds, changes) {
	const uniqueParticipants = [...new Set(participantIds)].filter((id) => id !== updaterId);

	for (const userId of uniqueParticipants) {
		await createNotification({
			user: userId,
			actor: updaterId,
			type: 'event_updated',
			event: eventId,
			metadata: changes
		});
	}
}

/**
 * Send event reminders to participants
 * @param {string} eventId - Event ID
 * @param {string[]} participantIds - Array of participant user IDs
 */
export async function notifyEventReminder(eventId, participantIds) {
	for (const userId of participantIds) {
		await createNotification({
			user: userId,
			actor: userId, // Self-notification for reminders
			type: 'event_reminder',
			event: eventId
		});
	}
}

/**
 * Notify participants about event cancellation
 * @param {string} eventId - Event ID
 * @param {string} cancellerId - User who cancelled the event
 * @param {string[]} participantIds - Array of participant user IDs
 */
export async function notifyEventCancelled(eventId, cancellerId, participantIds) {
	const uniqueParticipants = [...new Set(participantIds)].filter((id) => id !== cancellerId);

	for (const userId of uniqueParticipants) {
		await createNotification({
			user: userId,
			actor: cancellerId,
			type: 'event_cancelled',
			event: eventId
		});
	}
}

/**
 * Resolve usernames to user ids
 * @param {string[]} usernames
 * @returns {Promise<Record<string,string>>} map username->id
 */
/**
 * Resolve usernames to ids
 * @param {string[]} usernames
 * @returns {Promise<Record<string,string>>}
 */
export async function resolveUsernames(usernames) {
	/** @type {Record<string,string>} */
	const map = {};
	if (usernames.length === 0) return map;
	for (const username of usernames) {
		try {
			const user = await pb.collection('users').getFirstListItem(`username = "${username}"`);
			if (user?.id) map[username] = user.id;
		} catch {
			/* ignore */
		}
	}
	return map;
}
