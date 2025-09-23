<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { formatDistanceToNow } from 'date-fns';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Heart, MessageCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import linkifyIt from 'linkify-it';
	import { toggleLike, hasUserLikedPost } from '$lib/services/likes.js';
	import CommentSection from './CommentSection.svelte';
	import { toast } from 'svelte-sonner';

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
	$: formattedDate = formatDistanceToNow(new Date(post.created), { addSuffix: true });
	$: linkedContent = linkifyContent(post.content);
	$: canInteract = $currentUser !== null;

	onMount(async () => {
		// Check if user has liked this post
		if ($currentUser) {
			try {
				isLiked = await hasUserLikedPost(post.id);
			} catch (error) {
				console.error('Error checking like status:', error);
			}
		}

		// Subscribe to real-time updates for this post
		pb.collection('posts').subscribe(post.id, (e) => {
			if (e.action === 'update') {
				likeCount = e.record.likeCount || 0;
				commentCount = e.record.commentCount || 0;
			}
		});

		return () => {
			pb.collection('posts').unsubscribe(post.id);
		};
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
			console.error('Error toggling like:', error);
			toast.error('Failed to update like');
		} finally {
			likePending = false;
		}

		dispatch('like', { postId: post.id, liked: isLiked, likeCount });
	}

	function handleComment() {
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
		return pb.files.getUrl(post, filename);
	}
</script>

<Card.Root class="w-full">
	<Card.Header class="pb-3">
		<div class="flex items-start justify-between">
			<div class="flex items-center space-x-3">
				{#if author?.avatar}
					<img
						src={pb.files.getUrl(author, author.avatar, { thumb: '40x40' })}
						alt="{author.name}'s avatar"
						class="w-10 h-10 rounded-full object-cover"
					/>
				{:else}
					<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
						<span class="text-gray-600 font-medium">
							{author?.name?.charAt(0)?.toUpperCase() || '?'}
						</span>
					</div>
				{/if}
				
				<div>
					<h3 class="font-semibold text-sm">{author?.name || 'Unknown User'}</h3>
					<p class="text-xs text-gray-500">@{author?.username || 'unknown'}</p>
				</div>
			</div>
			
			<div class="flex items-center space-x-2">
				<span class="text-xs text-gray-500">{formattedDate}</span>
				
				{#if isOwner && showActions}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
								<MoreHorizontal size={16} />
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={handleEdit}>
								<Edit size={16} class="mr-2" />
								Edit
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={handleDelete} class="text-red-600">
								<Trash2 size={16} class="mr-2" />
								Delete
							</DropdownMenu.Item>
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
		
		<!-- Image attachments -->
		{#if post.attachments && post.attachments.length > 0}
			<div class="mt-3 grid gap-2 {post.attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}">
				{#each post.attachments as attachment}
					<img
						src={getFileUrl(attachment)}
						alt="Post attachment"
						class="rounded-md border object-cover w-full {post.attachments.length === 1 ? 'max-h-96' : 'h-32'}"
						loading="lazy"
					/>
				{/each}
			</div>
		{/if}
	</Card.Content>
	
	{#if showActions}
		<Card.Footer class="pt-3">
			<div class="flex items-center space-x-4 mb-3">
				<Button
					variant="ghost"
					size="sm"
					onclick={handleLike}
					disabled={!canInteract || likePending}
					class="text-gray-600 hover:text-red-500 transition-colors {isLiked ? 'text-red-500' : ''}"
				>
					<Heart size={16} class="mr-1 {isLiked ? 'fill-current' : ''}" />
					{likeCount}
				</Button>
				
				<Button
					variant="ghost"
					size="sm"
					onclick={handleComment}
					class="text-gray-600 hover:text-blue-500 transition-colors"
				>
					<MessageCircle size={16} class="mr-1" />
					{commentCount}
				</Button>
			</div>

			<!-- Comment Section -->
			<CommentSection 
				postId={post.id} 
				initialCommentCount={commentCount}
				on:commentCountChanged={handleCommentCountChanged}
			/>
		</Card.Footer>
	{/if}
</Card.Root>