/// <reference path="../pb_data/types.d.ts" />

/**
 * Messaging & Moderation Hooks
 * Automatically handles flag creation, case management, and moderation alerts
 */

// Constants
const FLAG_THRESHOLD = 3; // Number of flags before auto-locking thread
const ESCALATION_SLA_MINUTES = 15; // Time before escalating unresolved cases

// Helper: Get moderator user IDs
function getModerators() {
	try {
		const moderators = arrayOf(new Record());
		$app
			.findRecordsByFilter('_pb_users_auth_', 'is_admin = true', '-created', 100, 0, moderators);
		return moderators.map((m) => m.id);
	} catch (e) {
		console.error('[messaging.js] Failed to fetch moderators:', e);
		return [];
	}
}

// Helper: Create or find existing moderation case
function createOrFindModerationCase(sourceType, sourceId, evidence) {
	try {
		// Check if case already exists
		const existingCase = $app.findFirstRecordByFilter(
			'moderation_cases',
			`sourceType = {:type} && sourceId = {:id} && state != 'resolved'`,
			{
				type: sourceType,
				id: sourceId
			}
		);

		if (existingCase) {
			return existingCase;
		}

		// Create new case
		const caseCollection = $app.findCollectionByNameOrId('moderation_cases');
		const newCase = new Record(caseCollection);
		newCase.set('sourceType', sourceType);
		newCase.set('sourceId', sourceId);
		newCase.set('state', 'open');
		newCase.set('evidence', evidence);

		$app.save(newCase);
		return newCase;
	} catch (e) {
		console.error('[messaging.js] Failed to create moderation case:', e);
		return null;
	}
}

// Helper: Send notification to moderators
function notifyModerators(caseId, messageId, threadId, reason) {
	const moderatorIds = getModerators();
	if (moderatorIds.length === 0) {
		console.warn('[messaging.js] No moderators found to notify');
		return;
	}

	const notificationCollection = $app.findCollectionByNameOrId('notifications');
	if (!notificationCollection) {
		console.warn('[messaging.js] Notifications collection not found');
		return;
	}

	moderatorIds.forEach((modId) => {
		try {
			const notification = new Record(notificationCollection);
			notification.set('user', modId);
			notification.set('type', 'moderation_alert');
			notification.set('title', 'New Message Flagged for Review');
			notification.set('message', `A message in thread ${threadId} has been flagged: ${reason}`);
			notification.set('metadata', {
				caseId: caseId,
				messageId: messageId,
				threadId: threadId,
				severity: 'medium'
			});
			notification.set('read', false);

			$app.save(notification);
		} catch (e) {
			console.error('[messaging.js] Failed to create notification for moderator:', modId, e);
		}
	});
}

// Helper: Update thread moderation status
function updateThreadModerationStatus(threadId, status) {
	try {
		const thread = $app.findRecordById('conversation_threads', threadId);
		if (thread) {
			thread.set('moderationStatus', status);
			$app.save(thread);
			console.log(`[messaging.js] Thread ${threadId} moderation status updated to: ${status}`);
		}
	} catch (e) {
		console.error('[messaging.js] Failed to update thread moderation status:', e);
	}
}

