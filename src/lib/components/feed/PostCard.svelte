<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { formatDistanceToNow } from 'date-fns';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
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
	import { notifyError, withErrorToast } from '$lib/utils/errors.js';

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

<Card.Root class="w-full" data-has-media={attachments.length > 0}>
	<Card.Header class="pb-3">
		<div class="flex items-start justify-between">
			<div class="flex items-center space-x-3">
				<a
					href={author ? `/profile/${author.username}` : '#'}
					class="group rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
				>
					{#if author?.avatar}
						<img
							src={pb.files.getURL(author, author.avatar, { thumb: '40x40' })}
							alt="{author.name}'s avatar"
							class="h-10 w-10 rounded-full object-cover ring-2 ring-transparent transition group-hover:ring-blue-200"
						/>
					{:else}
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 ring-2 ring-transparent transition group-hover:ring-blue-200"
						>
							<span class="font-medium text-gray-600">
								{author?.name?.charAt(0)?.toUpperCase() || '?'}
							</span>
						</div>
					{/if}
				</a>
				<div>
					<h3 class="text-sm font-semibold">
						<a
							href={author ? `/profile/${author.username}` : '#'}
							class="rounded-sm hover:underline focus:ring-2 focus:ring-blue-500 focus:outline-none"
						>
							{author?.name || 'Unknown User'}
						</a>
					</h3>
					<p class="text-xs text-gray-500">@{author?.username || 'unknown'}</p>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<span class="text-xs text-gray-500">{formattedDate}</span>

				{#if (isOwner || canModerate) && showActions}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
								<MoreHorizontal size={16} />
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
								<DropdownMenu.Item onclick={handleDelete} class="text-red-600">
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
		</div>
	</Card.Header>

	<Card.Content class="pt-0">
		<div class="prose prose-sm max-w-none">
			{@html linkedContent}
		</div>

		<!-- Video attachment -->
		{#if isVideoPost && attachments.length > 0}
			<div class="mt-3">
				<VideoAttachment
					{post}
					videoFile={attachments[0]}
					posterFile={post.videoPoster}
					altText={post.mediaAltText || ''}
				/>
			</div>
		{/if}

		<!-- Image attachments -->
		{#if isImagePost && attachments.length > 0}
			<div
				class="mt-3 grid gap-2 {attachments.length === 1
					? 'grid-cols-1'
					: attachments.length === 2
						? 'grid-cols-2'
						: attachments.length === 3
							? 'grid-cols-3'
							: 'grid-cols-2'}"
			>
				{#each attachments as attachment}
					<!-- Using dedicated component for future responsive sources -->
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
	</Card.Content>

	{#if showActions}
		<Card.Footer class="pt-3">
			<div class="mb-3 flex items-center space-x-4">
				<Button
					variant="ghost"
					size="sm"
					onclick={handleLike}
					disabled={!canInteract || likePending}
					class="text-gray-600 transition-colors hover:text-red-500 {isLiked ? 'text-red-500' : ''}"
				>
					<Heart size={16} class="mr-1 {isLiked ? 'fill-current' : ''}" />
					{likeCount}
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={handleComment}
					class="text-gray-600 transition-colors hover:text-blue-500"
				>
					<MessageCircle size={16} class="mr-1" />
					{commentCount}
				</Button>
			</div>

			<!-- Comment Section (lazy) -->
			{#if CommentSectionModule}
				<svelte:component
					this={CommentSectionModule}
					postId={post.id}
					initialCommentCount={commentCount}
					on:commentCountChanged={handleCommentCountChanged}
				/>
			{:else}
				<button
					class="text-xs text-blue-600 hover:underline"
					onclick={loadCommentSection}
					type="button">Load comments...</button
				>
			{/if}
		</Card.Footer>
	{/if}
</Card.Root>
