/**
 * SLA Monitoring & Analytics for Messaging System
 *
 * Tracks key metrics for messaging feature:
 * - Message delivery latency
 * - Moderation case resolution times
 * - SLA breach alerts
 * - Performance statistics
 *
 * SLA Requirements:
 * - Messaging uptime: 99.5%
 * - Moderation response: ≤ 15 minutes
 * - Case resolution: ≤ 2 hours
 */

import { pb } from '$lib/pocketbase.js'

/**
 * @typedef {Object} MessageSLAMetric
 * @property {string} id
 * @property {string} messageId
 * @property {string} threadId
 * @property {number} deliveryLatencyMs - Time from send to delivered
 * @property {Date} sentAt
 * @property {Date} deliveredAt
 * @property {boolean} withinSLA - Was delivery within acceptable limits
 */

/**
 * @typedef {Object} ModerationCaseSLA
 * @property {string} caseId
 * @property {Date} createdAt
 * @property {Date | null} firstResponseAt
 * @property {Date | null} resolvedAt
 * @property {number} responseTimeMinutes
 * @property {number | null} resolutionTimeMinutes
 * @property {boolean} responseWithinSLA - < 15 minutes
 * @property {boolean} resolutionWithinSLA - < 120 minutes
 * @property {boolean} wasEscalated
 */

/**
 * @typedef {Object} SLAReport
 * @property {Date} reportDate
 * @property {number} totalMessages
 * @property {number} messagesWithinSLA
 * @property {number} slaCompliancePercent
 * @property {number} avgDeliveryLatencyMs
 * @property {number} p95DeliveryLatencyMs
 * @property {number} p99DeliveryLatencyMs
 * @property {number} totalCases
 * @property {number} casesWithinSLA
 * @property {number} avgResponseTimeMinutes
 * @property {number} avgResolutionTimeMinutes
 * @property {number} escalatedCases
 */

// SLA Thresholds
const SLA_THRESHOLDS = {
	MESSAGE_DELIVERY_MS: 5000, // 5 seconds max delivery time
	MODERATION_RESPONSE_MINUTES: 15, // 15 minutes to first moderator action
	MODERATION_RESOLUTION_MINUTES: 120, // 2 hours to case resolution
	UPTIME_TARGET_PERCENT: 99.5, // 99.5% uptime requirement
	ESCALATION_THRESHOLD_MINUTES: 15 // Auto-escalate after 15 minutes
}

/**
 * Track message delivery latency
 * @param {string} messageId
 * @param {string} threadId
 * @param {number} latencyMs - Delivery time in milliseconds
 */
export async function trackMessageDelivery(messageId: string, threadId: string, latencyMs: number) {
	try {
		const withinSLA = latencyMs <= SLA_THRESHOLDS.MESSAGE_DELIVERY_MS

		await pb.collection('analytics_events').create({
			event_type: 'message_delivery',
			user: null, // System event
			metadata: JSON.stringify({
				messageId,
				threadId,
				latencyMs,
				withinSLA,
				threshold: SLA_THRESHOLDS.MESSAGE_DELIVERY_MS
			})
		})

		if (!withinSLA) {
			console.warn(
				`[SLA] Message delivery exceeded SLA: ${latencyMs}ms for message ${messageId}`
			)
		}
	} catch (error) {
		console.error('Failed to track message delivery:', error)
	}
}

/**
 * Track moderation case timing
 * @param {string} caseId
 * @param {Date} createdAt
 * @param {Date | null} firstResponseAt
 * @param {Date | null} resolvedAt
 */