// Hook: Handle flag creation (after successful persistence)
onRecordAfterCreateSuccess(
	(e) => {
		const flag = e.record;

		try {
			// Expand relations to get full context
			const message = $app.findRecordById('messages', flag.get('message'), {
				expand: 'thread'
			});

			if (!message) {
				console.error('[messaging.js] Message not found for flag:', flag.id);
				return e.next();
			}

			const thread = message.expandedOne('thread');
			if (!thread) {
				console.error('[messaging.js] Thread not found for message:', message.id);
				return e.next();
			}

			// Run moderation workflow in a transaction-safe manner
			// Note: We're outside the original transaction, so this is a new operation
			const currentFlagCount = message.getInt('flagCount') || 0;
			const newFlagCount = currentFlagCount + 1;

			// Update message flag count and status
			message.set('flagCount', newFlagCount);

			// Check if threshold reached
			if (newFlagCount >= FLAG_THRESHOLD && message.getString('status') === 'visible') {
				message.set('status', 'pending_review');
				console.log(
					`[messaging.js] Message ${message.id} reached flag threshold (${newFlagCount}), marking for review`
				);

				// Lock thread if multiple messages are flagged
				updateThreadModerationStatus(thread.id, 'locked');
			} else if (newFlagCount === 1) {
				// First flag - just mark as pending
				message.set('status', 'pending_review');
			}

			$app.save(message);

			// Create or find moderation case
			const evidence = [
				{
					type: 'flag',
					flagId: flag.id,
					reporter: flag.getString('reporter'),
					reason: flag.getString('reason'),
					capturedAt: new Date().toISOString()
				},
				{
					type: 'message_snapshot',
					body: message.getString('body'),
					attachments: message.get('attachments') || [],
					flagCount: newFlagCount,
					capturedAt: new Date().toISOString()
				}
			];

			const moderationCase = createOrFindModerationCase('message', message.id, evidence);

			if (moderationCase) {
				// Store case reference on the flag for tracking
				flag.set('metadata', { moderationCaseId: moderationCase.id });
				$app.save(flag);

				// Notify moderators
				notifyModerators(moderationCase.id, message.id, thread.id, flag.getString('reason'));

				// Track SLA metrics - create analytics event
				try {
					const analyticsCollection = $app.findCollectionByNameOrId('analytics_events');
					if (analyticsCollection) {
						const event = new Record(analyticsCollection);
						event.set('event_type', 'moderation_case_created');
						event.set('user', null); // System event
						event.set('metadata', {
							caseId: moderationCase.id,
							messageId: message.id,
							threadId: thread.id,
							flagCount: newFlagCount,
							createdAt: new Date().toISOString()
						});
						$app.save(event);
					}
				} catch (slaError) {
					console.error('[messaging.js] Failed to track SLA metrics:', slaError);
				}

				console.log(
					`[messaging.js] Moderation case ${moderationCase.id} created/updated for message ${message.id}`
				);
			}
		} catch (error) {
			console.error('[messaging.js] Error in flag creation handler:', error);
		}

		return e.next();
	},
	'message_flags'
);

// Hook: Update thread lastMessageAt when message is created
onRecordAfterCreateSuccess(
	(e) => {
		const message = e.record;

		try {
			const threadId = message.getString('thread');
			const thread = $app.findRecordById('conversation_threads', threadId);

			if (thread) {
				// Update lastMessageAt to current time
				thread.set('lastMessageAt', new Date().toISOString());
				$app.save(thread);
			}
		} catch (error) {
			console.error('[messaging.js] Error updating thread lastMessageAt:', error);
		}

		return e.next();
	},
	'messages'
);

// Hook: Prevent message creation in locked threads
onRecordCreate(
	(e) => {
		const message = e.record;

		try {
			const threadId = message.getString('thread');
			const thread = $app.findRecordById('conversation_threads', threadId);

			if (thread && thread.getString('moderationStatus') === 'locked') {
				throw new BadRequestError(
					'Cannot send messages in a locked thread. Please contact moderators for assistance.'
				);
			}
		} catch (error) {
			if (error instanceof BadRequestError) {
				throw error;
			}
			console.error('[messaging.js] Error checking thread moderation status:', error);
		}

		return e.next();
	},
	'messages'
);

