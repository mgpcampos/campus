<script lang="ts">
import { MessageCircle, Send, Trash2 } from '@lucide/svelte'
import { formatDistanceToNow } from 'date-fns'
import type { ListResult, RecordModel, RecordSubscription } from 'pocketbase'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { toast } from 'svelte-sonner'
import { Button } from '$lib/components/ui/button/index.js'
import * as Card from '$lib/components/ui/card/index.js'
import { Textarea } from '$lib/components/ui/textarea/index.js'
import { t } from '$lib/i18n'
import { currentUser, pb } from '$lib/pocketbase.js'
import { createComment, deleteComment, getComments } from '$lib/services/comments.js'
import { canModerateComment } from '$lib/services/permissions.js'
import { reportContent } from '$lib/services/reports.js'
import { withErrorToast } from '$lib/utils/errors.ts'
import type { CommentsResponse } from '$types/pocketbase'

type CommentAuthor = RecordModel & {
	name?: string
	username?: string
	email?: string
	avatar?: string
}

type CommentRecord = CommentsResponse<{ author?: CommentAuthor }>

export let postId: string
export let initialCommentCount = 0

const dispatch = createEventDispatcher<{
	commentCountChanged: { count: number }
}>()

let comments: CommentRecord[] = []
let commentCount = initialCommentCount ?? 0
let showComments = false
let loading = false
let submitting = false
let newCommentContent = ''
let hasMore = false
let page = 1
let hasLoaded = false
let canComment = false

let realtimeUnsub: (() => void) | null = null
let currentUserUnsub: (() => void) | null = null
let destroyed = false

const perPage = 20
const pendingDeletionIds: Record<string, boolean> = {}

function toCommentRecord(record: RecordModel | CommentRecord): CommentRecord {
	return record as CommentRecord
}

onMount(() => {
	currentUserUnsub = currentUser.subscribe((user) => {
		canComment = Boolean(user)
	})
	setupRealtime()
})

onDestroy(() => {
	destroyed = true
	cleanup()
})

$: if (!hasLoaded) {
	commentCount = initialCommentCount ?? 0
}

function cleanup() {
	currentUserUnsub?.()
	currentUserUnsub = null

	if (realtimeUnsub) {
		try {
			realtimeUnsub()
		} catch {
			// ignore unsubscribe errors
		}
		try {
			pb.collection('comments').unsubscribe('*')
		} catch {
			// ignore unsubscribe errors
		}
		realtimeUnsub = null
	}
}

async function setupRealtime() {
	try {
		const unsub = await pb.collection('comments').subscribe<CommentRecord>('*', async (event) => {
			if (event?.record?.post !== postId) return
			await handleRealtimeUpdate(event)
		})

		if (destroyed) {
			try {
				unsub()
			} catch {
				// ignore unsubscribe errors
			}
			return
		}

		realtimeUnsub = unsub
	} catch (error) {
		console.warn('comments realtime subscription failed', error)
	}
}

function setCommentCount(count: number) {
	commentCount = count
	dispatch('commentCountChanged', { count })
}

async function ensureExpandedComment(record: CommentRecord | RecordModel): Promise<CommentRecord> {
	if (record?.expand?.author) {
		return toCommentRecord(record)
	}
	try {
		const expanded = await pb.collection('comments').getOne(record.id, { expand: 'author' })
		return toCommentRecord(expanded)
	} catch {
		return toCommentRecord(record)
	}
}

async function loadComments(options: { reset?: boolean } = {}) {
	if (loading) return

	const targetPage = options.reset ? 1 : page
	loading = true

	try {
		const result = (await withErrorToast(
			async () => await getComments(postId, { page: targetPage, perPage }),
			{ context: 'getComments' }
		)) as ListResult<CommentRecord> | undefined

		if (!result) {
			return
		}

		const items = Array.isArray(result.items) ? result.items.map(toCommentRecord) : []
		const merged = options.reset
			? items
			: [
					...comments,
					...items.filter((item) => !comments.some((existing) => existing.id === item.id))
				]

		comments = merged
		hasMore = result.page < result.totalPages
		const totalItems = typeof result.totalItems === 'number' ? result.totalItems : merged.length
		setCommentCount(totalItems)
		page = result.page + 1
		hasLoaded = true
	} finally {
		loading = false
	}
}

