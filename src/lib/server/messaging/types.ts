/**
 * Server-side messaging type helpers and utilities
 * Used by SvelteKit actions and PocketBase hooks
 */

import type {
	ConversationThreadRecord,
	MessageFlagRecord,
	MessageRecord,
	MessageStatus,
	ModerationCaseRecord,
	ModerationCaseState,
	ModerationStatus
} from '$types/messaging'

// Expanded record types for server-side operations
export interface ThreadWithMemberDetails extends ConversationThreadRecord {
	expand?: {
		createdBy: {
			id: string
			email: string
			name?: string
			verified: boolean
		}
		members: Array<{
			id: string
			email: string
			name?: string
			verified: boolean
		}>
	}
}

export interface MessageWithRelations extends MessageRecord {
	expand?: {
		thread: ConversationThreadRecord & {
			expand?: {
				members: Array<{ id: string; email: string }>
			}
		}
		author: {
			id: string
			email: string
			name?: string
		}
	}
}

// Validation helpers
export interface ThreadValidationContext {
	requesterId: string
	type: 'direct' | 'group'
	members: string[]
	name?: string
}

export interface MessageValidationContext {
	requesterId: string
	threadId: string
	body?: string
	attachments?: File[]
	threadModerationStatus: ModerationStatus
}

export interface FlagValidationContext {
	requesterId: string
	messageId: string
	reason: string
	threadMembers: string[]
}

// Moderation automation types
export interface FlagThreshold {
	count: number
	action: 'lock_thread' | 'escalate' | 'auto_remove'
}

export interface ModerationAction {
	caseId: string
	sourceType: 'post' | 'comment' | 'message'
	sourceId: string
	action: 'resolve' | 'escalate' | 'assign'
	assignedTo?: string
	resolution?: string
	notifyUsers?: string[]
}

export interface ModerationAlert {
	caseId: string
	severity: 'low' | 'medium' | 'high' | 'critical'
	message: string
	recipientIds: string[]
	channels: Array<'email' | 'push' | 'in_app'>
}

// SLA tracking types
export interface MessageSLAMetric {
	messageId: string
	threadId: string
	sentAt: string
	deliveredAt?: string
	flaggedAt?: string
	caseCreatedAt?: string
	caseResolvedAt?: string
	latencyMs?: number
	withinSLA: boolean
}

// Notification payload types
export interface ThreadCreatedNotification {
	threadId: string
	type: 'direct' | 'group'
	creatorId: string
	memberIds: string[]
	name?: string
}

export interface MessageSentNotification {
	messageId: string
	threadId: string
	authorId: string
	body?: string
	hasAttachments: boolean
	recipientIds: string[]
}

export interface MessageFlaggedNotification {
	flagId: string
	messageId: string
	threadId: string
	reporterId: string
	reason: string
	moderatorIds: string[]
}

export interface ThreadLockedNotification {
	threadId: string
	reason: string
	memberIds: string[]
	lockedAt: string
}

// Filter and search types for server queries
export interface MessageListFilters {
	threadId: string
	before?: string // Cursor for pagination
	limit?: number
	status?: MessageStatus
	authorId?: string
}

export interface ThreadListFilters {
	userId: string
	type?: 'direct' | 'group'
	moderationStatus?: ModerationStatus
	searchQuery?: string
	limit?: number
	offset?: number
}

export interface ModerationQueueFilters {
	state?: ModerationCaseState
	sourceType?: 'post' | 'comment' | 'message'
	assignedTo?: string
	since?: string
	limit?: number
}

// Hook context types for PocketBase hooks
export interface MessageFlagHookContext {
	flagRecord: MessageFlagRecord
	messageRecord: MessageRecord
	threadRecord: ConversationThreadRecord
	reporterRecord: { id: string; email: string }
	existingCaseId?: string
}

export interface MessageCreateHookContext {
	messageRecord: MessageRecord
	threadRecord: ConversationThreadRecord
	authorRecord: { id: string; email: string }
	threadMembers: string[]
}

// Response types for API endpoints
export interface ThreadCreateResponse {
	thread: ConversationThreadRecord
	members: Array<{ id: string; name?: string; email: string }>
}

export interface MessageCreateResponse {
	message: MessageRecord
	thread: ConversationThreadRecord
	queuedForModeration: boolean
}

export interface MessageFlagResponse {
	flagId: string
	caseId?: string
	status: 'queued' | 'escalated' | 'duplicate'
	message: string
}

// Utility function types
export type ThreadMembershipChecker = (userId: string, threadId: string) => Promise<boolean>

export type MessagePermissionChecker = (
	userId: string,
	messageId: string,
	action: 'view' | 'edit' | 'delete' | 'flag'
) => Promise<boolean>

export type ModerationCaseCreator = (
	sourceType: 'post' | 'comment' | 'message',
	sourceId: string,
	evidence: any[]
) => Promise<ModerationCaseRecord>

export type NotificationDispatcher = (
	type: string,
	payload: any,
	recipientIds: string[]
) => Promise<void>