export async function trackModerationCase(
	caseId: string,
	createdAt: Date,
	firstResponseAt: Date | null,
	resolvedAt: Date | null
) {
	try {
		const responseTimeMinutes = firstResponseAt
			? (firstResponseAt.getTime() - createdAt.getTime()) / (1000 * 60)
			: null

		const resolutionTimeMinutes = resolvedAt
			? (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60)
			: null

		const responseWithinSLA = responseTimeMinutes
			? responseTimeMinutes <= SLA_THRESHOLDS.MODERATION_RESPONSE_MINUTES
			: false

		const resolutionWithinSLA = resolutionTimeMinutes
			? resolutionTimeMinutes <= SLA_THRESHOLDS.MODERATION_RESOLUTION_MINUTES
			: false

		await pb.collection('analytics_events').create({
			event_type: 'moderation_case_timing',
			user: null,
			metadata: JSON.stringify({
				caseId,
				responseTimeMinutes,
				resolutionTimeMinutes,
				responseWithinSLA,
				resolutionWithinSLA,
				thresholds: {
					response: SLA_THRESHOLDS.MODERATION_RESPONSE_MINUTES,
					resolution: SLA_THRESHOLDS.MODERATION_RESOLUTION_MINUTES
				}
			})
		})

		// Log SLA breaches
		if (responseTimeMinutes && !responseWithinSLA) {
			console.warn(
				`[SLA] Moderation response SLA breach: ${responseTimeMinutes.toFixed(1)}min for case ${caseId}`
			)
		}

		if (resolutionTimeMinutes && !resolutionWithinSLA) {
			console.warn(
				`[SLA] Moderation resolution SLA breach: ${resolutionTimeMinutes.toFixed(1)}min for case ${caseId}`
			)
		}
	} catch (error) {
		console.error('Failed to track moderation case:', error)
	}
}

/**
 * Check for cases that need escalation (open > 15 minutes)
 * @returns {Promise<Array<{caseId: string, ageMinutes: number}>>}
 */
export async function checkEscalationNeeded() {
	try {
		const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

		// Find open cases older than 15 minutes
		const cases = await pb.collection('moderation_cases').getFullList({
			filter: `state = "open" && created < "${fifteenMinutesAgo.toISOString()}"`,
			sort: 'created'
		})

		return cases.map((c) => {
			const ageMinutes = (Date.now() - new Date(c.created).getTime()) / (1000 * 60)
			return {
				caseId: c.id,
				ageMinutes: Math.round(ageMinutes),
				sourceType: c.sourceType,
				sourceId: c.sourceId
			}
		})
	} catch (error) {
		console.error('Failed to check escalation:', error)
		return []
	}
}

/**
 * Generate daily SLA report
 * @param {Date} [date] - Report date (defaults to yesterday)
 * @returns {Promise<SLAReport>}
 */
export async function generateDailySLAReport(date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
	try {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)

		const endOfDay = new Date(date)
		endOfDay.setHours(23, 59, 59, 999)

		// Query message delivery events
		const deliveryEvents = await pb.collection('analytics_events').getFullList({
			filter: `event_type = "message_delivery" && created >= "${startOfDay.toISOString()}" && created <= "${endOfDay.toISOString()}"`
		})

		// Parse delivery metrics
		const deliveryLatencies = deliveryEvents.map((e) => {
			const meta = JSON.parse(e.metadata)
			return meta.latencyMs
		})

		const messagesWithinSLA = deliveryEvents.filter((e) => {
			const meta = JSON.parse(e.metadata)
			return meta.withinSLA
		}).length

		// Query moderation case events
		const caseEvents = await pb.collection('analytics_events').getFullList({
			filter: `event_type = "moderation_case_timing" && created >= "${startOfDay.toISOString()}" && created <= "${endOfDay.toISOString()}"`
		})

		// Parse case metrics
		let totalResponseTime = 0
		let totalResolutionTime = 0
		let casesWithResponse = 0
		let casesWithResolution = 0
		let casesWithinSLA = 0
		let escalatedCount = 0

		for (const event of caseEvents) {
			const meta = JSON.parse(event.metadata)

			if (meta.responseTimeMinutes !== null) {
				totalResponseTime += meta.responseTimeMinutes
				casesWithResponse++
			}

			if (meta.resolutionTimeMinutes !== null) {
				totalResolutionTime += meta.resolutionTimeMinutes
				casesWithResolution++
			}

			if (meta.responseWithinSLA && meta.resolutionWithinSLA) {
				casesWithinSLA++
			}

			if (
				meta.responseTimeMinutes &&
				meta.responseTimeMinutes > SLA_THRESHOLDS.ESCALATION_THRESHOLD_MINUTES
			) {
				escalatedCount++
			}
		}

		// Calculate percentiles for delivery latency
		const sortedLatencies = deliveryLatencies.sort((a, b) => a - b)
		const p95Index = Math.floor(sortedLatencies.length * 0.95)
		const p99Index = Math.floor(sortedLatencies.length * 0.99)

		const report = {
			reportDate: date,
			totalMessages: deliveryEvents.length,
			messagesWithinSLA,
			slaCompliancePercent:
				deliveryEvents.length > 0 ? (messagesWithinSLA / deliveryEvents.length) * 100 : 100,
			avgDeliveryLatencyMs:
				deliveryLatencies.length > 0
					? deliveryLatencies.reduce((a, b) => a + b, 0) / deliveryLatencies.length
					: 0,
			p95DeliveryLatencyMs: sortedLatencies[p95Index] || 0,
			p99DeliveryLatencyMs: sortedLatencies[p99Index] || 0,
			totalCases: caseEvents.length,
			casesWithinSLA,
			avgResponseTimeMinutes:
				casesWithResponse > 0 ? totalResponseTime / casesWithResponse : 0,
			avgResolutionTimeMinutes:
				casesWithResolution > 0 ? totalResolutionTime / casesWithResolution : 0,
			escalatedCases: escalatedCount
		}

		// Store report
		await pb.collection('analytics_events').create({
			event_type: 'sla_daily_report',
			user: null,
			metadata: JSON.stringify(report)
		})

		return report
	} catch (error) {
		console.error('Failed to generate SLA report:', error)
		throw error
	}
}

