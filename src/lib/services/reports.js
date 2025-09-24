import { pb } from '../pocketbase.js';
import { canModeratePost, canModerateComment } from './permissions.js';

/**
 * Create a report
 * @param {{targetType:'post'|'comment'; targetId:string; reason?:string}} params
 */
export async function reportContent({ targetType, targetId, reason }) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  if (!['post','comment'].includes(targetType)) throw new Error('Invalid targetType');
  const data = {
    reporter: pb.authStore.model.id,
    targetType,
    targetId,
    reason: reason?.trim() || 'unspecified',
    status: 'open'
  };
  return await pb.collection('reports').create(data);
}

/** List open reports */
export async function listReports({ status = 'open', page = 1, perPage = 50 } = {}) {
  const filter = status ? `status = "${status}"` : '';
  return await pb.collection('reports').getList(page, perPage, { filter, sort: '-created' });
}

/**
 * Update report status (resolve/dismiss/reviewing)
 * @param {string} reportId
 * @param {'open'|'reviewing'|'resolved'|'dismissed'} newStatus
 */
export async function updateReportStatus(reportId, newStatus) {
  if (!pb.authStore.model?.id) throw new Error('Not authenticated');
  const report = await pb.collection('reports').getOne(reportId);
  if (!report) throw new Error('Report not found');
  // Check permission via target
  let allowed = false;
  if (report.targetType === 'post') {
    const post = await pb.collection('posts').getOne(report.targetId);
    allowed = await canModeratePost(post);
  } else if (report.targetType === 'comment') {
    const comment = await pb.collection('comments').getOne(report.targetId);
    allowed = await canModerateComment(comment);
  }
  if (!allowed) throw new Error('Not authorized to modify report');

  const updated = await pb.collection('reports').update(reportId, { status: newStatus });
  // Log
  await pb.collection('moderation_logs').create({
    actor: pb.authStore.model.id,
    action: newStatus === 'resolved' ? 'resolve_report' : newStatus === 'dismissed' ? 'dismiss_report' : 'resolve_report',
    meta: { reportId, newStatus }
  });
  return updated;
}
