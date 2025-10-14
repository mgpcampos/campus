<svelte:options runes />

<script lang="ts">
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import PostForm from '$lib/components/forms/PostForm.svelte';
	import Feed from '$lib/components/feed/Feed.svelte';
	import { MessageSquare } from '@lucide/svelte';

	let { data } = $props();

	let feedComponent: InstanceType<typeof Feed> | null = null;

	let refreshTrigger = $state(0);

	type SortOption = 'new' | 'top' | 'trending';
	let feedSearch = $state('');
	let feedSort = $state<SortOption>('new');
	let timeframeHours = $state(48);

	const trendingOptions = [6, 12, 24, 48, 72] as const;

	let searchDebounce: ReturnType<typeof setTimeout> | null = null;
	function handleSearchInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		if (searchDebounce) clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			feedSearch = value.trim();
		}, 250);
	}

	function changeSort(next: SortOption) {
		feedSort = next;
	}

	function changeTimeframe(event: Event) {
		timeframeHours = Number.parseInt((event.target as HTMLSelectElement).value, 10);
	}

	function handlePostCreated(event: CustomEvent<any>) {
		const newPost = event.detail;
		if (feedComponent && typeof feedComponent.addPost === 'function') {
			feedComponent.addPost(newPost);
		}
		refreshTrigger += 1;
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Compose Section -->
	{#if $currentUser}
		<div class="border-b border-border/40 bg-card/50">
			<div class="mx-auto max-w-2xl px-4 py-4">
				<div class="flex space-x-3">
					<!-- User Avatar -->
					<div class="flex-shrink-0">
						{#if $currentUser.avatar}
							<img
								src={pb.files.getURL($currentUser, $currentUser.avatar, { thumb: '40x40' })}
								alt="{$currentUser.name}'s avatar"
								class="h-10 w-10 rounded-full object-cover"
							/>
						{:else}
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
								<span class="text-sm font-medium text-muted-foreground">
									{$currentUser.name?.charAt(0)?.toUpperCase() || '?'}
								</span>
							</div>
						{/if}
					</div>

					<!-- Compose Form -->
					<div class="flex-1">
						<PostForm formData={data.form} on:postCreated={handlePostCreated} />
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="border-b border-border/40 bg-card/50">
			<div class="p-4 text-center">
				<p class="mb-3 text-foreground">Sign in to share updates with your peers.</p>
				<div class="flex justify-center gap-3">
					<Button href="/auth/login" size="sm">Sign In</Button>
					<Button href="/auth/register" variant="outline" size="sm">Create Account</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Feed Controls -->
	<div class="border-b border-border/40 bg-card/50">
		<div class="mx-auto max-w-2xl px-4 py-4">
			<div class="flex items-center justify-between">
				<!-- Sort Tabs -->
				<div
					class="inline-flex rounded-lg border border-input bg-background p-1"
					role="tablist"
					aria-label="Feed sort options"
				>
					<Button
						variant={feedSort === 'new' ? 'default' : 'ghost'}
						size="sm"
						onclick={() => changeSort('new')}
						role="tab"
						aria-selected={feedSort === 'new'}
						tabindex={feedSort === 'new' ? 0 : -1}
						class="px-3"
					>
						<MessageSquare class="mr-2 h-4 w-4" aria-hidden="true" />
						New
					</Button>
					<Button
						variant={feedSort === 'top' ? 'default' : 'ghost'}
						size="sm"
						onclick={() => changeSort('top')}
						role="tab"
						aria-selected={feedSort === 'top'}
						tabindex={feedSort === 'top' ? 0 : -1}
						class="px-3"
					>
						Top
					</Button>
					<Button
						variant={feedSort === 'trending' ? 'default' : 'ghost'}
						size="sm"
						onclick={() => changeSort('trending')}
						role="tab"
						aria-selected={feedSort === 'trending'}
						tabindex={feedSort === 'trending' ? 0 : -1}
						class="px-3"
					>
						Trending
					</Button>
				</div>

				<!-- Search and Timeframe -->
				<div class="flex items-center space-x-3">
					{#if feedSort === 'trending'}
						<select
							class="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
							onchange={changeTimeframe}
							aria-label="Trending timeframe"
							value={timeframeHours}
						>
							{#each trendingOptions as option (option)}
								<option value={option}>{option}h</option>
							{/each}
						</select>
					{/if}

					<div class="relative">
						<input
							type="search"
							placeholder="Search posts..."
							class="h-8 w-48 rounded-full border border-input bg-background px-3 pr-8 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
							oninput={handleSearchInput}
						/>
						<div class="absolute inset-y-0 right-0 flex items-center pr-2">
							<svg
								class="h-4 w-4 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Feed Timeline -->
	<section aria-label="Feed timeline">
		<Feed
			bind:this={feedComponent}
			scope="global"
			{refreshTrigger}
			q={feedSearch}
			sort={feedSort}
			{timeframeHours}
			on:like={(event) => console.log('Like:', event.detail)}
			on:comment={(event) => console.log('Comment:', event.detail)}
			on:edit={(event) => console.log('Edit:', event.detail)}
			on:delete={(event) => console.log('Delete:', event.detail)}
		/>
	</section>
</div>
