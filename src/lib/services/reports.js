import { pb } from '../pocketbase.js'
import { normalizeError } from '../utils/errors.ts'
import { ensureModerationCase } from './moderation.js'
import { canModerateComment, canModeratePost } from './permissions.js'

/**
 * Create a report
 * @param {{targetType:'post'|'comment'; targetId:string; reason?:string}} params
 */
export async function reportContent({ targetType, targetId, reason }) {
	try {
		if (!pb.authStore.model?.id) throw new Error('Not authenticated')
		if (!['post', 'comment'].includes(targetType)) throw new Error('Invalid targetType')
		/** @type {Record<string, any>} */
		const data = {
			reporter: pb.authStore.model.id,
			targetType,
			targetId,
			reason: reason?.trim() || 'unspecified',
			status: 'open'
		}
		if (targetType === 'post') {
			data.post = targetId
			delete data.comment
		} else if (targetType === 'comment') {
			data.comment = targetId
			delete data.post
		}
		const created = await pb.collection('reports').create(data)
		await ensureModerationCase({
			sourceType: targetType,
			sourceId: targetId,
			evidence: {
				type: 'user_report',
				value: reason?.trim() || 'unspecified',
				meta: {
					reportId: created.id,
					reporter: pb.authStore.model?.id ?? null
				}
			}
		})
		return created
	} catch (error) {
		console.error('Error reporting content:', error)
		throw normalizeError(error, { context: 'reportContent' })
	}
}

/** List open reports */
export async function listReports({ status = 'open', page = 1, perPage = 50 } = {}) {
	try {
		const filter = status ? `status = "${status}"` : ''
		return await pb.collection('reports').getList(page, perPage, { filter, sort: '-created' })
	} catch (error) {
		console.error('Error listing reports:', error)
		throw normalizeError(error, { context: 'listReports' })
	}
}

/**
 * Update report status (resolve/dismiss/reviewing)
 * @param {string} reportId
 * @param {'open'|'reviewing'|'resolved'|'dismissed'} newStatus
 */
export async function updateReportStatus(reportId, newStatus) {
	try {
		if (!pb.authStore.model?.id) throw new Error('Not authenticated')
		const report = await pb.collection('reports').getOne(reportId, {
			expand: 'post,post.space,post.group,post.group.space,comment,comment.post,comment.post.space,comment.post.group,comment.post.group.space'
		})
		if (!report) throw new Error('Report not found')
		// Check permission via target
		let allowed = false
		if (report.expand?.post || report.post) {
			const post = report.expand?.post || (await pb.collection('posts').getOne(report.post))
			allowed = await canModeratePost(post)
		}
		if (!allowed && (report.expand?.comment || report.comment)) {
			const comment =
				report.expand?.comment ||
				(await pb.collection('comments').getOne(report.comment, { expand: 'post' }))
			allowed = await canModerateComment(comment)
		}
		if (!allowed && report.targetType === 'post' && report.targetId) {
			const post = await pb.collection('posts').getOne(report.targetId)
			allowed = await canModeratePost(post)
		}
		if (!allowed && report.targetType === 'comment' && report.targetId) {
			const comment = await pb
				.collection('comments')
				.getOne(report.targetId, { expand: 'post' })
			allowed = await canModerateComment(comment)
		}
		if (!allowed) throw new Error('Not authorized to modify report')

		const updated = await pb.collection('reports').update(reportId, { status: newStatus })
		// Log
		await pb.collection('moderation_logs').create({
			actor: pb.authStore.model.id,
			action:
				newStatus === 'resolved'
					? 'resolve_report'
					: newStatus === 'dismissed'
						? 'dismiss_report'
						: 'resolve_report',
			meta: { reportId, newStatus }
		})
		return updated
	} catch (error) {
		console.error('Error updating report status:', error)
		throw normalizeError(error, { context: 'updateReportStatus' })
	}
}
