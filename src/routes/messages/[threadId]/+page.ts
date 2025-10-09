import type { PageLoad } from './$types';
import type { MessageWithDetails, ThreadWithMessages } from '$types/messaging';

export const load: PageLoad = async ({ fetch, params }) => {
	const { threadId } = params;

	try {
		// Fetch thread details
		const threadResponse = await fetch(`/api/threads?page=1&perPage=1`);
		if (!threadResponse.ok) {
			throw new Error('Failed to load thread');
		}

		const threadData = await threadResponse.json();
		const thread = threadData.items.find((t: ThreadWithMessages) => t.id === threadId);

		if (!thread) {
			throw new Error('Thread not found');
		}

		// Fetch messages
		const messagesResponse = await fetch(`/api/threads/${threadId}/messages?page=1&perPage=100`);
		if (!messagesResponse.ok) {
			throw new Error('Failed to load messages');
		}

		const messagesData = await messagesResponse.json();

		return {
			thread: threadData.thread,
			messages: threadData.messages,
			meta: {
				title: `${threadData.thread?.name ?? 'Conversation'} — Messages — Campus`,
				description:
					threadData.thread?.description ??
					'Continue the discussion with your classmates and teams in Campus messaging.',
				ogImage: '/og-default.png'
			}
		};
	} catch (error) {
		console.error('Error loading thread:', error);
		return {
			thread: null,
			messages: [],
			totalPages: 1,
			page: 1,
			error: error instanceof Error ? error.message : 'Failed to load conversation'
		};
	}
};
