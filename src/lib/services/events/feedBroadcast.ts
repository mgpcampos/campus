/**
 * Feed Broadcasting for Calendar Events
 * Posts calendar updates to the feed so cohorts see schedule changes
 * Implements FR-007 requirement
 */

import type PocketBase from 'pocketbase'
import type { EventRecord } from '../../../types/events'

/**
 * Creates a feed post announcing an event creation
 * @param pb - PocketBase client instance
 * @param event - The event that was created
 * @param creatorId - ID of the user who created the event
 */
export async function broadcastEventCreation(
	pb: PocketBase,
	event: EventRecord,
	creatorId: string
): Promise<void> {
	try {
		// Format event details for feed post
		const startDate = new Date(event.start).toLocaleString()
		const endDate = new Date(event.end).toLocaleString()

		const postContent = `📅 **New Event Created**\n\n**${event.title}**\n\n${
			event.description || ''
		}\n\n🕒 ${startDate} - ${endDate}\n\n${
			event.scopeType !== 'global' ? `Scope: ${event.scopeType}` : 'Global Event'
		}`

		// Create feed post
		await pb.collection('posts').create({
			author: creatorId,
			content: postContent,
			scope:
				event.scopeType === 'space'
					? 'space'
					: event.scopeType === 'group'
						? 'group'
						: 'public',
			scopeId: event.scopeId || undefined,
			mediaType: 'text',
			metadata: JSON.stringify({
				type: 'event_announcement',
				eventId: event.id,
				action: 'created'
			})
		})
	} catch (error) {
		console.error('Failed to broadcast event creation to feed:', error)
		// Don't throw - broadcasting is non-critical
	}
}

/**
 * Creates a feed post announcing an event update
 * @param pb - PocketBase client instance
 * @param event - The event that was updated
 * @param updaterId - ID of the user who updated the event
 * @param changes - Description of what changed
 */
export async function broadcastEventUpdate(
	pb: PocketBase,
	event: EventRecord,
	updaterId: string,
	changes: Record<string, unknown>
): Promise<void> {
	try {
		const changesList = Object.entries(changes)
			.map(([key, value]) => {
				const formatted = typeof value === 'string' ? value : JSON.stringify(value)
				return `- ${key}: ${formatted ?? ''}`
			})
			.join('\n')

		const postContent = `🔄 **Event Updated**\n\n**${event.title}**\n\nChanges:\n${changesList}`

		await pb.collection('posts').create({
			author: updaterId,
			content: postContent,
			scope:
				event.scopeType === 'space'
					? 'space'
					: event.scopeType === 'group'
						? 'group'
						: 'public',
			scopeId: event.scopeId || undefined,
			mediaType: 'text',
			metadata: JSON.stringify({
				type: 'event_announcement',
				eventId: event.id,
				action: 'updated'
			})
		})
	} catch (error) {
		console.error('Failed to broadcast event update to feed:', error)
	}
}

/**
 * Creates a feed post announcing an event cancellation
 * @param pb - PocketBase client instance
 * @param event - The event that was cancelled
 * @param cancellerId - ID of the user who cancelled the event
 */
export async function broadcastEventCancellation(
	pb: PocketBase,
	event: EventRecord,
	cancellerId: string
): Promise<void> {
	try {
		const postContent = `❌ **Event Cancelled**\n\n**${event.title}**\n\nThis event has been cancelled.`

		await pb.collection('posts').create({
			author: cancellerId,
			content: postContent,
			scope:
				event.scopeType === 'space'
					? 'space'
					: event.scopeType === 'group'
						? 'group'
						: 'public',
			scopeId: event.scopeId || undefined,
			mediaType: 'text',
			metadata: JSON.stringify({
				type: 'event_announcement',
				eventId: event.id,
				action: 'cancelled'
			})
		})
	} catch (error) {
		console.error('Failed to broadcast event cancellation to feed:', error)
	}
}

/**
 * Creates a feed post for upcoming event reminders
 * @param pb - PocketBase client instance
 * @param event - The upcoming event
 */
export async function broadcastEventReminder(pb: PocketBase, event: EventRecord): Promise<void> {
	try {
		const startDate = new Date(event.start).toLocaleString()

		const postContent = `⏰ **Upcoming Event Reminder**\n\n**${event.title}**\n\nStarts at: ${startDate}\n\nDon't forget to attend!`

		await pb.collection('posts').create({
			author: event.createdBy,
			content: postContent,
			scope:
				event.scopeType === 'space'
					? 'space'
					: event.scopeType === 'group'
						? 'group'
						: 'public',
			scopeId: event.scopeId || undefined,
			mediaType: 'text',
			metadata: JSON.stringify({
				type: 'event_announcement',
				eventId: event.id,
				action: 'reminder'
			})
		})
	} catch (error) {
		console.error('Failed to broadcast event reminder to feed:', error)
	}
}
