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
 * @param {'like'|'comment'|'mention'|'event_created'|'event_updated'|'event_reminder'|'event_cancelled'|'message_flagged'|'moderation_escalated'|'moderation_summary'|'message_removed'|'thread_locked'} data.type
 * @param {string} [data.post]
 * @param {string} [data.comment]
 * @param {string} [data.event]
 * @param {Object} [data.metadata] - Additional notification metadata
 */
/**
 * @param {{user:string; actor:string; type:'like'|'comment'|'mention'|'event_created'|'event_updated'|'event_reminder'|'event_cancelled'|'message_flagged'|'moderation_escalated'|'moderation_summary'|'message_removed'|'thread_locked'; post?:string; comment?:string; event?:string; metadata?:Object}} data
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

/**
 * Notify moderators about a flagged message requiring review
 * @param {string} messageId - Flagged message ID
 * @param {string} threadId - Thread ID
 * @param {string} reporterId - User who flagged the message
 * @param {string} reason - Flag reason
 * @param {string} caseId - Moderation case ID
 */
export async function notifyModeratorsMessageFlagged(messageId, threadId, reporterId, reason, caseId) {
	try {
		// Get all moderators (users with is_admin = true)
		const moderators = await pb.collection('users').getFullList({
			filter: 'is_admin = true'
		});

		for (const moderator of moderators) {
			await createNotification({
				user: moderator.id,
				actor: reporterId,
				type: 'message_flagged',
				metadata: {
					messageId,
					threadId,
					reason: reason.substring(0, 100), // Truncate for notification
					caseId,
					severity: 'high'
				}
			});
		}
	} catch (e) {
		console.error('Failed to notify moderators about flagged message', e);
	}
}

/**
 * Notify moderators about an escalated moderation case (SLA breach)
 * @param {string} caseId - Moderation case ID
 * @param {string} sourceType - Source type (message, post, comment)
 * @param {string} sourceId - Source ID
 * @param {number} ageMinutes - How long the case has been open
 */
export async function notifyModeratorsEscalation(caseId, sourceType, sourceId, ageMinutes) {
	try {
		const moderators = await pb.collection('users').getFullList({
			filter: 'is_admin = true'
		});

		for (const moderator of moderators) {
			await createNotification({
				user: moderator.id,
				actor: moderator.id, // Self-notification for escalation
				type: 'moderation_escalated',
				metadata: {
					caseId,
					sourceType,
					sourceId,
					ageMinutes,
					severity: 'critical'
				}
			});
		}
	} catch (e) {
		console.error('Failed to notify moderators about escalation', e);
	}
}

/**
 * Notify moderators with daily moderation summary
 * @param {Object} summary - Daily stats
 * @param {number} summary.newCases - New cases opened
 * @param {number} summary.resolvedCases - Cases resolved
 * @param {number} summary.openCases - Cases still open
 * @param {number} summary.escalatedCases - Escalated cases
 */
export async function notifyModeratorsDailySummary(summary) {
	try {
		const moderators = await pb.collection('users').getFullList({
			filter: 'is_admin = true'
		});

		for (const moderator of moderators) {
			await createNotification({
				user: moderator.id,
				actor: moderator.id,
				type: 'moderation_summary',
				metadata: {
					...summary,
					date: new Date().toISOString().split('T')[0],
					severity: 'info'
				}
			});
		}
	} catch (e) {
		console.error('Failed to send daily moderation summary', e);
	}
}

/**
 * Notify a user that their message was flagged and removed
 * @param {string} userId - User whose message was removed
 * @param {string} messageId - Removed message ID
 * @param {string} threadId - Thread ID
 * @param {string} moderatorId - Moderator who took action
 * @param {string} reason - Reason for removal
 */
export async function notifyUserMessageRemoved(userId, messageId, threadId, moderatorId, reason) {
	try {
		await createNotification({
			user: userId,
			actor: moderatorId,
			type: 'message_removed',
			metadata: {
				messageId,
				threadId,
				reason: reason.substring(0, 200),
				severity: 'warning'
			}
		});
	} catch (e) {
		console.error('Failed to notify user about message removal', e);
	}
}

/**
 * Notify thread participants that the conversation was locked
 * @param {string} threadId - Thread ID
 * @param {string[]} memberIds - Thread member IDs
 * @param {string} moderatorId - Moderator who locked the thread
 * @param {string} reason - Reason for locking
 */
export async function notifyThreadLocked(threadId, memberIds, moderatorId, reason) {
	try {
		const uniqueMembers = [...new Set(memberIds)];

		for (const userId of uniqueMembers) {
			await createNotification({
				user: userId,
				actor: moderatorId,
				type: 'thread_locked',
				metadata: {
					threadId,
					reason: reason.substring(0, 200),
					severity: 'warning'
				}
			});
		}
	} catch (e) {
		console.error('Failed to notify users about thread lock', e);
	}
}
