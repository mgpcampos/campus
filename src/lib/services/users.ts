// User services for fetching and shaping user related data from PocketBase
// Assumes server-side usage unless explicitly passed a PocketBase client.
import type PocketBase from 'pocketbase'

export interface UserSummary {
	id: string
	username: string
	name: string
	avatar?: string
	bio?: string
	created: string
}

export interface UserPostSummary {
	id: string
	content: string
	created: string
	likeCount?: number
	commentCount?: number
	scope: 'global' | 'space' | 'group'
	space?: string
	group?: string
}

export interface MembershipSummary {
	spaces: Array<{ id: string; name: string; slug: string }>
	groups: Array<{ id: string; name: string; space: string }>
}

// Fetch a user by username (case-insensitive) with minimal fields
export async function getUserByUsername(
	pb: PocketBase,
	username: string
): Promise<UserSummary | null> {
	if (!username) return null
	try {
		const record = await pb.collection('users').getFirstListItem(`username = "${username}"`)
		return {
			id: record.id,
			username: record.username,
			name: record.name,
			avatar: record.avatar,
			bio: record.bio,
			created: record.created
		}
	} catch {
		return null
	}
}

export interface ListUserPostsOptions {
	page?: number
	perPage?: number
}

export async function listUserPosts(
	pb: PocketBase,
	userId: string,
	opts: ListUserPostsOptions = {}
): Promise<{
	items: UserPostSummary[]
	page: number
	perPage: number
	totalPages: number
	totalItems: number
}> {
	const page = opts.page ?? 1
	const perPage = opts.perPage ?? 10
	const result = await pb.collection('posts').getList(page, perPage, {
		filter: `author = "${userId}"`,
		sort: '-created'
	})
	interface PBPostRecord {
		id: string
		content: string
		created: string
		likeCount?: number
		like_count?: number
		commentCount?: number
		comment_count?: number
		scope: 'global' | 'space' | 'group'
		space?: string
		group?: string
	}
	const items: UserPostSummary[] = (result.items as unknown as PBPostRecord[])
		.filter((r) => typeof r.id === 'string' && typeof r.content === 'string')
		.map((rec) => ({
			id: rec.id,
			content: rec.content,
			created: rec.created,
			likeCount: rec.likeCount ?? rec.like_count ?? 0,
			commentCount: rec.commentCount ?? rec.comment_count ?? 0,
			scope: rec.scope,
			space: rec.space,
			group: rec.group
		}))
	return {
		items,
		page: result.page,
		perPage: result.perPage,
		totalPages: result.totalPages,
		totalItems: result.totalItems
	}
}

export async function listUserMemberships(
	pb: PocketBase,
	userId: string
): Promise<MembershipSummary> {
	// Spaces
	const spaceMemberships = await pb.collection('space_members').getFullList({
		filter: `user = "${userId}"`,
		expand: 'space'
	})
	interface MembershipRecord<T> {
		expand?: { [k: string]: T }
	}
	interface SpaceRecord {
		id: string
		name: string
		slug: string
	}
	const spaces = (spaceMemberships as MembershipRecord<SpaceRecord>[])
		.map((m) => m.expand?.space)
		.filter((s): s is SpaceRecord => s !== undefined)
		.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))

	// Groups
	const groupMemberships = await pb.collection('group_members').getFullList({
		filter: `user = "${userId}"`,
		expand: 'group'
	})
	interface GroupRecord {
		id: string
		name: string
		space: string
	}
	const groups = (groupMemberships as MembershipRecord<GroupRecord>[])
		.map((m) => m.expand?.group)
		.filter((g): g is GroupRecord => g !== undefined)
		.map((g) => ({ id: g.id, name: g.name, space: g.space }))

	return { spaces, groups }
}

export interface UpdateUserProfileInput {
	name: string
	username: string
	bio?: string
	avatarFile?: File | Blob
}

export async function updateUserProfile(
	pb: PocketBase,
	userId: string,
	data: UpdateUserProfileInput
) {
	const formData: FormData = new FormData()
	formData.append('name', data.name)
	formData.append('username', data.username)
	formData.append('bio', data.bio || '')
	if (data.avatarFile) {
		formData.append('avatar', data.avatarFile)
	}
	return pb.collection('users').update(userId, formData)
}
