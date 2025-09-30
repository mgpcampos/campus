<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import PostForm from '$lib/components/forms/PostForm.svelte';
	import Feed from '$lib/components/feed/Feed.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { MessageSquare, Users, Plus } from 'lucide-svelte';

	let feedComponent: any;
	let refreshTrigger = 0;

	// Feed discovery controls
	let feedSearch: string = '';
	let feedSort: 'new' | 'top' | 'trending' = 'new';
	let timeframeHours: number = 48;

	const trendingOptions = [6, 12, 24, 48, 72] as const;

	// Simple debounce for search input
	let searchDebounce: any;
	function handleSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			feedSearch = value.trim();
		}, 250);
	}

	function changeSort(s: 'new' | 'top' | 'trending') {
		feedSort = s;
	}

	function changeTimeframe(e: Event) {
		const v = Number((e.target as HTMLSelectElement).value);
		timeframeHours = v;
	}

	function handlePostCreated(event: CustomEvent) {
		const newPost = event.detail;
		// Add the new post to the feed
		if (feedComponent) {
			feedComponent.addPost(newPost);
		}
		// Trigger a refresh to get updated data from server
		refreshTrigger++;
	}
</script>

<div class="mx-auto max-w-4xl space-y-6 py-6 sm:py-8">
	{#if $currentUser}
		<!-- Post creation form -->
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title class="text-lg">Share an update</Card.Title>
			</Card.Header>
			<Card.Content>
				<PostForm on:postCreated={handlePostCreated} />
			</Card.Content>
		</Card.Root>

		<!-- Global feed -->
		<div class="space-y-6">
			<Card.Root class="border border-border/60 bg-card/90 shadow-md">
				<Card.Header class="gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="space-y-1 text-left sm:text-left">
						<Card.Title class="text-2xl">Global Feed</Card.Title>
						<Card.Description>
							Stay up to date with what the Campus community is sharing right now.
						</Card.Description>
					</div>
					<Card.Action class="sm:justify-self-end">
						<Button href="/spaces" variant="secondary" size="sm">
							<Users size={16} class="mr-1" />
							Browse Spaces
						</Button>
					</Card.Action>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="flex flex-col gap-2 sm:max-w-sm">
						<Label class="text-muted-foreground" for="feed-search">Search posts</Label>
						<Input
							id="feed-search"
							type="search"
							placeholder="Search by keyword"
							autocomplete="off"
							oninput={handleSearchInput}
						/>
					</div>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div class="inline-flex rounded-lg border border-input bg-background p-1 shadow-xs">
							<Button
								variant={feedSort === 'new' ? 'default' : 'ghost'}
								size="sm"
								onclick={() => changeSort('new')}
								aria-pressed={feedSort === 'new'}
								class="px-3"
							>
								<MessageSquare size={16} class="mr-2" />
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
								<Label class="text-muted-foreground" for="timeframe-select">Trending window</Label>
								<select
									id="timeframe-select"
									class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
									onchange={changeTimeframe}
									aria-label="Trending timeframe"
									bind:value={timeframeHours}
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
				on:like={(e) => console.log('Like:', e.detail)}
				on:comment={(e) => console.log('Comment:', e.detail)}
				on:edit={(e) => console.log('Edit:', e.detail)}
				on:delete={(e) => console.log('Delete:', e.detail)}
			/>
		</div>
	{:else}
		<Card.Root class="mx-auto max-w-2xl">
			<Card.Header class="text-center">
				<Card.Title class="text-2xl">Get Started</Card.Title>
				<Card.Description class="text-lg">
					Join the Campus community to connect with peers and share updates.
				</Card.Description>
			</Card.Header>
			<Card.Footer class="flex justify-center space-x-4">
				<Button href="/auth/register" size="lg">Sign Up</Button>
				<Button href="/auth/login" variant="outline" size="lg">Sign In</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