// Cron job: Escalate unresolved moderation cases
// Runs every 15 minutes
cronAdd('moderation-escalation', `*/${ESCALATION_SLA_MINUTES} * * * *`, () => {
	console.log('[messaging.js] Running moderation escalation job');

	try {
		const cutoffTime = new Date();
		cutoffTime.setMinutes(cutoffTime.getMinutes() - ESCALATION_SLA_MINUTES);
		const cutoffISO = cutoffTime.toISOString();

		// Find cases that are open and older than SLA
		const staleCases = arrayOf(new Record());
		$app.findRecordsByFilter(
			'moderation_cases',
			`state = 'open' && created < {:cutoff}`,
			'-created',
			50,
			0,
			staleCases,
			{ cutoff: cutoffISO }
		);

		console.log(`[messaging.js] Found ${staleCases.length} cases exceeding SLA`);

		staleCases.forEach((moderationCase) => {
			try {
				// Escalate case
				moderationCase.set('state', 'escalated');
				$app.save(moderationCase);

				// Re-notify moderators with higher priority
				const evidence = moderationCase.get('evidence') || [];
				const messageEvidence = evidence.find((e) => e.type === 'message_snapshot');

				if (messageEvidence) {
					const moderatorIds = getModerators();
					moderatorIds.forEach((modId) => {
						try {
							const notification = new Record($app.findCollectionByNameOrId('notifications'));
							notification.set('user', modId);
							notification.set('type', 'moderation_alert');
							notification.set('title', '⚠️ ESCALATED: Moderation Case Requires Attention');
							notification.set(
								'message',
								`Case ${moderationCase.id} has exceeded SLA and requires immediate review.`
							);
							notification.set('metadata', {
								caseId: moderationCase.id,
								sourceType: moderationCase.getString('sourceType'),
								sourceId: moderationCase.getString('sourceId'),
								severity: 'high',
								escalated: true
							});
							notification.set('read', false);

							$app.save(notification);
						} catch (e) {
							console.error('[messaging.js] Failed to send escalation notification:', e);
						}
					});
				}

				console.log(`[messaging.js] Escalated case ${moderationCase.id}`);
			} catch (error) {
				console.error('[messaging.js] Failed to escalate case:', moderationCase.id, error);
			}
		});
	} catch (error) {
		console.error('[messaging.js] Error in escalation cron job:', error);
	}
});

// Cron job: Send daily moderation summary
// Runs at 9:00 AM daily
cronAdd('moderation-daily-summary', '0 9 * * *', () => {
	console.log('[messaging.js] Running daily moderation summary job');

	try {
		// Count cases by state
		const openCount = $app.countRecords('moderation_cases', "state = 'open'");
		const inReviewCount = $app.countRecords('moderation_cases', "state = 'in_review'");
		const escalatedCount = $app.countRecords('moderation_cases', "state = 'escalated'");

		// Track SLA metrics in analytics
		try {
			const analyticsCollection = $app.findCollectionByNameOrId('analytics_events');
			if (analyticsCollection) {
				const event = new Record(analyticsCollection);
				event.set('event_type', 'moderation_daily_summary');
				event.set('user', null);
				event.set('metadata', {
					date: new Date().toISOString().split('T')[0],
					openCount,
					inReviewCount,
					escalatedCount,
					totalActive: openCount + inReviewCount + escalatedCount
				});
				$app.save(event);
			}
		} catch (slaError) {
			console.error('[messaging.js] Failed to track daily summary metrics:', slaError);
		}

		// Get moderators
		const moderatorIds = getModerators();

		// Send summary notification to all moderators
		moderatorIds.forEach((modId) => {
			try {
				const notification = new Record($app.findCollectionByNameOrId('notifications'));
				notification.set('user', modId);
				notification.set('type', 'moderation_summary');
				notification.set('title', '📊 Daily Moderation Summary');
				notification.set(
					'message',
					`Open: ${openCount} | In Review: ${inReviewCount} | Escalated: ${escalatedCount}`
				);
				notification.set('metadata', {
					openCount,
					inReviewCount,
					escalatedCount,
					date: new Date().toISOString()
				});
				notification.set('read', false);

				$app.save(notification);
			} catch (e) {
				console.error('[messaging.js] Failed to send daily summary:', e);
			}
		});

		console.log('[messaging.js] Daily summary sent to', moderatorIds.length, 'moderators');
	} catch (error) {
		console.error('[messaging.js] Error in daily summary job:', error);
	}
});

console.log('[messaging.js] Messaging hooks and cron jobs initialized');
