import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Simple template renderer that replaces {{variable}} placeholders
 * @param {string} template - HTML template string
 * @param {Record<string, any>} variables - Variables to replace
 * @returns {string} Rendered HTML
 */
function renderTemplate(template, variables) {
	let rendered = template

	// Replace {{variable}} placeholders
	for (const [key, value] of Object.entries(variables)) {
		const regex = new RegExp(`{{${key}}}`, 'g')
		rendered = rendered.replace(regex, value ?? '')
	}

	// Handle conditional blocks {{#if variable}}...{{/if}}
	rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, key, content) => {
		return variables[key] ? content : ''
	})

	return rendered
}

/**
 * Load and render email template
 * @param {string} templateName - Template file name (without extension)
 * @param {Record<string, any>} variables - Variables to replace in template
 * @returns {string} Rendered HTML email
 */
export function renderEmailTemplate(templateName, variables) {
	try {
		const templatePath = join(
			process.cwd(),
			'src',
			'lib',
			'server',
			'notifications',
			'templates',
			`${templateName}.html`
		)
		const template = readFileSync(templatePath, 'utf-8')
		return renderTemplate(template, variables)
	} catch (error) {
		console.error(`Failed to render email template ${templateName}:`, error)
		return generateFallbackEmail(templateName, variables)
	}
}

/**
 * Generate a plain text fallback email when template rendering fails
 * @param {string} templateName
 * @param {Record<string, any>} variables
 * @returns {string}
 */
function generateFallbackEmail(templateName, variables) {
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>${templateName}</title>
</head>
<body style="font-family: sans-serif; padding: 20px;">
	<h2>${templateName}</h2>
	<pre>${JSON.stringify(variables, null, 2)}</pre>
</body>
</html>
	`.trim()
}

/**
 * Prepare message flagged email
 * @param {Object} params
 * @param {string} params.caseId
 * @param {string} params.threadId
 * @param {string} params.threadTitle
 * @param {string} params.reporterName
 * @param {string} params.reason
 * @param {number} params.flagCount
 * @param {string} params.baseUrl
 * @returns {string} HTML email
 */
export function renderMessageFlaggedEmail({
	caseId,
	threadId,
	threadTitle,
	reporterName,
	reason,
	flagCount,
	baseUrl
}) {
	return renderEmailTemplate('message-flagged', {
		caseId,
		threadTitle,
		reporterName,
		reason,
		flagCount,
		timestamp: new Date().toLocaleString(),
		moderationUrl: `${baseUrl}/admin/moderation/${caseId}`,
		dashboardUrl: `${baseUrl}/admin/moderation`,
		guidelinesUrl: `${baseUrl}/guidelines`,
		settingsUrl: `${baseUrl}/profile/settings`
	})
}

/**
 * Prepare moderation escalated email
 * @param {Object} params
 * @param {string} params.caseId
 * @param {string} params.sourceType
 * @param {number} params.ageMinutes
 * @param {string} params.originalTimestamp
 * @param {string} params.baseUrl
 * @returns {string} HTML email
 */
export function renderModerationEscalatedEmail({
	caseId,
	sourceType,
	ageMinutes,
	originalTimestamp,
	baseUrl
}) {
	const overdueMinutes = Math.max(0, ageMinutes - 15)

	return renderEmailTemplate('moderation-escalated', {
		caseId,
		sourceType,
		ageMinutes,
		overdueMinutes,
		originalTimestamp,
		caseUrl: `${baseUrl}/admin/moderation/${caseId}`,
		dashboardUrl: `${baseUrl}/admin/moderation`,
		slaReportUrl: `${baseUrl}/admin/reports/sla`
	})
}

/**
 * Prepare daily moderation summary email
 * @param {Object} params
 * @param {number} params.newCases
 * @param {number} params.resolvedCases
 * @param {number} params.openCases
 * @param {number} params.escalatedCases
 * @param {number} params.messageFlags
 * @param {number} params.postReports
 * @param {number} params.commentFlags
 * @param {string} params.avgResolutionTime
 * @param {number} params.slaCompliance
 * @param {string} params.avgResponseTime
 * @param {string} params.trend
 * @param {string} params.baseUrl
 * @returns {string} HTML email
 */
export function renderModerationDailySummaryEmail(params) {
	const resolutionTimeClass =
		params.avgResolutionTime.includes('min') && parseInt(params.avgResolutionTime) < 15
			? 'status-good'
			: parseInt(params.avgResolutionTime) < 60
				? 'status-warning'
				: 'status-critical'

	const slaComplianceClass =
		params.slaCompliance >= 95
			? 'status-good'
			: params.slaCompliance >= 90
				? 'status-warning'
				: 'status-critical'

	return renderEmailTemplate('moderation-daily-summary', {
		...params,
		date: new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}),
		resolutionTimeClass,
		slaComplianceClass,
		dashboardUrl: `${params.baseUrl}/admin/moderation`,
		analyticsUrl: `${params.baseUrl}/admin/analytics`,
		guidelinesUrl: `${params.baseUrl}/guidelines`,
		settingsUrl: `${params.baseUrl}/profile/settings`
	})
}

/**
 * Send email via configured email service
 * Note: This is a placeholder. In production, integrate with:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Postmark
 * - Or PocketBase's built-in email (if configured)
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML email body
 * @param {string} [params.text] - Plain text fallback
 */
export async function sendEmail({ to, subject, html, text }) {
	// TODO: Integrate with actual email service
	// For now, just log
	console.log('[EMAIL] Would send email:', {
		to,
		subject,
		htmlLength: html.length,
		textLength: text?.length || 0
	})

	// In production, you would do something like:
	/*
	if (process.env.EMAIL_SERVICE === 'sendgrid') {
		const sgMail = require('@sendgrid/mail');
		sgMail.setApiKey(process.env.SENDGRID_API_KEY);
		await sgMail.send({
			to,
			from: process.env.FROM_EMAIL,
			subject,
			text: text || stripHtml(html),
			html
		});
	} else if (process.env.EMAIL_SERVICE === 'pocketbase') {
		// Use PocketBase's built-in email if configured
		// This would require accessing PocketBase's internal email API
	}
	*/

	return true
}
