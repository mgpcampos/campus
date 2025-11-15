<svelte:options runes />

<script lang="ts">
	import { t } from '$lib/i18n/index.js'

	type GroupRecord = {
		name?: string
		description?: string
		expand?: {
			space?: {
				name?: string
			}
		}
	} & Record<string, unknown>

	type GroupPost = {
		created?: string
		content?: string
	} & Record<string, unknown>

	type GroupPageData = {
		group?: GroupRecord
		memberCount?: number | null
		member?: boolean
		posts?: { items?: GroupPost[] }
	}

	let { data }: { data: GroupPageData } = $props()
	const group = $derived.by<GroupRecord | undefined>(() => data?.group)
	const memberCount = $derived.by<number | null>(() =>
		typeof data?.memberCount === 'number' ? data.memberCount : null
	)
	const member = $derived.by<boolean>(() => Boolean(data?.member))
	const postsItems = $derived.by<GroupPost[]>(() =>
		Array.isArray(data?.posts?.items) ? data.posts.items : []
	)
	const spaceName = $derived.by<string | null>(() => {
		const expandedSpace = group?.expand?.space
		return expandedSpace?.name ?? null
	})
	const groupName = $derived.by<string>(() => group?.name ?? 'Group')
	const groupDescription = $derived.by<string>(
		() => group?.description ?? 'No description available.'
	)
	const numberFormatter = new Intl.NumberFormat()
	const pageTitle = $derived.by<string>(() =>
		spaceName ? `${groupName} • ${spaceName} | Campus` : `${groupName} | Campus`
	)
	const displayMemberCount = $derived.by<string>(() => {
		if (memberCount === null) return 'Hidden'
		return numberFormatter.format(memberCount)
	})
	let working = $state(false)

	async function action(name: string) {
		working = true
		const fd = new FormData()
		const res = await fetch(`?/${name}`, { method: 'POST', body: fd })
		if (res.ok) location.reload()
		working = false
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="mb-6 flex items-start gap-6">
	<div>
		<h1 class="text-2xl font-bold">{groupName}</h1>
		<div class="text-gray-600">{groupDescription}</div>
		<div class="mt-1 text-sm">{t('spaces.members')}: {displayMemberCount}</div>
		<div class="mt-3 flex gap-2">
			{#if member}
				<button
					class="rounded bg-gray-300 px-3 py-1"
					disabled={working}
					onclick={() => action('leave')}>{t('groupDetail.leaveButton')}</button
				>
			{:else}
				<button
					class="rounded bg-blue-600 px-3 py-1 text-white"
					disabled={working}
					onclick={() => action('join')}>{t('groupDetail.joinButton')}</button
				>
			{/if}
		</div>
	</div>
</div>

<section>
	<h2 class="mb-3 text-xl font-semibold">{t('groupDetail.postsHeading')}</h2>
	<ul class="space-y-3">
		{#each postsItems as post}
			<li class="rounded border p-3">
				<div class="text-sm text-gray-500">
					{new Date(post.created ?? Date.now()).toLocaleString()}
				</div>
				<div>{post.content}</div>
			</li>
		{/each}
	</ul>
</section>
