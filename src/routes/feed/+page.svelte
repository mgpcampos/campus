<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import PostForm from '$lib/components/forms/PostForm.svelte';
	import Feed from '$lib/components/feed/Feed.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { MessageSquare, Users } from '@lucide/svelte';

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

<svelte:head>
	<title>Campus Feed</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8 py-6 sm:py-10">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-3xl font-semibold tracking-tight text-foreground">Community Feed</h1>
			<p class="text-base text-muted-foreground">
				Share updates, research progress, and resources with the broader Campus community.
			</p>
		</div>
		{#if $currentUser}
			<Button href="/spaces" variant="outline" size="sm" class="self-start sm:self-auto">
				<Users class="mr-2 h-4 w-4" aria-hidden="true" />
				Browse Spaces
			</Button>
		{/if}
	</header>

	{#if $currentUser}
		<Card.Root class="border border-border/60 bg-card/95 shadow-sm">
			<Card.Header>
				<Card.Title class="text-lg font-semibold">Create a post</Card.Title>
				<Card.Description>
					Upload images or short videos (≤ 5 minutes) with descriptive alt text for accessibility.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<PostForm formData={data.form} on:postCreated={handlePostCreated} />
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root class="border border-border/60 bg-card/95 shadow-sm">
			<Card.Content class="space-y-3">
				<p class="text-base text-foreground">Sign in to share updates with your peers.</p>
				<div class="flex gap-3">
					<Button href="/auth/login" size="sm">Sign In</Button>
					<Button href="/auth/register" variant="outline" size="sm">Create Account</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<section class="space-y-6">
		<Card.Root class="border border-border/60 bg-card/95 shadow-sm">
			<Card.Header class="gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="space-y-1 text-left">
					<Card.Title class="text-2xl">Global Feed</Card.Title>
					<Card.Description>
						Stay up to date with what the Campus community is sharing right now.
					</Card.Description>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-col gap-2 sm:max-w-sm">
					<Label for="feed-search" class="text-sm text-muted-foreground">Search posts</Label>
					<Input
						id="feed-search"
						type="search"
						placeholder="Search by keyword"
						autocomplete="off"
						oninput={handleSearchInput}
					/>
				</div>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div
						class="inline-flex rounded-lg border border-input bg-background p-1 shadow-xs"
						role="group"
						aria-label="Feed sort options"
					>
						<Button
							variant={feedSort === 'new' ? 'default' : 'ghost'}
							size="sm"
							onclick={() => changeSort('new')}
							aria-pressed={feedSort === 'new'}
							class="px-3"
						>
							<MessageSquare class="mr-2 h-4 w-4" aria-hidden="true" />
							New
						</Button>
						<Button
							variant={feedSort === 'top' ? 'default' : 'ghost'}
							size="sm"
							onclick={() => changeSort('top')}
							aria-pressed={feedSort === 'top'}
							class="px-3"
						>
							Top
						</Button>
						<Button
							variant={feedSort === 'trending' ? 'default' : 'ghost'}
							size="sm"
							onclick={() => changeSort('trending')}
							aria-pressed={feedSort === 'trending'}
							class="px-3"
						>
							Trending
						</Button>
					</div>
					{#if feedSort === 'trending'}
						<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
							<Label for="timeframe-select" class="text-sm text-muted-foreground"
								>Trending window</Label
							>
							<select
								id="timeframe-select"
								class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
								onchange={changeTimeframe}
								aria-label="Trending timeframe"
								value={timeframeHours}
							>
								{#each trendingOptions as option}
									<option value={option}>{option}h</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

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
