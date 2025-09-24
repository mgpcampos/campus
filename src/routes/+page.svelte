<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import PostForm from '$lib/components/forms/PostForm.svelte';
	import Feed from '$lib/components/feed/Feed.svelte';
	import { MessageSquare, Users, Plus } from 'lucide-svelte';

	let feedComponent: any;
	let refreshTrigger = 0;

// Feed discovery controls
let feedSearch: string = '';
let feedSort: 'new' | 'top' | 'trending' = 'new';
let timeframeHours: number = 48;

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

<div class="max-w-4xl mx-auto py-8">
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-4" style="color: #1e293b;">Welcome to Campus</h1>
		<p class="text-xl" style="color: #64748b;">
			A lightweight social network designed for the education community
		</p>
	</div>
	
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
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold">Global Feed</h2>
<div class="flex flex-wrap gap-2 items-center">
  <!-- Search -->
  <input
    type="text"
    placeholder="Search posts..."
    class="border px-2 py-1 rounded text-sm"
    on:input={handleSearchInput}
  />

  <!-- Sort buttons -->
  <div class="flex gap-1">
    <Button
      variant={feedSort === 'new' ? 'default' : 'outline'}
      size="sm"
      on:click={() => changeSort('new')}
      aria-pressed={feedSort === 'new'}
    >
      <MessageSquare size={16} class="mr-1" />
      New
    </Button>
    <Button
      variant={feedSort === 'top' ? 'default' : 'outline'}
      size="sm"
      on:click={() => changeSort('top')}
      aria-pressed={feedSort === 'top'}
    >
      Top
    </Button>
    <Button
      variant={feedSort === 'trending' ? 'default' : 'outline'}
      size="sm"
      on:click={() => changeSort('trending')}
      aria-pressed={feedSort === 'trending'}
    >
      Trending
    </Button>
  </div>

  {#if feedSort === 'trending'}
    <select
      class="border px-2 py-1 rounded text-sm"
      on:change={changeTimeframe}
      aria-label="Trending timeframe"
      bind:value={timeframeHours}
    >
      <option value="6">6h</option>
      <option value="12">12h</option>
      <option value="24">24h</option>
      <option value="48">48h</option>
      <option value="72">72h</option>
    </select>
  {/if}

  <Button href="/spaces" variant="outline" size="sm" class="ml-auto">
    <Users size={16} class="mr-1" />
    Browse Spaces
  </Button>
</div>
			</div>
			
<Feed
  bind:this={feedComponent}
  scope="global"
  {refreshTrigger}
  q={feedSearch}
  sort={feedSort}
  timeframeHours={timeframeHours}
  on:like={(e) => console.log('Like:', e.detail)}
  on:comment={(e) => console.log('Comment:', e.detail)}
  on:edit={(e) => console.log('Edit:', e.detail)}
  on:delete={(e) => console.log('Delete:', e.detail)}
/>
		</div>
	{:else}
		<Card.Root class="max-w-2xl mx-auto">
			<Card.Header class="text-center">
				<Card.Title class="text-2xl">Get Started</Card.Title>
				<Card.Description class="text-lg">
					Join the Campus community to connect with peers and share updates.
				</Card.Description>
			</Card.Header>
			<Card.Footer class="flex justify-center space-x-4">
				<Button href="/auth/register" size="lg">
					Sign Up
				</Button>
				<Button href="/auth/login" variant="outline" size="lg">
					Sign In
				</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
