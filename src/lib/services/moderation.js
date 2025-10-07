import { pb } from '../pocketbase.js';
import { canModeratePost, canModerateComment } from './permissions.js';
import { normalizeError } from '../utils/errors.js';

const ACTIVE_CASE_FILTER = 'state != "resolved"';

/**
 * Determine if an error corresponds to a missing PocketBase record.
 * @param {unknown} error
 */
function isNotFoundError(error) {
	if (!error || typeof error !== 'object') return false;
	const status = Reflect.get(error, 'status') ?? Reflect.get(error, 'code');
	if (typeof status === 'number' && status === 404) return true;
	const data = /** @type {{ status?: number }} */ (Reflect.get(error, 'data'));
	if (data && typeof data.status === 'number' && data.status === 404) return true;
	const message = Reflect.get(error, 'message');
	return typeof message === 'string' && /not\s+found/i.test(message);
}

/**
 * Normalize evidence payload for moderation cases.
 * @param {unknown} evidence
 * @returns {Array<Record<string, unknown>>}
 */
function normalizeEvidence(evidence) {
	if (!evidence) return [];
	if (Array.isArray(evidence)) {
		return evidence.map((entry) => normalizeEvidence(entry)[0]).filter(Boolean);
	}
	if (typeof evidence === 'object') {
		return [
			{
				...evidence,
				capturedAt:
					typeof Reflect.get(evidence, 'capturedAt') === 'string'
						? Reflect.get(evidence, 'capturedAt')
						: new Date().toISOString()
			}
		];
	}
	return [];
}

/**
 * Generate a deterministic signature for a moderation evidence entry.
 * @param {Record<string, unknown>} entry
 */
function evidenceSignature(entry) {
	try {
		return JSON.stringify({
			t: entry?.type ?? null,
			v: entry?.value ?? null,
			m: entry?.meta ?? null
		});
	} catch (error) {
		console.warn('[moderation] unable to stringify evidence entry for signature', error);
		return Math.random().toString(36);
	}
}

/**
 * Ensure a moderation case exists for the provided source entity, appending evidence if necessary.
 * @param {{
 *  sourceType: 'post'|'comment'|'message';
 *  sourceId: string | null | undefined;
 *  evidence?: Record<string, unknown> | Record<string, unknown>[];
 *  state?: 'open'|'in_review'|'resolved'|'escalated';
 *  assignedTo?: string | null;
 *  pbClient?: import('pocketbase').default;
 * }} options
 */
export async function ensureModerationCase({
	sourceType,
	sourceId,
	evidence,
	state = 'open',
	assignedTo = null,
	pbClient
}) {
	if (!sourceId) return null;
	const client = pbClient ?? pb;
	const collection = client.collection('moderation_cases');
	const evidenceEntries = normalizeEvidence(evidence);
	let existing = null;
	try {
		existing = await collection.getFirstListItem(
			`sourceType = "${sourceType}" && sourceId = "${sourceId}" && ${ACTIVE_CASE_FILTER}`,
			{ requestKey: `moderation-case-${sourceType}-${sourceId}` }
		);
	} catch (error) {
		if (!isNotFoundError(error)) {
			console.warn('[moderation] failed to lookup moderation case', normalizeError(error));
		}
	}

	if (existing) {
		if (evidenceEntries.length === 0) return existing;
		const currentEvidence = Array.isArray(existing.evidence) ? existing.evidence.slice() : [];
		const seen = new Set(currentEvidence.map(evidenceSignature));
		let appended = false;
		for (const entry of evidenceEntries) {
			const sig = evidenceSignature(entry);
			if (!seen.has(sig)) {
				currentEvidence.push(entry);
				seen.add(sig);
				appended = true;
			}
		}
		if (!appended) {
			return existing;
		}
		try {
			await collection.update(existing.id, { evidence: currentEvidence });
			return { ...existing, evidence: currentEvidence };
		} catch (error) {
			console.warn(
				'[moderation] failed to append evidence to moderation case',
				normalizeError(error)
			);
			return existing;
		}
	}

	try {
		return await collection.create({
			sourceType,
			sourceId,
			state,
			assignedTo,
			evidence: evidenceEntries
		});
	} catch (error) {
		console.warn('[moderation] failed to create moderation case', normalizeError(error));
		return null;
	}
}

/**
 * Persist moderation metadata emitted from post creation to an auto-generated case.
 * @param {import('./posts.js').ModerationSignalPayload} metadata
 * @param {{ pbClient?: import('pocketbase').default }} [options]
 */
export async function recordPostModerationSignal(metadata, options = {}) {
	if (!metadata) return;
	if (metadata.mediaType !== 'video') return;
	const postId = metadata.postId;
	if (!postId) return;
	const pbClient = options.pbClient ?? pb;
	const evidence = {
		type: 'auto_flag',
		value: 'video_post',
		meta: {
			scope: metadata.scope,
			attachmentCount: metadata.attachmentCount,
			hasAltText: metadata.hasAltText,
			hasPoster: metadata.hasPoster,
			videoDuration: metadata.videoDuration,
			contentLength: metadata.contentLength,
			containsLinks: metadata.containsLinks,
			wordCount: metadata.wordCount
		},
		capturedAt: new Date().toISOString()
	};
	await ensureModerationCase({
		sourceType: 'post',
		sourceId: postId,
		evidence,
		state: 'in_review',
		pbClient
	});
}

/** Delete post with permission check and log */
/** @param {string} postId */
export async function deletePostModerated(postId) {
	try {
		if (!pb.authStore.model?.id) throw new Error('Not authenticated');
		const post = await pb.collection('posts').getOne(postId);
		if (!(await canModeratePost(post))) throw new Error('Not authorized to delete post');
		await pb.collection('posts').delete(postId);
		await pb.collection('moderation_logs').create({
			actor: pb.authStore.model.id,
			action: 'delete_post',
			meta: { postId }
		});
		return true;
	} catch (error) {
		console.error('Error deleting moderated post:', error);
		throw normalizeError(error, { context: 'deletePostModerated' });
	}
}

/** Delete comment with permission check and log */
/** @param {string} commentId */
export async function deleteCommentModerated(commentId) {
	try {
		if (!pb.authStore.model?.id) throw new Error('Not authenticated');
		const comment = await pb.collection('comments').getOne(commentId);
		if (!(await canModerateComment(comment))) throw new Error('Not authorized to delete comment');
		await pb.collection('comments').delete(commentId);
		await pb.collection('moderation_logs').create({
			actor: pb.authStore.model.id,
			action: 'delete_comment',
			meta: { commentId, postId: comment.post }
		});
		return true;
	} catch (error) {
		console.error('Error deleting moderated comment:', error);
		throw normalizeError(error, { context: 'deleteCommentModerated' });
	}
}
