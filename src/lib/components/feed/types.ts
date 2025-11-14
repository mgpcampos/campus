import type { ListResult, RecordModel } from 'pocketbase'

export type FeedAuthor = RecordModel & {
	name?: string
	username?: string
	email?: string
	avatar?: string
}

export type FeedPost = RecordModel & {
	content: string
	created: string
	attachments?: string[] | string
	mediaAltText?: string
	mediaType?: 'text' | 'images' | 'video' | string
	videoPoster?: string
	likeCount?: number
	commentCount?: number
	scope?: string
	expand?: {
		author?: FeedAuthor
		space?: Record<string, unknown>
		group?: Record<string, unknown>
	} & Record<string, unknown>
}

export type FeedPostList = ListResult<FeedPost>

export type FeedScope = 'global' | 'space' | 'group'
