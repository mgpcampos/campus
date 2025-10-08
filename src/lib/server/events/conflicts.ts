/**
 * Event conflict detection utilities
 */

import type { EventRecord, ScopeType, ConflictInfo } from '../../../types/events';
import { toUTC, validateTimeRange, roundToSeconds } from '$lib/utils/timezone';
import type PocketBase from 'pocketbase';

export interface ConflictCheckParams {
	scopeType: ScopeType;
	scopeId?: string;
	start: Date | string;
	end: Date | string;
	ignoreId?: string;
}

/**
 * Checks for conflicting events within the same scope
 * @param pb - PocketBase client instance
 * @param params - Conflict check parameters
 * @returns Conflict information including any conflicting events
 */
export async function hasConflict(
	pb: PocketBase,
	params: ConflictCheckParams
): Promise<ConflictInfo> {
	const { scopeType, scopeId, start, end, ignoreId } = params;

	// Validate time range
	if (!validateTimeRange(start, end)) {
		throw new Error('Event start time must be before end time');
	}

	// Round to seconds to match PocketBase precision
	const startDate = roundToSeconds(start);
	const endDate = roundToSeconds(end);
	const startISO = toUTC(startDate);
	const endISO = toUTC(endDate);

	// Build filter for overlapping events in same scope
	// Two events overlap if: start1 < end2 AND end1 > start2
	let filter = `scopeType = {:scopeType} && start < {:candidateEnd} && end > {:candidateStart}`;

	// Add scopeId filter if provided (not global events)
	if (scopeId) {
		filter += ' && scopeId = {:scopeId}';
	} else {
		// For global events, ensure scopeId is empty
		filter += ' && scopeId = ""';
	}

	// Exclude the current event if updating
	if (ignoreId) {
		filter += ' && id != {:ignoreId}';
	}

	try {
		const conflictingEvents = await pb.collection('events').getFullList<EventRecord>({
			filter,
			fields: 'id,title,start,end,scopeType,scopeId',
			$autoCancel: false,
			// Bind parameters
			requestKey: null,
			expand: undefined,
			sort: undefined,
			// Use query params for filtering
			fetch: (url: string, config: RequestInit) => {
				const urlObj = new URL(url);
				urlObj.searchParams.set('filter', filter);

				// Replace placeholders with actual values
				let filterStr = filter;
				filterStr = filterStr.replace('{:scopeType}', `"${scopeType}"`);
				filterStr = filterStr.replace('{:candidateEnd}', `"${endISO}"`);
				filterStr = filterStr.replace('{:candidateStart}', `"${startISO}"`);

				if (scopeId) {
					filterStr = filterStr.replace('{:scopeId}', `"${scopeId}"`);
				}

				if (ignoreId) {
					filterStr = filterStr.replace('{:ignoreId}', `"${ignoreId}"`);
				}

				urlObj.searchParams.set('filter', filterStr);
				return fetch(urlObj.toString(), config);
			}
		} as any);

		return {
			hasConflict: conflictingEvents.length > 0,
			conflictingEvents: conflictingEvents.length > 0 ? conflictingEvents : undefined
		};
	} catch (error) {
		console.error('Error checking for event conflicts:', error);
		throw new Error('Failed to check for event conflicts');
	}
}

/**
 * Validates event data before creation/update
 * @param params - Event parameters to validate
 * @throws Error if validation fails
 */
export function validateEventData(params: {
	title?: string;
	start: Date | string;
	end: Date | string;
	scopeType: ScopeType;
	scopeId?: string;
}): void {
	const { title, start, end, scopeType, scopeId } = params;

	// Validate required fields
	if (title !== undefined && (!title || title.trim().length === 0)) {
		throw new Error('Event title is required');
	}

	// Validate time range
	if (!validateTimeRange(start, end)) {
		throw new Error('Event start time must be before end time');
	}

	// Validate scope consistency
	if (scopeType !== 'global' && !scopeId) {
		throw new Error(`scopeId is required for ${scopeType} events`);
	}

	if (scopeType === 'global' && scopeId) {
		throw new Error('scopeId should not be provided for global events');
	}

	// Validate scopeType
	const validScopeTypes: ScopeType[] = ['global', 'space', 'group', 'course'];
	if (!validScopeTypes.includes(scopeType)) {
		throw new Error(`Invalid scopeType: ${scopeType}`);
	}
}

/**
 * Gets all events for a specific user (created or participating)
 * @param pb - PocketBase client instance
 * @param userId - User ID
 * @param options - Query options
 * @returns List of events
 */
export async function getUserEvents(
	pb: PocketBase,
	userId: string,
	options?: {
		from?: Date | string;
		to?: Date | string;
		scopeType?: ScopeType;
		scopeId?: string;
	}
): Promise<EventRecord[]> {
	let filter = `(createdBy = {:userId} || event_participants_via_event.user ?= {:userId})`;
	const params: Record<string, string> = { userId };

	if (options?.from) {
		filter += ' && end >= {:from}';
		params.from = toUTC(options.from);
	}

	if (options?.to) {
		filter += ' && start <= {:to}';
		params.to = toUTC(options.to);
	}

	if (options?.scopeType) {
		filter += ' && scopeType = {:scopeType}';
		params.scopeType = options.scopeType;
	}

	if (options?.scopeId) {
		filter += ' && scopeId = {:scopeId}';
		params.scopeId = options.scopeId;
	}

	try {
		// Replace filter placeholders
		let filterStr = filter;
		Object.entries(params).forEach(([key, value]) => {
			filterStr = filterStr.replace(`{:${key}}`, `"${value}"`);
		});

		const events = await pb.collection('events').getFullList<EventRecord>({
			filter: filterStr,
			sort: 'start',
			expand: 'event_participants_via_event',
			$autoCancel: false
		});

		return events;
	} catch (error) {
		console.error('Error fetching user events:', error);
		throw new Error('Failed to fetch user events');
	}
}