/**
 * Get real-time SLA dashboard metrics
 * @returns {Promise<Object>}
 */
export async function getDashboardMetrics() {
	try {
		const now = new Date()
		const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

		// Open cases
		const openCases = await pb.collection('moderation_cases').getFullList({
			filter: 'state = "open" || state = "in_review"'
		})

		// Cases needing escalation
		const needsEscalation = await checkEscalationNeeded()

		// Recent delivery events
		const recentDeliveries = await pb.collection('analytics_events').getFullList({
			filter: `event_type = "message_delivery" && created >= "${last24Hours.toISOString()}"`,
			sort: '-created',
			$autoCancel: false
		})

		const recentCases = await pb.collection('analytics_events').getFullList({
			filter: `event_type = "moderation_case_timing" && created >= "${last24Hours.toISOString()}"`,
			sort: '-created',
			$autoCancel: false
		})

		// Calculate current metrics
		const deliverySuccessRate =
			recentDeliveries.length > 0
				? (recentDeliveries.filter((e) => JSON.parse(e.metadata).withinSLA).length /
						recentDeliveries.length) *
					100
				: 100

		const avgCaseResponseTime =
			recentCases.length > 0
				? recentCases.reduce((sum, e) => {
						const meta = JSON.parse(e.metadata)
						return sum + (meta.responseTimeMinutes || 0)
					}, 0) / recentCases.length
				: 0

		return {
			timestamp: now,
			openCasesCount: openCases.length,
			escalationNeededCount: needsEscalation.length,
			deliverySuccessRate24h: deliverySuccessRate,
			avgResponseTime24h: avgCaseResponseTime,
			messagesLast24h: recentDeliveries.length,
			casesLast24h: recentCases.length,
			slaStatus:
				deliverySuccessRate >= SLA_THRESHOLDS.UPTIME_TARGET_PERCENT
					? 'healthy'
					: 'degraded',
			needsEscalation: needsEscalation
		}
	} catch (error) {
		console.error('Failed to get dashboard metrics:', error)
		throw error
	}
}

/**
 * Track a critical SLA breach event
 * @param {string} type - Breach type (delivery, response, resolution)
 * @param {Object} details - Breach details
 */
export async function trackSLABreach(type: string, details: Record<string, unknown>) {
	try {
		await pb.collection('analytics_events').create({
			event_type: 'sla_breach',
			user: null,
			metadata: JSON.stringify({
				breachType: type,
				timestamp: new Date().toISOString(),
				...details
			})
		})

		// Log to console for immediate visibility
		console.error(`[SLA BREACH] ${type}:`, details)

		// TODO: Trigger alerts (email, Slack, PagerDuty, etc.)
	} catch (error) {
		console.error('Failed to track SLA breach:', error)
	}
}

export { SLA_THRESHOLDS }
