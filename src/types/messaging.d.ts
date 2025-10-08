/**
 * Type definitions for messaging and moderation functionality
 */

export type ThreadType = 'direct' | 'group';

export type ModerationStatus = 'active' | 'locked';

export type MessageStatus = 'visible' | 'pending_review' | 'removed';

export type ModerationCaseState = 'open' | 'in_review' | 'resolved' | 'escalated';

export type ModerationSourceType = 'post' | 'comment' | 'message';

export interface ConversationThreadRecord {
	id: string;
	type: ThreadType;
	name?: string;
	createdBy: string;
	members: string[];
	lastMessageAt: string; // ISO 8601 timestamp
	moderationStatus: ModerationStatus;
	created: string;
	updated: string;
}

export interface MessageRecord {
	id: string;
	thread: string;
	author: string;
	body?: string;
	attachments?: string[]; // File URLs
	status: MessageStatus;
	flagCount: number;
	metadata?: MessageMetadata;
	created: string;
	updated: string;
}

export interface MessageMetadata {
	readReceipts?: Array<{
		userId: string;
		readAt: string;
	}>;
	clientInfo?: {
		platform?: string;
		version?: string;
	};
	editHistory?: Array<{
		editedAt: string;
		previousBody?: string;
	}>;
}

export interface MessageFlagRecord {
	id: string;
	message: string;
	reporter: string;
	reason: string;
	created: string;
	updated: string;
}

export interface ModerationCaseRecord {
	id: string;
	sourceType: ModerationSourceType;
	sourceId: string;
	state: ModerationCaseState;
	assignedTo?: string;
	resolution?: string;
	resolutionAt?: string; // ISO 8601 timestamp
	evidence?: ModerationEvidence[];
	created: string;
	updated: string;
}

export interface ModerationEvidence {
	type: string;
	value: any;
	capturedAt?: string;
}

export interface ThreadWithMessages extends ConversationThreadRecord {
	messages?: MessageRecord[];
	messageCount?: number;
	expand?: {
		messages_via_thread?: MessageRecord | MessageRecord[];
		createdBy?: { id: string; name?: string; email?: string };
		members?: Array<{ id: string; name?: string; email?: string }>;
		lastMessage?: MessageWithDetails;
	};
}

export interface MessageWithDetails extends MessageRecord {
	expand?: {
		thread?: ConversationThreadRecord;
		author?: { id: string; name?: string; email?: string };
		message_flags_via_message?: MessageFlagRecord | MessageFlagRecord[];
	};
}

export interface ModerationCaseWithDetails extends ModerationCaseRecord {
	expand?: {
		assignedTo?: { id: string; name?: string; email?: string };
	};
}

// Form validation types for client-side
export interface ThreadCreateInput {
	type: ThreadType;
	name?: string;
	members: string[];
}

export interface MessageCreateInput {
	body?: string;
	attachments?: File[];
}

export interface MessageFlagInput {
	reason: string;
}

// Thread membership helpers
export interface ThreadMembership {
	threadId: string;
	userId: string;
	joinedAt: string;
	role?: 'creator' | 'member';
}

// Pagination types for message listing
export interface MessagePage {
	items: MessageRecord[];
	nextCursor?: string;
	hasMore: boolean;
}
