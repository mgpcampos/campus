import { json, error } from '@sveltejs/kit';
import { messageFlagSchema } from '$lib/schemas/messaging.js';
import { normalizeError, toErrorPayload } from '$lib/utils/errors.js';

/**
 * POST /api/messages/[messageId]/flag
 * Flag a message for moderation
 */
/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, locals }) {
	if (!locals.pb.authStore.isValid || !locals.user) {
		return error(401, 'Authentication required');
	}

	try {
		const { messageId } = params;
		const body = await request.json();
		const validatedData = messageFlagSchema.parse(body);

		// Verify message exists and user has access
		const message = await locals.pb.collection('messages').getOne(messageId, {
			expand: 'thread'
		});

		// @ts-ignore - expanded relation
		const thread = message.expand?.thread;

		if (!thread || !thread.members.includes(locals.user.id)) {
			return error(403, 'You do not have access to this message');
		}

		// Check if user already flagged this message
		const existingFlags = await locals.pb.collection('message_flags').getFullList({
			filter: `message = "${messageId}" && reporter = "${locals.user.id}"`
		});

		if (existingFlags.length > 0) {
			return error(409, 'You have already flagged this message');
		}

		// Create flag
		const flag = await locals.pb.collection('message_flags').create({
			message: messageId,
			reporter: locals.user.id,
			reason: validatedData.reason
		});

		// The hook will handle incrementing flagCount, checking threshold,
		// and creating moderation case if needed

		return json(
			{
				success: true,
				flagId: flag.id,
				message: 'Message has been flagged for review'
			},
			{ status: 201 }
		);
	} catch (err) {
		const n = normalizeError(err, { context: 'api:flagMessage' });
		console.error('Error flagging message:', n.toString());
		return json({ error: toErrorPayload(n) }, { status: n.status || 500 });
	}
}
