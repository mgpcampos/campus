<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { getPosts } from '$lib/services/posts.js';
	import {
		subscribeFeed,
		enablePolling,
		disablePolling,
		realtimeStatus,
		feedPosts
	} from '$lib/services/realtime.js';
	import PostCard from './PostCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Loader2, RefreshCw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { notifyError, withErrorToast } from '$lib/utils/errors.js';
	import { t } from '$lib/i18n';

	export let scope = 'global';
	export let space: string | null = null;
	export let group: string | null = null;
	export let refreshTrigger = 0; // External trigger for refresh
	export let q: string = '';
	export let sort: 'new' | 'top' | 'trending' = 'new';
	export let timeframeHours: number = 48;

	const dispatch = createEventDispatcher();

	let posts: any[] = [];
	let loading = false;
	let loadingMore = false;
	let hasMore = true;
	let currentPage = 1;
	let error: string | undefined = undefined;
	let lastQueryKey = '';

	const perPage = 20;

	onMount(() => {
		loadPosts().then(() => {
			// Subscribe realtime after initial load
			subscribeFeed({ scope, space, group });
		});
		const unsub = realtimeStatus.subscribe((status) => {
			if (!status.connected) {
				enablePolling(async () => {
					await refreshFeed();
				});
			} else {
				disablePolling();
			}
		});
		// Keep posts in sync with feedPosts store (but only for realtime updates, not initial empty state)
		let initialized = false;
		const unsubPosts = feedPosts.subscribe((fp) => {
			// Skip the initial empty subscription callback
			if (!initialized) {
				initialized = true;
				return;
			}
			// Only update if we have posts from realtime
			if (fp.length > 0 || posts.length === 0) {
				posts = fp;
			}
		});
		return () => {
			unsub();
			unsubPosts();
		};
	});

	// Watch for refresh trigger changes
	$: if (refreshTrigger > 0) {
		refreshFeed();
	}

	// Reactive refresh when query parameters change
	$: {
		const key = `${scope}|${space}|${group}|${q}|${sort}|${timeframeHours}`;
		if (key !== lastQueryKey && !loading && !loadingMore) {
			lastQueryKey = key;
			// Avoid double initial load (onMount already loads)
			if (posts.length > 0) {
				refreshFeed();
			}
		}
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
				group: group ?? undefined,
				q: q || undefined,
				sort,
				timeframeHours
			});

			if (append) {
				posts = [...posts, ...(result as any).items];
			} else {
				posts = (result as any).items;
				// Sync with feedPosts store for realtime updates
				feedPosts.set(posts);
			}

			hasMore = (result as any).page < (result as any).totalPages;
			currentPage = (result as any).page;
		} catch (err) {
			const normalized = await notifyError(err, { context: 'loadPosts' });
			error = normalized.userMessage;
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
			posts = posts.filter((p) => p.id !== postId);
			dispatch('delete', { postId });
			toast.success('Post deleted successfully');
		} catch (err) {
			await notifyError(err, { context: 'deletePost' });
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
		<div class="flex justify-center py-10">
			<Loader2 size={32} class="animate-spin text-muted-foreground opacity-70" aria-hidden="true" />
		</div>
	{:else if error}
		<div class="py-8 text-center">
			<p class="mb-4 text-destructive">{error}</p>
			<Button onclick={refreshFeed} variant="outline">
				<RefreshCw size={16} class="mr-2" />
				Try Again
			</Button>
		</div>
	{:else if posts.length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<div class="mb-4 rounded-full bg-muted p-4">
				<svg
					class="h-12 w-12 text-muted-foreground"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-semibold text-foreground">{t('feed.noPostsYet')}</h3>
			<p class="mb-6 max-w-sm text-sm text-muted-foreground">
				{t('feed.emptyFeedDescription')}
			</p>
			<div class="flex flex-wrap justify-center gap-3">
				<Button href="/spaces" variant="outline">
					<svg
						class="mr-2 h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					{t('feed.exploreSpaces')}
				</Button>
				<Button href="/materials" variant="outline">
					<svg
						class="mr-2 h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
					{t('feed.browseMaterials')}
				</Button>
			</div>
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
			<div class="flex justify-center py-6">
				<Button onclick={loadMore} variant="outline" disabled={loadingMore} class="min-w-32">
					{#if loadingMore}
						<Loader2 size={16} class="mr-2 animate-spin" aria-hidden="true" />
						Loading...
					{:else}
						Load More
					{/if}
				</Button>
			</div>
		{:else if posts.length > 0}
			<div class="py-6 text-center">
				<p class="text-sm text-muted-foreground">{t('feed.youReachedEnd')}</p>
			</div>
		{/if}
	{/if}
</div>
