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

const serverEnv = globalThis.process?.env ?? {}

const alertConfig = {
	emailWebhookUrl: serverEnv.SLA_ALERT_EMAIL_WEBHOOK_URL,
	emailRecipients: (serverEnv.SLA_ALERT_EMAIL_TO ?? '')
		.split(',')
		.map((recipient) => recipient.trim())
		.filter(Boolean),
	slackWebhookUrl: serverEnv.SLA_ALERT_SLACK_WEBHOOK_URL,
	pagerDutyRoutingKey: serverEnv.SLA_ALERT_PAGERDUTY_ROUTING_KEY,
	pagerDutySource: serverEnv.SLA_ALERT_SOURCE ?? 'campus-messaging'
}

type AlertSeverity = 'warning' | 'critical'

interface SlaAlertPayload {
	type: string
	severity: AlertSeverity
	details: Record<string, unknown>
	timestamp: string
}

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

interface AnalyticsEvent {
	id: string
	metadata: string
	[key: string]: unknown
}

interface DeliveryMetrics {
	totalMessages: number
	messagesWithinSLA: number
	deliveryLatencies: number[]
	sortedLatencies: number[]
	p95Index: number
	p99Index: number
}

interface CaseMetrics {
	totalCases: number
	casesWithinSLA: number
	avgResponseTimeMinutes: number
	avgResolutionTimeMinutes: number
	escalatedCount: number
}

/**
 * Calculate delivery metrics from events
 */
function calculateDeliveryMetrics(deliveryEvents: AnalyticsEvent[]): DeliveryMetrics {
	const deliveryLatencies = deliveryEvents
		.map((event) => {
			const meta = JSON.parse(event.metadata)
			return typeof meta.latencyMs === 'number' ? meta.latencyMs : null
		})
		.filter(
			(latency): latency is number => typeof latency === 'number' && Number.isFinite(latency)
		)

	const messagesWithinSLA = deliveryEvents.filter((e) => {
		const meta = JSON.parse(e.metadata)
		return meta.withinSLA
	}).length

	const sortedLatencies = [...deliveryLatencies].sort((a, b) => a - b)
	const p95Index = Math.floor(sortedLatencies.length * 0.95)
	const p99Index = Math.floor(sortedLatencies.length * 0.99)

	return {
		totalMessages: deliveryEvents.length,
		messagesWithinSLA,
		deliveryLatencies,
		sortedLatencies,
		p95Index,
		p99Index
	}
}

/**
 * Calculate moderation case metrics from events
 */
function calculateCaseMetrics(caseEvents: AnalyticsEvent[]): CaseMetrics {
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

	return {
		totalCases: caseEvents.length,
		casesWithinSLA,
		avgResponseTimeMinutes: casesWithResponse > 0 ? totalResponseTime / casesWithResponse : 0,
		avgResolutionTimeMinutes:
			casesWithResolution > 0 ? totalResolutionTime / casesWithResolution : 0,
		escalatedCount
	}
}

/**
 * Build SLA report object
 */
