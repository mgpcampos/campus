/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	AnalyticsEvents = "analytics_events",
	Comments = "comments",
	EventParticipants = "event_participants",
	Events = "events",
	GroupMembers = "group_members",
	Groups = "groups",
	Likes = "likes",
	MaterialAccessLogs = "material_access_logs",
	Materials = "materials",
	ModerationLogs = "moderation_logs",
	Notifications = "notifications",
	Posts = "posts",
	ProfilePublications = "profile_publications",
	Profiles = "profiles",
	PublicationRecords = "publication_records",
	Reports = "reports",
	SpaceMembers = "space_members",
	Spaces = "spaces",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type AnalyticsEventsRecord<Tmetadata = unknown> = {
	created?: IsoDateString
	id: string
	ip?: string
	locale?: string
	metadata?: null | Tmetadata
	name: string
	page?: string
	referrer?: string
	sessionId: string
	type: string
	updated?: IsoDateString
	user?: RecordIdString
	userAgent?: string
	value?: number
}

export type CommentsRecord = {
	author: RecordIdString[]
	content: string
	created?: IsoDateString
	id: string
	parent?: RecordIdString[]
	post: RecordIdString[]
	updated?: IsoDateString
}

export enum EventParticipantsStatusOptions {
	"going" = "going",
	"maybe" = "maybe",
	"declined" = "declined",
}
export type EventParticipantsRecord = {
	created?: IsoDateString
	event: RecordIdString
	id: string
	status: EventParticipantsStatusOptions
	updated?: IsoDateString
	user: RecordIdString
}

export enum EventsScopeTypeOptions {
	"global" = "global",
	"space" = "space",
	"group" = "group",
	"course" = "course",
}
export type EventsRecord<Tlocation = unknown> = {
	created?: IsoDateString
	createdBy: RecordIdString
	description?: string
	end: IsoDateString
	icsUid?: string
	id: string
	location?: null | Tlocation
	reminderLeadMinutes?: number
	scopeId?: string
	scopeType: EventsScopeTypeOptions
	start: IsoDateString
	title: string
	updated?: IsoDateString
}

export enum GroupMembersRoleOptions {
	"member" = "member",
	"moderator" = "moderator",
}
export type GroupMembersRecord = {
	created?: IsoDateString
	group: RecordIdString
	id: string
	role: GroupMembersRoleOptions
	updated?: IsoDateString
	user: RecordIdString
}

export type GroupsRecord = {
	created?: IsoDateString
	description?: string
	id: string
	isPublic: boolean
	moderators?: RecordIdString[]
	name: string
	space: RecordIdString[]
	updated?: IsoDateString
}

export type LikesRecord = {
	created?: IsoDateString
	id: string
	post: RecordIdString[]
	updated?: IsoDateString
	user: RecordIdString[]
}

export enum MaterialAccessLogsActionOptions {
	"view" = "view",
	"download" = "download",
}
export type MaterialAccessLogsRecord = {
	action: MaterialAccessLogsActionOptions
	created?: IsoDateString
	id: string
	material: RecordIdString[]
	updated?: IsoDateString
	user: RecordIdString[]
}

export enum MaterialsFormatOptions {
	"document" = "document",
	"slide" = "slide",
	"dataset" = "dataset",
	"video" = "video",
	"link" = "link",
}

export enum MaterialsVisibilityOptions {
	"institution" = "institution",
	"course" = "course",
	"group" = "group",
	"public" = "public",
}
export type MaterialsRecord<Ttags = unknown> = {
	courseCode?: string
	created?: IsoDateString
	description?: string
	file?: string
	format: MaterialsFormatOptions
	id: string
	keywords?: string
	linkUrl?: string
	searchTerms?: string
	tags?: null | Ttags
	title: string
	updated?: IsoDateString
	uploader: RecordIdString[]
	visibility: MaterialsVisibilityOptions
}

export enum ModerationLogsActionOptions {
	"delete_post" = "delete_post",
	"delete_comment" = "delete_comment",
	"resolve_report" = "resolve_report",
	"dismiss_report" = "dismiss_report",
}
export type ModerationLogsRecord<Tmeta = unknown> = {
	action: ModerationLogsActionOptions
	actor: RecordIdString
	created?: IsoDateString
	id: string
	meta?: null | Tmeta
}

