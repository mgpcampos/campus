import { requireAuth } from '$lib/auth.js'
import { getSpaceMemberCount, getSpaces } from '$lib/services/spaces.js'

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, locals }) {
	requireAuth(locals, url.pathname)
	const pageParam = url.searchParams.get('page')
	const page = pageParam ? Number(pageParam) : 1
	const search = url.searchParams.get('q') || ''
	const spaces = await getSpaces({ page, search }, { pb: locals.pb })
	const augmentedItems = await Promise.all(
		spaces.items.map(async (s) => {
			const memberCount = await getSpaceMemberCount(s.id, { pb: locals.pb })
			return {
				...s,
				memberCount,
				memberCountHidden: memberCount === null
			}
		})
	)
	return { spaces: { ...spaces, items: augmentedItems }, search }
}
