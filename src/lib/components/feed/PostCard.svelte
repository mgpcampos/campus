<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { formatDistanceToNow } from 'date-fns';
	import { Button } from '$lib/components/ui/button/index.js';
	import ImageAttachment from '$lib/components/media/ImageAttachment.svelte';
	import VideoAttachment from '$lib/components/media/VideoAttachment.svelte';
	import { Heart, MessageCircle, MoreHorizontal, Edit, Trash2 } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import linkifyIt from 'linkify-it';
	import { toggleLike, hasUserLikedPost } from '$lib/services/likes.js';
	// Lazy loaded comment section to reduce initial bundle size
	let CommentSectionPromise: Promise<any> | null = null;
	let CommentSectionModule: any = null;
	async function loadCommentSection() {
		if (!CommentSectionPromise) {
			CommentSectionPromise = import('./CommentSection.svelte').then((m) => {
				CommentSectionModule = m.default;
				return m;
			});
		}
		return CommentSectionPromise;
	}
	import { toast } from 'svelte-sonner';
	import { notifyError } from '$lib/utils/errors.js';

	export let post: any;
	export let showActions = true;

	const dispatch = createEventDispatcher();
	const linkify = new linkifyIt();

	let isLiked = false;
	let likeCount = post.likeCount || 0;
	let commentCount = post.commentCount || 0;
	let likePending = false;

	$: author = post.expand?.author;
	$: isOwner = $currentUser && author && $currentUser.id === author.id;
	let canModerate = false;
	import { canModeratePost } from '$lib/services/permissions.js';
	import { reportContent } from '$lib/services/reports.js';

	onMount(async () => {
		if ($currentUser) {
			try {
				canModerate = await canModeratePost(post);
			} catch (e) {
				console.warn('perm check failed', e);
			}
		}
	});
	$: formattedDate = formatDistanceToNow(new Date(post.created), { addSuffix: true });
	$: linkedContent = linkifyContent(post.content);
	$: canInteract = $currentUser !== null;

	onMount(() => {
		let unsubscribeFn = () => {};
		(async () => {
			if ($currentUser) {
				try {
					isLiked = await hasUserLikedPost(post.id);
				} catch (error) {
					console.error('Error checking like status:', error);
				}
			}
			const unsub = await pb.collection('posts').subscribe(post.id, (e) => {
				if (e.action === 'update') {
					likeCount = e.record.likeCount || 0;
					commentCount = e.record.commentCount || 0;
				}
			});
			unsubscribeFn = () => {
				try {
					unsub();
				} catch {}
				try {
					pb.collection('posts').unsubscribe(post.id);
				} catch {}
			};
		})();
		return () => unsubscribeFn();
	});

	function linkifyContent(content: string) {
		const matches = linkify.match(content);
		if (!matches) return content;

		let result = content;
		let offset = 0;

		matches.forEach((match: any) => {
			const before = result.slice(0, match.index + offset);
			const after = result.slice(match.lastIndex + offset);
			const link = `<a href="${match.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${match.text}</a>`;

			result = before + link + after;
			offset += link.length - match.text.length;
		});

		return result;
	}

	async function handleLike() {
		if (!canInteract || likePending) return;

		// Optimistic update
		const wasLiked = isLiked;
		const oldCount = likeCount;

		isLiked = !isLiked;
		likeCount = isLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
		likePending = true;

		try {
			const result = await toggleLike(post.id);
			isLiked = result.liked;
			likeCount = result.likeCount;
		} catch (error) {
			// Revert optimistic update on error
			isLiked = wasLiked;
			likeCount = oldCount;
			await notifyError(error, { context: 'toggleLike' });
		} finally {
			likePending = false;
		}

		dispatch('like', { postId: post.id, liked: isLiked, likeCount });
	}

	function handleComment() {
		loadCommentSection();
		dispatch('comment', { postId: post.id });
	}

	function handleEdit() {
		dispatch('edit', { post });
	}

	function handleDelete() {
		if (confirm('Are you sure you want to delete this post?')) {
			dispatch('delete', { postId: post.id });
		}
	}

	function handleCommentCountChanged(event: CustomEvent) {
		commentCount = event.detail.count;
	}

	function getFileUrl(filename: string) {
		return pb.files.getURL(post, filename);
	}

	// Normalize attachments to always be an array
	// PocketBase returns a string for single file, array for multiple
	$: attachments = (() => {
		if (!post.attachments) return [];
		if (Array.isArray(post.attachments)) return post.attachments;
		return [post.attachments];
	})();

	$: mediaType = post.mediaType || 'text';
	$: isVideoPost = mediaType === 'video';
	$: isImagePost = mediaType === 'images' || (!isVideoPost && attachments.length > 0);
</script>

<article
	class="border-b border-border/40 bg-background transition-colors hover:bg-muted/30"
	data-has-media={attachments.length > 0}