export enum NotificationsTypeOptions {
	"like" = "like",
	"comment" = "comment",
	"mention" = "mention",
}
export type NotificationsRecord = {
	actor: RecordIdString
	comment?: RecordIdString
	created?: IsoDateString
	id: string
	post?: RecordIdString
	read: boolean
	type: NotificationsTypeOptions
	updated?: IsoDateString
	user: RecordIdString
}

export enum PostsScopeOptions {
	"global" = "global",
	"space" = "space",
	"group" = "group",
}

export enum PostsMediaTypeOptions {
	"text" = "text",
	"images" = "images",
	"video" = "video",
}
export type PostsRecord = {
	attachments?: string[]
	author: RecordIdString[]
	commentCount?: number
	content: string
	created?: IsoDateString
	group?: RecordIdString[]
	id: string
	likeCount?: number
	mediaAltText?: string
	mediaType: PostsMediaTypeOptions
	publishedAt?: IsoDateString
	scope: PostsScopeOptions
	space?: RecordIdString[]
	updated?: IsoDateString
	videoDuration?: number
	videoPoster?: string
}

export enum ProfilePublicationsContributionRoleOptions {
	"author" = "author",
	"editor" = "editor",
	"advisor" = "advisor",
}
export type ProfilePublicationsRecord = {
	contributionRole: ProfilePublicationsContributionRoleOptions
	created?: IsoDateString
	id: string
	profile: RecordIdString
	publication: RecordIdString
	updated?: IsoDateString
}

export enum ProfilesRoleOptions {
	"student" = "student",
	"professor" = "professor",
	"researcher" = "researcher",
	"staff" = "staff",
}
export type ProfilesRecord<Tlinks = unknown> = {
	biography?: string
	created?: IsoDateString
	department: string
	displayName: string
	id: string
	links?: null | Tlinks
	pronouns?: string
	role: ProfilesRoleOptions
	updated?: IsoDateString
	user: RecordIdString
}

export type PublicationRecordsRecord<Tauthors = unknown> = {
	abstract?: string
	authors?: null | Tauthors
	created?: IsoDateString
	doi?: string
	id: string
	slugHash: string
	title: string
	updated?: IsoDateString
	venue?: string
	year?: number
}

export enum ReportsTargetTypeOptions {
	"post" = "post",
	"comment" = "comment",
}

export enum ReportsStatusOptions {
	"open" = "open",
	"reviewing" = "reviewing",
	"resolved" = "resolved",
	"dismissed" = "dismissed",
}
export type ReportsRecord = {
	comment?: RecordIdString
	created?: IsoDateString
	id: string
	post?: RecordIdString
	reason: string
	reporter: RecordIdString
	status: ReportsStatusOptions
	targetId: string
	targetType: ReportsTargetTypeOptions
	updated?: IsoDateString
}

export enum SpaceMembersRoleOptions {
	"member" = "member",
	"moderator" = "moderator",
	"owner" = "owner",
}
export type SpaceMembersRecord = {
	created?: IsoDateString
	id: string
	role: SpaceMembersRoleOptions
	space: RecordIdString
	updated?: IsoDateString
	user: RecordIdString
}

export type SpacesRecord = {
	avatar?: string
	created?: IsoDateString
	description?: string
	id: string
	isPublic: boolean
	moderators?: RecordIdString[]
	name: string
	owners: RecordIdString[]
	slug: string
	updated?: IsoDateString
}

