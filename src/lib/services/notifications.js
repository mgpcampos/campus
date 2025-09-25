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
 * @param {'like'|'comment'|'mention'} data.type
 * @param {string} [data.post]
 * @param {string} [data.comment]
 */
/**
 * @param {{user:string; actor:string; type:'like'|'comment'|'mention'; post?:string; comment?:string}} data
 */
export async function createNotification(data) {
	try {
		await pb.collection('notifications').create({
			user: data.user,
			actor: data.actor,
			type: data.type,
			post: data.post || undefined,
			comment: data.comment || undefined,
			read: false
		});
	} catch (e) {
		console.warn('Failed to create notification', e);
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
