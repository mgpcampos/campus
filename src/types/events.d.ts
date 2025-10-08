/**
 * Type definitions for events and calendar functionality
 */

export type ScopeType = 'global' | 'space' | 'group' | 'course';

export type ParticipantStatus = 'going' | 'maybe' | 'declined';

export type LocationType = 'physical' | 'virtual';

export interface EventLocation {
	type: LocationType;
	value: string;
}

export interface EventRecord {
	id: string;
	title: string;
	description?: string;
	scopeType: ScopeType;
	scopeId?: string;
	start: string; // ISO 8601 timestamp
	end: string; // ISO 8601 timestamp
	location?: EventLocation;
	reminderLeadMinutes?: number;
	createdBy: string;
	icsUid?: string;
	created: string;
	updated: string;
}

export interface EventParticipantRecord {
	id: string;
	event: string;
	user: string;
	status: ParticipantStatus;
	created: string;
	updated: string;
}

export interface EventWithParticipants extends EventRecord {
	participants?: EventParticipantRecord[];
	participantCount?: {
		going: number;
		maybe: number;
		declined: number;
	};
	expand?: {
		event_participants_via_event?: EventParticipantRecord | EventParticipantRecord[];
		createdBy?: { id: string; name?: string; email?: string };
	};
}

export interface ConflictInfo {
	hasConflict: boolean;
	conflictingEvents?: EventRecord[];
}

export interface EventCreateInput {
	title: string;
	description?: string;
	scopeType: ScopeType;
	scopeId?: string;
	start: Date | string;
	end: Date | string;
	location?: EventLocation;
	reminderLeadMinutes?: number;
}

export interface EventUpdateInput {
	title?: string;
	description?: string;
	start?: Date | string;
	end?: Date | string;
	location?: EventLocation;
	reminderLeadMinutes?: number;
}
