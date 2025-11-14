import { error } from '@sveltejs/kit'
import { normalizeError } from '$lib/utils/errors.ts'
import type { EventLocation, EventRecord } from '../../../../../types/events'

/**
 * Generates an iCalendar (ICS) file for an event
 * RFC 5545 compliant format
 */
function generateICS(event: EventRecord): string {
	const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
	const start = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
	const end = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

	// Parse location if present
	let locationStr = ''
	if (event.location) {
		try {
			const loc: EventLocation =
				typeof event.location === 'string' ? JSON.parse(event.location) : event.location
			if (loc.type === 'physical') {
				locationStr = loc.value
			} else if (loc.type === 'virtual') {
				locationStr = `Virtual: ${loc.value}`
			}
		} catch {
			// Ignore parse errors
		}
	}

	// Generate UID - use icsUid if available, otherwise create from event id
	const uid = event.icsUid || `${event.id}@campus.example.edu`

	// Escape special characters for ICS format
	const escapeICS = (str: string) => {
		return str
			.replace(/\\/g, '\\\\')
			.replace(/;/g, '\\;')
			.replace(/,/g, '\\,')
			.replace(/\n/g, '\\n')
	}

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Campus Academic Collaboration//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${uid}`,
		`DTSTAMP:${now}`,
		`DTSTART:${start}`,
		`DTEND:${end}`,
		`SUMMARY:${escapeICS(event.title)}`,
		event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
		locationStr ? `LOCATION:${escapeICS(locationStr)}` : '',
		`STATUS:CONFIRMED`,
		`SEQUENCE:0`,
		'END:VEVENT',
		'END:VCALENDAR'
	]

	// Filter out empty lines
	return lines.filter((line) => line).join('\r\n') + '\r\n'
}

/**
 * Sanitizes filename for download
 */
function sanitizeFilename(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 50)
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	if (!locals.pb.authStore.isValid) {
		return error(401, 'Authentication required')
	}

	try {
		// Fetch event
		const event = await locals.pb.collection('events').getOne<EventRecord>(params.id)

		// Generate ICS content
		const icsContent = generateICS(event)

		// Create filename
		const filename = `${sanitizeFilename(event.title)}.ics`

		// Return ICS file
		return new Response(icsContent, {
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-cache'
			}
		})
	} catch (err) {
		const n = normalizeError(err, { context: 'api:exportEventICS' })
		console.error(`Error exporting event ${params.id} to ICS:`, n.toString())
		return error(n.status || 500, n.message || 'Failed to export event')
	}
}
