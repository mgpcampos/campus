<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser, pb } from '$lib/pocketbase.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ImageAttachment from '$lib/components/media/ImageAttachment.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Loader2 } from 'lucide-svelte';

	let loading = true;
	let error: string | null = null;
	let posts: any[] = [];

	onMount(async () => {
		if (!$currentUser) { loading = false; return; }
		try {
			// Fetch posts by current user that have attachments
			const result = await pb.collection('posts').getList(1, 50, { filter: `author = "${$currentUser.id}" && attachments != ''`, sort: '-created' });
			posts = result.items.filter(p => Array.isArray(p.attachments) && p.attachments.length > 0);
		} catch (e:any) {
			error = 'Failed to load uploads';
			console.error(e);
		} finally { loading = false; }
	});
</script>

<div class="max-w-4xl mx-auto py-8 space-y-6">
	<h1 class="text-2xl font-semibold">Your Uploaded Images</h1>
	{#if loading}
		<div class="flex items-center space-x-2 text-gray-600"><Loader2 class="animate-spin" size={18}/> <span>Loading...</span></div>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if posts.length === 0}
		<p class="text-gray-500">You haven't uploaded any images yet.</p>
	{:else}
		<div class="grid md:grid-cols-3 sm:grid-cols-2 gap-4">
			{#each posts as post}
				{#each post.attachments as attachment}
					<Card.Root class="overflow-hidden">
						<Card.Content class="p-0">
							<ImageAttachment src={`${pb.baseUrl}/api/files/posts/${post.id}/${attachment}`} alt={post.content?.slice(0,50) || 'Attachment'} />
						</Card.Content>
						<Card.Footer class="flex justify-between items-center text-xs text-gray-500">
							<span>{new Date(post.created).toLocaleDateString()}</span>
							<Button size="sm" variant="ghost" class="text-red-500" disabled>Delete</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			{/each}
		</div>
	{/if}
</div>
