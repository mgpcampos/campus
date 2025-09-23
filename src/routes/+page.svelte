<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import PostForm from '$lib/components/forms/PostForm.svelte';
	import Feed from '$lib/components/feed/Feed.svelte';
	import { MessageSquare, Users, Plus } from 'lucide-svelte';

	let feedComponent: any;
	let refreshTrigger = 0;

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
				<div class="flex space-x-2">
					<Button variant="outline" size="sm">
						<MessageSquare size={16} class="mr-1" />
						Latest
					</Button>
					<Button href="/spaces" variant="outline" size="sm">
						<Users size={16} class="mr-1" />
						Browse Spaces
					</Button>
				</div>
			</div>
			
			<Feed 
				bind:this={feedComponent}
				scope="global" 
				{refreshTrigger}
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
