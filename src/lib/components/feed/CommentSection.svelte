<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { getComments, createComment, deleteComment } from '$lib/services/comments.js';
	import { canModerateComment } from '$lib/services/permissions.js';
	import { reportContent } from '$lib/services/reports.js';
	import { formatDistanceToNow } from 'date-fns';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { MessageCircle, Send, Trash2, Edit } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { withErrorToast } from '$lib/utils/errors.js';

	export let postId: string;
	export let initialCommentCount = 0;

	const dispatch = createEventDispatcher();

	let comments: any[] = [];
	let loading = false;
	let submitting = false;
	let newCommentContent = '';
	let showComments = false;
	let commentCount = initialCommentCount;
	let page = 1;
	let hasMore = true;

	$: canComment = $currentUser !== null;

	onMount(() => {
		// Subscribe to real-time comment updates
		pb.collection('comments').subscribe('*', (e) => {
			if (e.record.post === postId) {
				handleRealtimeUpdate(e);
			}
		});

		return () => {
			pb.collection('comments').unsubscribe();
		};
	});

	function handleRealtimeUpdate(e: any) {
		if (e.action === 'create') {
			// Add new comment to the list
			comments = [...comments, e.record];
			commentCount++;
			dispatch('commentCountChanged', { postId, count: commentCount });
		} else if (e.action === 'delete') {
			// Remove deleted comment
			comments = comments.filter((c) => c.id !== e.record.id);
			commentCount = Math.max(0, commentCount - 1);
			dispatch('commentCountChanged', { postId, count: commentCount });
		} else if (e.action === 'update') {
			// Update existing comment
			const index = comments.findIndex((c) => c.id === e.record.id);
			if (index !== -1) {
				comments[index] = e.record;
				comments = [...comments];
			}
		}
	}

	async function toggleComments() {
		showComments = !showComments;

		if (showComments && comments.length === 0) {
			await loadComments();
		}
	}

	async function loadComments() {
		if (loading) return;
		loading = true;
		await withErrorToast(
			async () => {
				// The PocketBase SDK returns a ListResult; cast for TS clarity
				const result = /** @type {{items:any[],page:number,totalPages:number}} */ (
					await getComments(postId, { page, perPage: 20 })
				);
				if (page === 1) {
					comments = result.items;
				} else {
					comments = [...comments, ...result.items];
				}
				hasMore = result.page < result.totalPages;
			},
			{ context: 'getComments' }
		);
		loading = false;
	}

	async function loadMoreComments() {
		if (!hasMore || loading) return;

		page++;
		await loadComments();
	}

	async function submitComment() {
		if (!canComment || !newCommentContent.trim() || submitting) return;
		submitting = true;
		await withErrorToast(
			async () => {
				const comment = await createComment(postId, newCommentContent, undefined);
				// Add to local state (will also be handled by real-time update)
				comments = [...comments, comment];
				commentCount++;
				newCommentContent = '';
				dispatch('commentCountChanged', { postId, count: commentCount });
				toast.success('Comment added');
			},
			{ context: 'createComment' }
		);
		submitting = false;
	}

	async function handleDeleteComment(commentId: string) {
		if (!confirm('Are you sure you want to delete this comment?')) return;
		await withErrorToast(
			async () => {
				await deleteComment(commentId, postId);
				// Remove from local state (will also be handled by real-time update)
				comments = comments.filter((c) => c.id !== commentId);
				commentCount = Math.max(0, commentCount - 1);
				dispatch('commentCountChanged', { postId, count: commentCount });
				toast.success('Comment deleted');
			},
			{ context: 'deleteComment' }
		);
	}

	async function reportComment(commentId: string) {
		await withErrorToast(
			async () => {
				await reportContent({
					targetType: 'comment',
					targetId: commentId,
					reason: 'inappropriate'
				});
				toast.success('Reported');
			},
			{ context: 'reportContent' }
		);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			submitComment();
		}
	}

	function getAuthorAvatar(author: any) {
		if (author?.avatar) {
			return pb.files.getURL(author, author.avatar, { thumb: '32x32' });
		}
		return null;
	}

	function formatCommentDate(dateString: string) {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true });
	}
</script>

<div class="border-t pt-3">
	<!-- Comment toggle button -->
	<Button
		variant="ghost"
		size="sm"
		onclick={toggleComments}
		class="mb-3 text-gray-600 transition-colors hover:text-blue-500"
	>
		<MessageCircle size={16} class="mr-1" />
		{commentCount}
		{commentCount === 1 ? 'comment' : 'comments'}
	</Button>

	{#if showComments}
		<!-- Comment form -->
		{#if canComment}
			<div class="mb-4">
				<div class="flex space-x-3">
					{#if $currentUser?.avatar}
						<img
							src={pb.files.getURL($currentUser, $currentUser.avatar, { thumb: '32x32' })}
							alt="Your avatar"
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
							placeholder="Write a comment..."
							class="min-h-[80px] resize-none"
							onkeydown={handleKeydown}
							disabled={submitting}
						/>
						<div class="mt-2 flex items-center justify-between">
							<span class="text-xs text-gray-500"> Press Ctrl+Enter to submit </span>
							<Button
								onclick={submitComment}
								disabled={!newCommentContent.trim() || submitting}
								size="sm"
							>
								{#if submitting}
									Posting...
								{:else}
									<Send size={14} class="mr-1" />
									Comment
								{/if}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<p class="mb-4 text-sm text-gray-500">
				<a href="/auth/login" class="text-blue-600 hover:underline">Sign in</a> to comment
			</p>
		{/if}

		<!-- Comments list -->
		{#if loading && comments.length === 0}
			<div class="py-4 text-center">
				<p class="text-gray-500">Loading comments...</p>
			</div>
		{:else if comments.length === 0}
			<div class="py-4 text-center">
				<p class="text-gray-500">No comments yet. Be the first to comment!</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each comments as comment (comment.id)}
					<div class="flex space-x-3">
						{#if getAuthorAvatar(comment.expand?.author)}
							<img
								src={getAuthorAvatar(comment.expand?.author)}
								alt="{comment.expand?.author?.name}'s avatar"
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
											{comment.expand?.author?.name || 'Unknown User'}
										</h4>
										<p class="text-xs text-gray-500">
											@{comment.expand?.author?.username ||
												comment.expand?.author?.email?.split('@')[0] ||
												'unknown'} ·
											{formatCommentDate(comment.created)}
										</p>
									</div>

									{#if $currentUser}
										<!-- Determine ownership and moderation -->
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
											<!-- Show delete if moderator -->
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
												class="h-6 w-6 p-0 text-gray-400 hover:text-yellow-500"
											>
												<Trash2 size={12} />
											</Button>
										{/if}
									{/if}
								</div>

								<p class="text-sm whitespace-pre-wrap text-gray-800">
									{comment.content}
								</p>
							</Card.Root>
						</div>
					</div>
				{/each}

				<!-- Load more button -->
				{#if hasMore}
					<div class="text-center">
						<Button variant="outline" size="sm" onclick={loadMoreComments} disabled={loading}>
							{loading ? 'Loading...' : 'Load more comments'}
						</Button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
