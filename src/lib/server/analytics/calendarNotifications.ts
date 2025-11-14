/**
 * Calendar Notification Latency Telemetry
 * Monitors and tracks notification delivery times to enforce NFR-003 (< 1 minute)
 */

import type PocketBase from 'pocketbase'

export interface NotificationTelemetry {
	eventId: string
	notificationType: 'created' | 'updated' | 'reminder' | 'cancelled'
	recipientCount: number
	startTime: number
	endTime: number
	latencyMs: number
	exceededSLA: boolean
}

const SLA_THRESHOLD_MS = 60 * 1000 // 1 minute in milliseconds

/**
 * Records the start of a notification broadcast
 * @returns timestamp to be used for measuring latency
 */
export function startNotificationTimer(): number {
	return Date.now()
}

/**
 * Records notification completion and logs telemetry
 * @param pb - PocketBase client instance
 * @param eventId - Event ID
 * @param notificationType - Type of notification
 * @param recipientCount - Number of recipients
 * @param startTime - Start timestamp from startNotificationTimer()
 */
export async function recordNotificationLatency(
	pb: PocketBase,
	eventId: string,
	notificationType: 'created' | 'updated' | 'reminder' | 'cancelled',
	recipientCount: number,
	startTime: number
): Promise<NotificationTelemetry> {
	const endTime = Date.now()
	const latencyMs = endTime - startTime
	const exceededSLA = latencyMs > SLA_THRESHOLD_MS

	const telemetry: NotificationTelemetry = {
		eventId,
		notificationType,
		recipientCount,
		startTime,
		endTime,
		latencyMs,
		exceededSLA
	}

	// Log to console for monitoring
	if (exceededSLA) {
		console.warn(`⚠️ SLA VIOLATION: Event notification latency exceeded 1 minute`, {
			eventId,
			type: notificationType,
			recipients: recipientCount,
			latency: `${(latencyMs / 1000).toFixed(2)}s`
		})
	} else {
		console.log(`✓ Event notification delivered within SLA`, {
			eventId,
			type: notificationType,
			recipients: recipientCount,
			latency: `${(latencyMs / 1000).toFixed(2)}s`
		})
	}

	// Record in analytics_events collection
	try {
		await pb.collection('analytics_events').create({
			type: 'calendar_notification_latency',
			userId: 'system',
			metadata: JSON.stringify({
				eventId,
				notificationType,
				recipientCount,
				latencyMs,
				exceededSLA,
				timestamp: new Date(startTime).toISOString()
			})
		})
	} catch (error) {
		console.error('Failed to record notification telemetry:', error)
	}

	return telemetry
}

/**
 * Retrieves notification latency statistics for a time period
 * @param pb - PocketBase client instance
 * @param from - Start date
 * @param to - End date
 * @returns Statistics summary
 */
export async function getNotificationStats(
	pb: PocketBase,
	from: Date,
	to: Date
): Promise<{
	total: number
	withinSLA: number
	exceededSLA: number
	averageLatencyMs: number
	p95LatencyMs: number
}> {
	try {
		const events = await pb.collection('analytics_events').getFullList({
			filter: `type = "calendar_notification_latency" && created >= "${from.toISOString()}" && created <= "${to.toISOString()}"`,
			sort: '-created'
		})

		if (events.length === 0) {
			return {
				total: 0,
				withinSLA: 0,
				exceededSLA: 0,
				averageLatencyMs: 0,
				p95LatencyMs: 0
			}
		}

		const latencies = events
			.map((e) => {
				try {
					const metadata = JSON.parse(e.metadata as string)
					return metadata.latencyMs
				} catch {
					return 0
				}
			})
			.filter((l) => l > 0)

		const withinSLA = latencies.filter((l) => l <= SLA_THRESHOLD_MS).length
		const exceededSLA = latencies.filter((l) => l > SLA_THRESHOLD_MS).length
		const averageLatencyMs = latencies.reduce((sum, l) => sum + l, 0) / latencies.length

		// Calculate p95
		const sorted = [...latencies].sort((a, b) => a - b)
		const p95Index = Math.ceil(sorted.length * 0.95) - 1
		const p95LatencyMs = sorted[p95Index] || 0

		return {
			total: events.length,
			withinSLA,
			exceededSLA,
			averageLatencyMs,
			p95LatencyMs
		}
	} catch (error) {
		console.error('Failed to retrieve notification stats:', error)
		throw error
	}
}

/**
 * Creates an alert if notification delivery is consistently exceeding SLA
 * @param pb - PocketBase client instance
 * @param threshold - Number of consecutive violations before alerting
 */
export async function checkForAlerts(pb: PocketBase, threshold: number = 3): Promise<boolean> {
	try {
		// Get last N notification events
		const recentEvents = await pb.collection('analytics_events').getList(1, threshold, {
			filter: `type = "calendar_notification_latency"`,
			sort: '-created'
		})

		if (recentEvents.items.length < threshold) {
			return false
		}

		// Check if all recent events exceeded SLA
		const allExceeded = recentEvents.items.every((e) => {
			try {
				const metadata = JSON.parse(e.metadata as string)
				return metadata.exceededSLA === true
			} catch {
				return false
			}
		})

		if (allExceeded) {
			console.error(
				`🚨 ALERT: ${threshold} consecutive calendar notification SLA violations detected. Immediate attention required.`
			)
			return true
		}

		return false
	} catch (error) {
		console.error('Failed to check for alerts:', error)
		return false
	}
}
