<script lang="ts">
import { onMount } from 'svelte'
import ImageAttachment from '$lib/components/media/ImageAttachment.svelte'
import { Button } from '$lib/components/ui/button/index.js'
import * as Card from '$lib/components/ui/card/index.js'
import SkeletonLoader from '$lib/components/ui/SkeletonLoader.svelte'
import { currentUser, pb } from '$lib/pocketbase.js'
import type { PostsResponse } from '$types/pocketbase'

type PostWithAttachments = PostsResponse & { attachments: string[] }

let loading = true
let error: string | null = null
let posts: PostWithAttachments[] = []

onMount(async () => {
	if (!$currentUser) {
		loading = false
		return
	}
	try {
		// Fetch posts by current user that have attachments
		const result = await pb.collection('posts').getList<PostsResponse>(1, 50, {
			filter: `author = "${$currentUser.id}" && attachments != ''`,
			sort: '-created'
		})
		// Normalize attachments: PocketBase returns string for single file, array for multiple
		posts = result.items
			.map((item) => {
				const rawAttachments = item.attachments as string[] | string | undefined
				const normalized = Array.isArray(rawAttachments)
					? rawAttachments
					: rawAttachments
						? [rawAttachments]
						: []
				return normalized.length > 0
					? ({ ...item, attachments: normalized } satisfies PostWithAttachments)
					: null
			})
			.filter((record): record is PostWithAttachments => Boolean(record))
	} catch (caught) {
		error = 'Failed to load uploads'
		console.error(caught)
	} finally {
		loading = false
	}
})
</script>

<div class="mx-auto max-w-4xl space-y-6 py-8">
	<h1 class="text-2xl font-semibold">Your Uploaded Images</h1>
	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
			<SkeletonLoader variant="card" count={6} />
		</div>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if posts.length === 0}
		<p class="text-gray-500">You haven't uploaded any images yet.</p>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each posts as post}
				{#each post.attachments as attachment}
					<Card.Root class="overflow-hidden">
						<Card.Content class="p-0">
							<ImageAttachment
								src={`${pb.baseUrl}/api/files/posts/${post.id}/${attachment}`}
								alt={post.content?.slice(0, 50) || 'Attachment'}
							/>
						</Card.Content>
						<Card.Footer class="flex items-center justify-between text-xs text-gray-500">
							<span>{new Date(post.created).toLocaleDateString()}</span>
							<Button size="sm" variant="ghost" class="text-red-500" disabled>Delete</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			{/each}
		</div>
	{/if}
</div>
