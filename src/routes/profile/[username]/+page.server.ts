import { error } from '@sveltejs/kit'
import { getUserByUsername, listUserMemberships, listUserPosts } from '$lib/services/users'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const username = params.username
	const page = Number(url.searchParams.get('page') || '1')
	const perPage = 10

	const user = await getUserByUsername(locals.pb, username)
	if (!user) {
		throw error(404, 'User not found')
	}

	const posts = await listUserPosts(locals.pb, user.id, { page, perPage })
	const memberships = await listUserMemberships(locals.pb, user.id)

	return {
		profile: user,
		posts,
		memberships,
		meta: {
			title: `${user.name} (@${user.username}) - Campus`,
			description: user.bio || `${user.name}'s profile on Campus`,
			ogImage: user.avatar ? locals.pb.files.getURL(user, user.avatar) : '/og-default.png'
		}
	}
}