>
	<div class="p-4">
		<div class="flex space-x-3">
			<!-- Avatar -->
			<div class="flex-shrink-0">
				<a
					href={author ? `/profile/${author.username}` : '#'}
					class="block rounded-full focus:ring-2 focus:ring-primary/50 focus:outline-none"
				>
					{#if author?.avatar}
						<img
							src={pb.files.getURL(author, author.avatar, { thumb: '40x40' })}
							alt="{author.name}'s avatar"
							class="h-10 w-10 rounded-full object-cover"
						/>
					{:else}
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
							<span class="text-sm font-medium text-muted-foreground">
								{author?.name?.charAt(0)?.toUpperCase() || '?'}
							</span>
						</div>
					{/if}
				</a>
			</div>

			<!-- Content -->
			<div class="min-w-0 flex-1">
				<!-- Header -->
				<div class="mb-1 flex items-center justify-between">
					<div class="flex items-center space-x-2">
						<a
							href={author
								? `/profile/${author.username || author.email?.split('@')[0] || author.id}`
								: '#'}
							class="rounded font-semibold text-foreground hover:underline focus:ring-2 focus:ring-primary/50 focus:outline-none"
						>
							{author?.name || 'Unknown User'}
						</a>
						<span class="text-muted-foreground">·</span>
						<a
							href={author
								? `/profile/${author.username || author.email?.split('@')[0] || author.id}`
								: '#'}
							class="rounded text-muted-foreground hover:underline focus:ring-2 focus:ring-primary/50 focus:outline-none"
						>
							@{author?.username || author?.email?.split('@')[0] || 'unknown'}
						</a>
						<span class="text-muted-foreground">·</span>
						<time class="text-sm text-muted-foreground" datetime={post.created}>
							{formattedDate}
						</time>
					</div>

					{#if (isOwner || canModerate) && showActions}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button
									variant="ghost"
									size="sm"
									class="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<MoreHorizontal size={14} />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								{#if isOwner}
									<DropdownMenu.Item onclick={handleEdit}>
										<Edit size={16} class="mr-2" />
										Edit
									</DropdownMenu.Item>
								{/if}
								{#if canModerate}
									<DropdownMenu.Item onclick={handleDelete} class="text-destructive">
										<Trash2 size={16} class="mr-2" />
										Delete
									</DropdownMenu.Item>
								{/if}
								{#if !isOwner}
									<DropdownMenu.Item
										onclick={async () => {
											try {
												await reportContent({
													targetType: 'post',
													targetId: post.id,
													reason: 'inappropriate'
												});
												toast.success('Reported');
											} catch (e) {
												await notifyError(e, { context: 'reportPost' });
											}
										}}
									>
										<Trash2 size={16} class="mr-2" />
										Report
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
				</div>

				<!-- Post Content -->
				<div class="prose prose-sm max-w-none text-foreground">
					{@html linkedContent}
				</div>

				<!-- Media attachments -->
				{#if isVideoPost && attachments.length > 0}
					<div class="mt-3">
						<VideoAttachment
							{post}
							videoFile={attachments[0]}
							posterFile={post.videoPoster}
							altText={post.mediaAltText || ''}
						/>
					</div>
				{:else if isImagePost && attachments.length > 0}
					<div
						class="mt-3 grid gap-2 overflow-hidden rounded-lg {attachments.length === 1
							? 'grid-cols-1'
							: attachments.length === 2
								? 'grid-cols-2'
								: attachments.length === 3
									? 'grid-cols-3'
									: 'grid-cols-2'}"
					>
						{#each attachments as attachment (attachment)}
							<ImageAttachment
								src={getFileUrl(attachment)}
								alt="Post attachment"
								className={attachments.length === 1
									? 'max-h-[500px] object-contain'
									: 'h-48 object-cover'}
							/>
						{/each}
					</div>
				{/if}

				<!-- Actions -->
				{#if showActions}
					<div class="mt-3 flex max-w-md items-center justify-between">
						<Button
							variant="ghost"
							size="sm"
							onclick={handleLike}
							disabled={!canInteract || likePending}
							class="flex items-center space-x-1 text-muted-foreground transition-colors hover:text-red-500 {isLiked
								? 'text-red-500'
								: ''}"
						>
							<Heart size={16} class={isLiked ? 'fill-current' : ''} />
							<span class="text-sm">{likeCount}</span>
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onclick={handleComment}
							class="flex items-center space-x-1 text-muted-foreground transition-colors hover:text-blue-500"
						>
							<MessageCircle size={16} />
							<span class="text-sm">{commentCount}</span>
						</Button>

						<Button
							variant="ghost"
							size="sm"
							class="flex items-center space-x-1 text-muted-foreground transition-colors hover:text-green-500"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
								/>
							</svg>
							<span class="text-sm">Share</span>
						</Button>
					</div>

					<!-- Comment Section (lazy) -->
					{#if CommentSectionModule}
						<div class="mt-4">
							<svelte:component
								this={CommentSectionModule}
								postId={post.id}
								initialCommentCount={commentCount}
								on:commentCountChanged={handleCommentCountChanged}
							/>
						</div>
					{:else}
						<button
							class="mt-2 text-sm text-blue-500 hover:underline"
							onclick={loadCommentSection}
							type="button"
						>
							Load comments...
						</button>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</article>