async function ensureCommentsLoaded() {
	if (hasLoaded) return
	await loadComments({ reset: true })
}

async function toggleComments() {
	showComments = !showComments
	if (showComments) {
		await ensureCommentsLoaded()
	}
}

async function loadMoreComments() {
	if (!hasMore || loading) return
	await loadComments()
}

async function submitComment() {
	if (!canComment || !newCommentContent.trim() || submitting) return

	submitting = true
	try {
		const trimmed = newCommentContent.trim()
		const created = await withErrorToast(
			async () => await createComment(postId, trimmed, undefined),
			{ context: 'createComment' }
		)

		if (!created) {
			return
		}

		if (hasLoaded) {
			comments = [...comments, toCommentRecord(created)]
		}

		newCommentContent = ''
		setCommentCount(commentCount + 1)
		toast.success(t('feed.commentAdded'))
	} finally {
		submitting = false
	}
}

async function handleDeleteComment(commentId: string) {
	const confirmMessage = t('feed.deleteCommentConfirm')
	if (!confirm(confirmMessage)) return

	const previousComments = [...comments]
	const previousCount = commentCount

	if (hasLoaded) {
		comments = comments.filter((comment) => comment.id !== commentId)
	}

	const nextCount = Math.max(0, previousCount - 1)
	setCommentCount(nextCount)

	pendingDeletionIds[commentId] = true

	const success = await withErrorToast(
		async () => {
			await deleteComment(commentId, postId)
			return true
		},
		{ context: 'deleteComment' }
	)

	if (!success) {
		delete pendingDeletionIds[commentId]
		if (hasLoaded) {
			comments = previousComments
		}
		setCommentCount(previousCount)
		return
	}

	toast.success(t('feed.commentDeleted'))
}

async function reportComment(commentId: string) {
	await withErrorToast(
		async () => {
			await reportContent({
				targetType: 'comment',
				targetId: commentId,
				reason: 'inappropriate'
			})
			toast.success(t('postCard.reported'))
		},
		{ context: 'reportComment' }
	)
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
		event.preventDefault()
		submitComment()
	}
}

function getAuthorAvatar(author: CommentAuthor | undefined) {
	if (author?.avatar) {
		return pb.files.getURL(author, author.avatar, { thumb: '32x32' })
	}
	return null
}

function formatCommentDate(value: string) {
	return formatDistanceToNow(new Date(value), { addSuffix: true })
}

function getCommentLabel(count: number) {
	if (count === 0) return t('feed.commentToggleZero')
	if (count === 1) return t('feed.commentToggleOne')
	return t('feed.commentToggleMany', { count })
}

async function handleRealtimeUpdate(event: RecordSubscription<CommentRecord>) {
	if (!event?.record) return

	if (event.action === 'create') {
		const exists = comments.some((comment) => comment.id === event.record.id)
		if (!exists) {
			setCommentCount(commentCount + 1)
			if (hasLoaded) {
				const full = await ensureExpandedComment(event.record)
				comments = [...comments, full]
			}
		}
		return
	}

	if (event.action === 'update') {
		if (!hasLoaded) return
		const index = comments.findIndex((comment) => comment.id === event.record.id)
		if (index === -1) return
		const full = await ensureExpandedComment(event.record)
		const next = [...comments]
		next[index] = { ...next[index], ...full }
		comments = next
		return
	}

	if (event.action === 'delete') {
		if (pendingDeletionIds[event.record.id]) {
			delete pendingDeletionIds[event.record.id]
			return
		}

		if (hasLoaded) {
			comments = comments.filter((comment) => comment.id !== event.record.id)
		}
		setCommentCount(Math.max(0, commentCount - 1))
	}
}
</script>

