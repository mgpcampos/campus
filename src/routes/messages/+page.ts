import type { ThreadWithMessages } from '$types/messaging'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/threads?page=1&perPage=50')

		if (!response.ok) {
			throw new Error('Failed to load threads')
		}

		const data = await response.json()

		return {
			threads: data.items as ThreadWithMessages[],
			totalPages: data.totalPages,
			page: data.page,
			meta: {
				title: 'Messages | Campus',
				description:
					data.summary ??
					'Catch up on direct and group conversations with your campus communities in the Messages hub.',
				ogImage: '/og-default.png'
			}
		}
	} catch (error) {
		console.error('Error loading threads:', error)
		return {
			threads: [],
			totalPages: 1,
			page: 1,
			error: error instanceof Error ? error.message : 'Failed to load conversations'
		}
	}
}