function buildSLAReport(date: Date, deliveryMetrics: DeliveryMetrics, caseMetrics: CaseMetrics) {
	const {
		totalMessages,
		messagesWithinSLA,
		deliveryLatencies,
		sortedLatencies,
		p95Index,
		p99Index
	} = deliveryMetrics

	return {
		reportDate: date,
		totalMessages,
		messagesWithinSLA,
		slaCompliancePercent: totalMessages > 0 ? (messagesWithinSLA / totalMessages) * 100 : 100,
		avgDeliveryLatencyMs:
			deliveryLatencies.length > 0
				? deliveryLatencies.reduce((sum, latency) => sum + latency, 0) /
					deliveryLatencies.length
				: 0,
		p95DeliveryLatencyMs: sortedLatencies[p95Index] || 0,
		p99DeliveryLatencyMs: sortedLatencies[p99Index] || 0,
		totalCases: caseMetrics.totalCases,
		casesWithinSLA: caseMetrics.casesWithinSLA,
		avgResponseTimeMinutes: caseMetrics.avgResponseTimeMinutes,
		avgResolutionTimeMinutes: caseMetrics.avgResolutionTimeMinutes,
		escalatedCases: caseMetrics.escalatedCount
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

		// Query moderation case events
		const caseEvents = await pb.collection('analytics_events').getFullList({
			filter: `event_type = "moderation_case_timing" && created >= "${startOfDay.toISOString()}" && created <= "${endOfDay.toISOString()}"`
		})

		// Calculate metrics
		const deliveryMetrics = calculateDeliveryMetrics(
			deliveryEvents as unknown as AnalyticsEvent[]
		)
		const caseMetrics = calculateCaseMetrics(caseEvents as unknown as AnalyticsEvent[])

		// Build report
		const report = buildSLAReport(date, deliveryMetrics, caseMetrics)

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

function resolveAlertSeverity(type: string): AlertSeverity {
	if (type === 'delivery') {
		return 'warning'
	}
	return 'critical'
}

function formatDetails(details: Record<string, unknown>) {
	return Object.entries(details)
		.map(
			([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
		)
		.join(', ')
}

function buildEmailBody(payload: SlaAlertPayload) {
	return [
		`Breach type: ${payload.type}`,
		`Severity: ${payload.severity}`,
		`Timestamp: ${payload.timestamp}`,
		`Details: ${JSON.stringify(payload.details, null, 2)}`
	].join('\n')
}

async function sendSlackAlert(payload: SlaAlertPayload) {
	if (!alertConfig.slackWebhookUrl) return
	try {
		const response = await fetch(alertConfig.slackWebhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				text: `*[${payload.severity.toUpperCase()}]* SLA breach (${payload.type})\n${formatDetails(payload.details)}`
			})
		})
		if (!response.ok) {
			console.error('[SLA] Failed to send Slack alert', response.statusText)
		}
	} catch (error) {
		console.error('[SLA] Slack alert error', error)
	}
}

async function sendEmailAlert(payload: SlaAlertPayload) {
	if (!alertConfig.emailWebhookUrl) return
	try {
		const response = await fetch(alertConfig.emailWebhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				subject: `[SLA] ${payload.severity.toUpperCase()} breach (${payload.type})`,
				to: alertConfig.emailRecipients,
				body: buildEmailBody(payload)
			})
		})
		if (!response.ok) {
			console.error('[SLA] Failed to send email alert', response.statusText)
		}
	} catch (error) {
		console.error('[SLA] Email alert error', error)
	}
}

async function sendPagerDutyAlert(payload: SlaAlertPayload) {
	if (!alertConfig.pagerDutyRoutingKey) return
	try {
		const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				routing_key: alertConfig.pagerDutyRoutingKey,
				event_action: 'trigger',
				payload: {
					summary: `SLA breach (${payload.type})`,
					severity: payload.severity === 'critical' ? 'critical' : 'warning',
					source: alertConfig.pagerDutySource,
					custom_details: payload.details
				}
			})
		})
		if (!response.ok) {
			console.error('[SLA] Failed to send PagerDuty alert', response.statusText)
		}
	} catch (error) {
		console.error('[SLA] PagerDuty alert error', error)
	}
}

async function dispatchSlaBreachAlerts(payload: SlaAlertPayload) {
	await Promise.allSettled([
		sendSlackAlert(payload),
		sendEmailAlert(payload),
		sendPagerDutyAlert(payload)
	])
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

		const alertPayload: SlaAlertPayload = {
			type,
			severity: resolveAlertSeverity(type),
			details,
			timestamp: new Date().toISOString()
		}
		await dispatchSlaBreachAlerts(alertPayload)
	} catch (error) {
		console.error('Failed to track SLA breach:', error)
	}
}

export { SLA_THRESHOLDS }