<div class="border-t pt-3">
	<Button
		variant="secondary"
		size="sm"
		onclick={toggleComments}
		disabled={loading && !showComments}
		class="mb-3 inline-flex items-center gap-2 bg-muted text-muted-foreground hover:bg-muted/80"
		aria-expanded={showComments}
	>
		<MessageCircle size={16} aria-hidden="true" />
		<span>{getCommentLabel(commentCount)}</span>
	</Button>

	{#if showComments}
		{#if canComment}
			<div class="mb-4">
				<div class="flex gap-3">
					{#if $currentUser?.avatar}
						<img
							src={pb.files.getURL($currentUser, $currentUser.avatar, { thumb: '32x32' })}
							alt={t('feed.yourAvatarAlt')}
							class="h-8 w-8 flex-shrink-0 rounded-full object-cover"
						/>
					{:else}
						<div
							class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300"
						>
							<span class="text-sm font-medium text-gray-600">
								{$currentUser?.name?.charAt(0)?.toUpperCase() || '?'}
							</span>
						</div>
					{/if}

					<div class="flex-1">
						<Textarea
							bind:value={newCommentContent}
							placeholder={t('feed.writeCommentPlaceholder')}
							class="min-h-[80px] resize-none"
							onkeydown={handleKeydown}
							disabled={submitting}
						/>
						<div class="mt-2 flex items-center justify-between">
							<span class="text-xs text-gray-500">{t('feed.pressCtrlEnter')}</span>
							<Button
								onclick={submitComment}
								disabled={!newCommentContent.trim() || submitting}
								size="sm"
							>
								{#if submitting}
									{t('feed.posting')}
								{:else}
									<Send size={14} class="mr-1" />
									{t('feed.comment')}
								{/if}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<p class="mb-4 text-sm text-gray-500">
				<a href="/auth/login" class="text-blue-600 hover:underline">{t('common.signIn')}</a>
				{t('feed.signInToComment')}
			</p>
		{/if}

		{#if loading && comments.length === 0}
			<div class="py-4 text-center">
				<p class="text-gray-500">{t('feed.loadingComments')}</p>
			</div>
		{:else if comments.length === 0}
			<div class="py-4 text-center">
				<p class="text-gray-500">{t('feed.noCommentsYet')}</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each comments as comment (comment.id)}
					<div class="flex gap-3">
						{#if getAuthorAvatar(comment.expand?.author)}
							<img
								src={getAuthorAvatar(comment.expand?.author)}
								alt={`${comment.expand?.author?.name || 'Unknown user'}'s avatar`}
								class="h-8 w-8 flex-shrink-0 rounded-full object-cover"
							/>
						{:else}
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300"
							>
								<span class="text-sm font-medium text-gray-600">
									{comment.expand?.author?.name?.charAt(0)?.toUpperCase() || '?'}
								</span>
							</div>
						{/if}

						<div class="flex-1">
							<Card.Root class="p-3">
								<div class="mb-2 flex items-start justify-between">
									<div>
										<h4 class="text-sm font-medium">
											{comment.expand?.author?.name || 'Unknown user'}
										</h4>
										<p class="text-xs text-gray-500">
											@{comment.expand?.author?.username ||
												comment.expand?.author?.email?.split('@')[0] ||
												'unknown'} · {formatCommentDate(comment.created)}
										</p>
									</div>

									{#if $currentUser}
										<div class="flex items-center gap-1">
											{#if comment.expand?.author?.id === $currentUser.id}
												<Button
													variant="ghost"
													size="sm"
													onclick={() => handleDeleteComment(comment.id)}
													class="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
												>
													<Trash2 size={12} />
												</Button>
											{:else}
												{#await canModerateComment(comment) then allowed}
													{#if allowed}
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handleDeleteComment(comment.id)}
															class="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
														>
															<Trash2 size={12} />
														</Button>
													{/if}
												{/await}
												<Button
													variant="ghost"
													size="sm"
													onclick={() => reportComment(comment.id)}
													class="h-6 px-2 text-xs text-gray-400 hover:text-yellow-500"
												>
													{t('postCard.report')}
												</Button>
											{/if}
										</div>
									{/if}
								</div>

								<p class="text-sm whitespace-pre-wrap text-gray-800">
									{comment.content}
								</p>
							</Card.Root>
						</div>
					</div>
				{/each}
			</div>

			{#if hasMore}
				<div class="mt-4 text-center">
					<Button variant="outline" size="sm" onclick={loadMoreComments} disabled={loading}>
						{#if loading}
							{t('feed.loadingComments')}
						{:else}
							{t('feed.loadMoreComments')}
						{/if}
					</Button>
				</div>
			{/if}
		{/if}
	{/if}
</div>
