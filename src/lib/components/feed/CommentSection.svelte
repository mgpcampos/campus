<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { getComments, createComment, deleteComment } from '$lib/services/comments.js';
	import { formatDistanceToNow } from 'date-fns';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { MessageCircle, Send, Trash2, Edit } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

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
			comments = comments.filter(c => c.id !== e.record.id);
			commentCount = Math.max(0, commentCount - 1);
			dispatch('commentCountChanged', { postId, count: commentCount });
		} else if (e.action === 'update') {
			// Update existing comment
			const index = comments.findIndex(c => c.id === e.record.id);
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
		try {
			const result = await getComments(postId, { page, perPage: 20 });
			
			if (page === 1) {
				comments = result.items;
			} else {
				comments = [...comments, ...result.items];
			}
			
			hasMore = result.page < result.totalPages;
		} catch (error) {
			console.error('Error loading comments:', error);
			toast.error('Failed to load comments');
		} finally {
			loading = false;
		}
	}

	async function loadMoreComments() {
		if (!hasMore || loading) return;
		
		page++;
		await loadComments();
	}

	async function submitComment() {
		if (!canComment || !newCommentContent.trim() || submitting) return;

		submitting = true;
		try {
			const comment = await createComment(postId, newCommentContent);
			
			// Add to local state (will also be handled by real-time update)
			comments = [...comments, comment];
			commentCount++;
			newCommentContent = '';
			
			dispatch('commentCountChanged', { postId, count: commentCount });
			toast.success('Comment added');
		} catch (error) {
			console.error('Error creating comment:', error);
			toast.error('Failed to add comment');
		} finally {
			submitting = false;
		}
	}

	async function handleDeleteComment(commentId: string) {
		if (!confirm('Are you sure you want to delete this comment?')) return;

		try {
			await deleteComment(commentId, postId);
			
			// Remove from local state (will also be handled by real-time update)
			comments = comments.filter(c => c.id !== commentId);
			commentCount = Math.max(0, commentCount - 1);
			
			dispatch('commentCountChanged', { postId, count: commentCount });
			toast.success('Comment deleted');
		} catch (error) {
			console.error('Error deleting comment:', error);
			toast.error('Failed to delete comment');
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			submitComment();
		}
	}

	function getAuthorAvatar(author: any) {
		if (author?.avatar) {
			return pb.files.getUrl(author, author.avatar, { thumb: '32x32' });
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
		class="text-gray-600 hover:text-blue-500 transition-colors mb-3"
	>
		<MessageCircle size={16} class="mr-1" />
		{commentCount} {commentCount === 1 ? 'comment' : 'comments'}
	</Button>

	{#if showComments}
		<!-- Comment form -->
		{#if canComment}
			<div class="mb-4">
				<div class="flex space-x-3">
					{#if $currentUser?.avatar}
						<img
							src={pb.files.getUrl($currentUser, $currentUser.avatar, { thumb: '32x32' })}
							alt="Your avatar"
							class="w-8 h-8 rounded-full object-cover flex-shrink-0"
						/>
					{:else}
						<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
							<span class="text-gray-600 text-sm font-medium">
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
						<div class="flex justify-between items-center mt-2">
							<span class="text-xs text-gray-500">
								Press Ctrl+Enter to submit
							</span>
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
			<p class="text-sm text-gray-500 mb-4">
				<a href="/auth/login" class="text-blue-600 hover:underline">Sign in</a> to comment
			</p>
		{/if}

		<!-- Comments list -->
		{#if loading && comments.length === 0}
			<div class="text-center py-4">
				<p class="text-gray-500">Loading comments...</p>
			</div>
		{:else if comments.length === 0}
			<div class="text-center py-4">
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
								class="w-8 h-8 rounded-full object-cover flex-shrink-0"
							/>
						{:else}
							<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
								<span class="text-gray-600 text-sm font-medium">
									{comment.expand?.author?.name?.charAt(0)?.toUpperCase() || '?'}
								</span>
							</div>
						{/if}
						
						<div class="flex-1">
							<Card.Root class="p-3">
								<div class="flex justify-between items-start mb-2">
									<div>
										<h4 class="font-medium text-sm">
											{comment.expand?.author?.name || 'Unknown User'}
										</h4>
										<p class="text-xs text-gray-500">
											@{comment.expand?.author?.username || 'unknown'} · 
											{formatCommentDate(comment.created)}
										</p>
									</div>
									
									{#if $currentUser && comment.expand?.author?.id === $currentUser.id}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => handleDeleteComment(comment.id)}
											class="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
										>
											<Trash2 size={12} />
										</Button>
									{/if}
								</div>
								
								<p class="text-sm text-gray-800 whitespace-pre-wrap">
									{comment.content}
								</p>
							</Card.Root>
						</div>
					</div>
				{/each}

				<!-- Load more button -->
				{#if hasMore}
					<div class="text-center">
						<Button
							variant="outline"
							size="sm"
							onclick={loadMoreComments}
							disabled={loading}
						>
							{loading ? 'Loading...' : 'Load more comments'}
						</Button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>