export type UsersRecord = {
	avatar?: string
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	isAdmin?: boolean
	locale?: string
	name?: string
	password: string
	prefersDarkMode?: boolean
	tokenKey: string
	updated?: IsoDateString
	username?: string
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AnalyticsEventsResponse<Tmetadata = unknown, Texpand = unknown> = Required<AnalyticsEventsRecord<Tmetadata>> & BaseSystemFields<Texpand>
export type CommentsResponse<Texpand = unknown> = Required<CommentsRecord> & BaseSystemFields<Texpand>
export type EventParticipantsResponse<Texpand = unknown> = Required<EventParticipantsRecord> & BaseSystemFields<Texpand>
export type EventsResponse<Tlocation = unknown, Texpand = unknown> = Required<EventsRecord<Tlocation>> & BaseSystemFields<Texpand>
export type GroupMembersResponse<Texpand = unknown> = Required<GroupMembersRecord> & BaseSystemFields<Texpand>
export type GroupsResponse<Texpand = unknown> = Required<GroupsRecord> & BaseSystemFields<Texpand>
export type LikesResponse<Texpand = unknown> = Required<LikesRecord> & BaseSystemFields<Texpand>
export type MaterialAccessLogsResponse<Texpand = unknown> = Required<MaterialAccessLogsRecord> & BaseSystemFields<Texpand>
export type MaterialsResponse<Ttags = unknown, Texpand = unknown> = Required<MaterialsRecord<Ttags>> & BaseSystemFields<Texpand>
export type ModerationLogsResponse<Tmeta = unknown, Texpand = unknown> = Required<ModerationLogsRecord<Tmeta>> & BaseSystemFields<Texpand>
export type NotificationsResponse<Texpand = unknown> = Required<NotificationsRecord> & BaseSystemFields<Texpand>
export type PostsResponse<Texpand = unknown> = Required<PostsRecord> & BaseSystemFields<Texpand>
export type ProfilePublicationsResponse<Texpand = unknown> = Required<ProfilePublicationsRecord> & BaseSystemFields<Texpand>
export type ProfilesResponse<Tlinks = unknown, Texpand = unknown> = Required<ProfilesRecord<Tlinks>> & BaseSystemFields<Texpand>
export type PublicationRecordsResponse<Tauthors = unknown, Texpand = unknown> = Required<PublicationRecordsRecord<Tauthors>> & BaseSystemFields<Texpand>
export type ReportsResponse<Texpand = unknown> = Required<ReportsRecord> & BaseSystemFields<Texpand>
export type SpaceMembersResponse<Texpand = unknown> = Required<SpaceMembersRecord> & BaseSystemFields<Texpand>
export type SpacesResponse<Texpand = unknown> = Required<SpacesRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	analytics_events: AnalyticsEventsRecord
	comments: CommentsRecord
	event_participants: EventParticipantsRecord
	events: EventsRecord
	group_members: GroupMembersRecord
	groups: GroupsRecord
	likes: LikesRecord
	material_access_logs: MaterialAccessLogsRecord
	materials: MaterialsRecord
	moderation_logs: ModerationLogsRecord
	notifications: NotificationsRecord
	posts: PostsRecord
	profile_publications: ProfilePublicationsRecord
	profiles: ProfilesRecord
	publication_records: PublicationRecordsRecord
	reports: ReportsRecord
	space_members: SpaceMembersRecord
	spaces: SpacesRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	analytics_events: AnalyticsEventsResponse
	comments: CommentsResponse
	event_participants: EventParticipantsResponse
	events: EventsResponse
	group_members: GroupMembersResponse
	groups: GroupsResponse
	likes: LikesResponse
	material_access_logs: MaterialAccessLogsResponse
	materials: MaterialsResponse
	moderation_logs: ModerationLogsResponse
	notifications: NotificationsResponse
	posts: PostsResponse
	profile_publications: ProfilePublicationsResponse
	profiles: ProfilesResponse
	publication_records: PublicationRecordsResponse
	reports: ReportsResponse
	space_members: SpaceMembersResponse
	spaces: SpacesResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'analytics_events'): RecordService<AnalyticsEventsResponse>
	collection(idOrName: 'comments'): RecordService<CommentsResponse>
	collection(idOrName: 'event_participants'): RecordService<EventParticipantsResponse>
	collection(idOrName: 'events'): RecordService<EventsResponse>
	collection(idOrName: 'group_members'): RecordService<GroupMembersResponse>
	collection(idOrName: 'groups'): RecordService<GroupsResponse>
	collection(idOrName: 'likes'): RecordService<LikesResponse>
	collection(idOrName: 'material_access_logs'): RecordService<MaterialAccessLogsResponse>
	collection(idOrName: 'materials'): RecordService<MaterialsResponse>
	collection(idOrName: 'moderation_logs'): RecordService<ModerationLogsResponse>
	collection(idOrName: 'notifications'): RecordService<NotificationsResponse>
	collection(idOrName: 'posts'): RecordService<PostsResponse>
	collection(idOrName: 'profile_publications'): RecordService<ProfilePublicationsResponse>
	collection(idOrName: 'profiles'): RecordService<ProfilesResponse>
	collection(idOrName: 'publication_records'): RecordService<PublicationRecordsResponse>
	collection(idOrName: 'reports'): RecordService<ReportsResponse>
	collection(idOrName: 'space_members'): RecordService<SpaceMembersResponse>
	collection(idOrName: 'spaces'): RecordService<SpacesResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
