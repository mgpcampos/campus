<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { getPosts } from '$lib/services/posts.js';
	import { subscribeFeed, enablePolling, disablePolling, realtimeStatus, feedPosts } from '$lib/services/realtime.js';
	import PostCard from './PostCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Loader2, RefreshCw } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export let scope = 'global';
	export let space: string | null = null;
	export let group: string | null = null;
	export let refreshTrigger = 0; // External trigger for refresh

	const dispatch = createEventDispatcher();

	let posts: any[] = [];
	let loading = false;
	let loadingMore = false;
	let hasMore = true;
	let currentPage = 1;
	let error: string | undefined = undefined;

	const perPage = 20;

	onMount(() => {
		loadPosts().then(() => {
			// Subscribe realtime after initial load
			subscribeFeed({ scope, space, group });
		});
		const unsub = realtimeStatus.subscribe(status => {
			if (!status.connected) {
				enablePolling(async () => { await refreshFeed(); });
			} else {
				disablePolling();
			}
		});
		// Keep posts in sync with feedPosts store
		const unsubPosts = feedPosts.subscribe(fp => {
			// Merge updates only if same context
			posts = fp;
		});
		return () => { unsub(); unsubPosts(); };
	});

	// Watch for refresh trigger changes
	$: if (refreshTrigger > 0) {
		refreshFeed();
	}

	async function loadPosts(page = 1, append = false) {
		if (loading || loadingMore) return;

		if (append) {
			loadingMore = true;
		} else {
			loading = true;
			error = undefined;
		}

		try {
			const result = await getPosts({
				page,
				perPage,
				scope: scope as any,
				space: space ?? undefined,
				group: group ?? undefined
			});

			if (append) {
				posts = [...posts, ...(result as any).items];
			} else {
				posts = (result as any).items;
			}

			hasMore = (result as any).page < (result as any).totalPages;
			currentPage = (result as any).page;
		} catch (err) {
			console.error('Error loading posts:', err);
			error = 'Failed to load posts. Please try again.';
			toast.error('Failed to load posts');
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	async function loadMore() {
		if (!hasMore || loadingMore) return;
		await loadPosts(currentPage + 1, true);
	}

	async function refreshFeed() {
		currentPage = 1;
		hasMore = true;
		await loadPosts(1, false);
	}

	function handlePostAction(event: CustomEvent) {
		const { type, detail } = event;
		
		switch (type) {
			case 'like':
				handleLike(detail.postId);
				break;
			case 'comment':
				handleComment(detail.postId);
				break;
			case 'edit':
				handleEdit(detail.post);
				break;
			case 'delete':
				handleDelete(detail.postId);
				break;
		}
	}

	function handleLike(postId: string) {
		dispatch('like', { postId });
	}

	function handleComment(postId: string) {
		dispatch('comment', { postId });
	}

	function handleEdit(post: any) {
		dispatch('edit', { post });
	}

	async function handleDelete(postId: string) {
		try {
			// Optimistically remove from UI
			posts = posts.filter(p => p.id !== postId);
			dispatch('delete', { postId });
			toast.success('Post deleted successfully');
		} catch (err) {
			console.error('Error deleting post:', err);
			toast.error('Failed to delete post');
			// Reload to restore state
			await refreshFeed();
		}
	}

	// Public method to add new post to feed
	export function addPost(newPost: any) {
		posts = [newPost, ...posts];
	}
</script>

<div class="space-y-4">
	{#if loading}
		<div class="flex justify-center py-8">
			<Loader2 size={32} class="animate-spin text-gray-400" />
		</div>
	{:else if error}
		<div class="text-center py-8">
			<p class="text-red-600 mb-4">{error}</p>
			<Button onclick={refreshFeed} variant="outline">
				<RefreshCw size={16} class="mr-2" />
				Try Again
			</Button>
		</div>
	{:else if posts.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-500 text-lg mb-2">No posts yet</p>
			<p class="text-gray-400">Be the first to share something!</p>
		</div>
	{:else}
		<!-- Posts list -->
		{#each posts as post (post.id)}
			<PostCard
				{post}
				on:like={handlePostAction}
				on:comment={handlePostAction}
				on:edit={handlePostAction}
				on:delete={handlePostAction}
			/>
		{/each}

		<!-- Load more button -->
		{#if hasMore}
			<div class="flex justify-center py-4">
				<Button
					onclick={loadMore}
					variant="outline"
					disabled={loadingMore}
					class="min-w-32"
				>
					{#if loadingMore}
						<Loader2 size={16} class="mr-2 animate-spin" />
						Loading...
					{:else}
						Load More
					{/if}
				</Button>
			</div>
		{:else if posts.length > 0}
			<div class="text-center py-4">
				<p class="text-gray-500 text-sm">You've reached the end!</p>
			</div>
		{/if}
	{/if}
</div>