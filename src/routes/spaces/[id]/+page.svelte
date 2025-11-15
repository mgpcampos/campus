<svelte:options runes />

<script lang="ts">
	import { Globe, Lock, Settings, Users } from 'lucide-svelte'
	import type { FeedPostList } from '$lib/components/feed/types.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { t } from '$lib/i18n'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
	let { space, memberCount, membershipRole, member, postsRestricted = false } = data
	const posts = data.posts as FeedPostList

	let joining = $state(false)

	async function join(e: SubmitEvent) {
		e.preventDefault()
		joining = true
		const fd = new FormData()
		const res = await fetch('?/join', { method: 'POST', body: fd })
		if (res.ok) location.reload()
		joining = false
	}

	async function leave(e: SubmitEvent) {
		e.preventDefault()
		joining = true
		const fd = new FormData()
		const res = await fetch('?/leave', { method: 'POST', body: fd })
		if (res.ok) location.reload()
		joining = false
	}

	let avatarUrl = $derived(space.avatar ? `/api/files/spaces/${space.id}/${space.avatar}` : null)
</script>

<svelte:head>
	<title>{space.name} | Campus</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<div class="flex items-start gap-6">
				{#if avatarUrl}
					<img src={avatarUrl} alt={space.name} class="h-24 w-24 rounded-full object-cover" />
				{:else}
					<div
						class="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground"
					>
						<span class="text-2xl font-bold">
							{space.name.charAt(0).toUpperCase()}
						</span>
					</div>
				{/if}

				<div class="flex-1">
					<div class="flex items-start justify-between">
						<div>
							<h1 class="text-3xl font-bold">{space.name}</h1>
							{#if space.description}
								<p class="mt-2 text-muted-foreground">{space.description}</p>
							{/if}
						</div>
					</div>

					<div class="mt-4 flex flex-wrap items-center gap-3">
						<Badge variant="secondary" class="flex items-center gap-1">
							<Users class="h-3 w-3" />
							{memberCount === null
								? 'Hidden'
								: `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
						</Badge>

						{#if space.isPublic}
							<Badge variant="outline" class="flex items-center gap-1">
								<Globe class="h-3 w-3" />
								Public
							</Badge>
						{:else}
							<Badge variant="outline" class="flex items-center gap-1">
								<Lock class="h-3 w-3" />
								Private
							</Badge>
						{/if}

						{#if membershipRole}
							<Badge variant="default">
								{membershipRole}
							</Badge>
						{/if}
					</div>

					<div class="mt-4 flex gap-2">
						{#if member}
							<form onsubmit={leave}>
								<Button type="submit" variant="outline" disabled={joining}>
									{t('spaceDetail.leaveButton')}
								</Button>
							</form>
						{:else}
							<form onsubmit={join}>
								<Button type="submit" disabled={joining}>
									{t('spaceDetail.joinButton')}
								</Button>
							</form>
						{/if}

						{#if membershipRole === 'owner' || membershipRole === 'moderator'}
							<Button variant="secondary" href={`/spaces/${space.slug || space.id}/manage`}>
								<Settings class="mr-2 h-4 w-4" />
								{t('spaceDetail.manageButton')}
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<section>
		<h2 class="mb-3 text-xl font-semibold">{t('spaceDetail.postsHeading')}</h2>
		{#if posts.items.length === 0}
			<div class="rounded border border-dashed p-6 text-center text-sm text-gray-500">
				{#if postsRestricted}
					{t('spaces.joinPrompt')}
				{:else}
					{t('spaces.emptyPosts')}
				{/if}
			</div>
		{:else}
			<ul class="space-y-3">
				{#each posts.items as post}
					<li class="rounded border p-3">
						<div class="text-sm text-gray-500">{new Date(post.created).toLocaleString()}</div>
						<div>{post.content}</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
