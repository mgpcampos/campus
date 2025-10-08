/**
 * Timezone and date utilities for calendar/event functionality
 */

/**
 * Formats a date to ISO 8601 timestamp in UTC
 * @param date - Date object or ISO string
 * @returns ISO 8601 string in UTC
 */
export function toUTC(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toISOString();
}

/**
 * Parses an ISO 8601 timestamp to Date object
 * @param timestamp - ISO 8601 string
 * @returns Date object
 */
export function fromUTC(timestamp: string): Date {
	return new Date(timestamp);
}

/**
 * Validates that start is before end
 * @param start - Start date/time
 * @param end - End date/time
 * @returns true if start < end
 */
export function validateTimeRange(start: Date | string, end: Date | string): boolean {
	const startDate = typeof start === 'string' ? new Date(start) : start;
	const endDate = typeof end === 'string' ? new Date(end) : end;
	return startDate < endDate;
}

/**
 * Formats a date for display in user's local timezone
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatLocalDate(
	date: Date | string,
	options: Intl.DateTimeFormatOptions = {}
): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const defaultOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		...options
	};
	return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Formats a date range for display
 * @param start - Start date/time
 * @param end - End date/time
 * @returns Formatted date range string
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
	const startDate = typeof start === 'string' ? new Date(start) : start;
	const endDate = typeof end === 'string' ? new Date(end) : end;

	const sameDay = startDate.toDateString() === endDate.toDateString();

	if (sameDay) {
		return `${formatLocalDate(startDate, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})} - ${formatLocalDate(endDate, {
			hour: '2-digit',
			minute: '2-digit'
		})}`;
	}

	return `${formatLocalDate(startDate)} - ${formatLocalDate(endDate)}`;
}

/**
 * Adds minutes to a date
 * @param date - Base date
 * @param minutes - Minutes to add
 * @returns New date with minutes added
 */
export function addMinutes(date: Date | string, minutes: number): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setMinutes(d.getMinutes() + minutes);
	return d;
}

/**
 * Subtracts minutes from a date
 * @param date - Base date
 * @param minutes - Minutes to subtract
 * @returns New date with minutes subtracted
 */
export function subtractMinutes(date: Date | string, minutes: number): Date {
	return addMinutes(date, -minutes);
}

/**
 * Gets the duration in minutes between two dates
 * @param start - Start date/time
 * @param end - End date/time
 * @returns Duration in minutes
 */
export function getDurationMinutes(start: Date | string, end: Date | string): number {
	const startDate = typeof start === 'string' ? new Date(start) : start;
	const endDate = typeof end === 'string' ? new Date(end) : end;
	return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * Rounds milliseconds to match PocketBase date precision (seconds)
 * @param date - Date to round
 * @returns Date with milliseconds set to 0
 */
export function roundToSeconds(date: Date | string): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setMilliseconds(0);
	return d;
}

/**
 * Checks if a date is in the past
 * @param date - Date to check
 * @returns true if date is in the past
 */
export function isPast(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d < new Date();
}

/**
 * Checks if a date is in the future
 * @param date - Date to check
 * @returns true if date is in the future
 */
export function isFuture(date: Date | string): boolean {
	return !isPast(date);
}
