<svelte:options runes />

<script lang="ts">
	type GroupRecord = Record<string, any>;
	type GroupPost = Record<string, any>;

	let { data }: { data: Record<string, any> } = $props();
	const group = $derived.by<GroupRecord | undefined>(() => data?.group as GroupRecord | undefined);
	const memberCount = $derived.by<number | null>(() =>
		typeof data?.memberCount === 'number' ? (data.memberCount as number) : null
	);
	const member = $derived.by<boolean>(() => Boolean(data?.member));
	const postsItems = $derived.by<GroupPost[]>(() =>
		Array.isArray(data?.posts?.items) ? (data.posts.items as GroupPost[]) : []
	);
	const spaceName = $derived.by<string | null>(() => {
		const expandedSpace = (group?.expand as { space?: { name?: string } } | undefined)?.space;
		return expandedSpace?.name ?? null;
	});
	const groupName = $derived.by<string>(() => group?.name ?? 'Group');
	const groupDescription = $derived.by<string>(
		() => group?.description ?? 'No description available.'
	);
	const numberFormatter = new Intl.NumberFormat();
	const pageTitle = $derived.by<string>(() =>
		spaceName ? `${groupName} • ${spaceName} | Campus` : `${groupName} | Campus`
	);
	const displayMemberCount = $derived.by<string>(() => {
		if (memberCount === null) return 'Hidden';
		return numberFormatter.format(memberCount);
	});
	let working = $state(false);

	async function action(name: string) {
		working = true;
		const fd = new FormData();
		const res = await fetch('?/' + name, { method: 'POST', body: fd });
		if (res.ok) location.reload();
		working = false;
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="mb-6 flex items-start gap-6">
	<div>
		<h1 class="text-2xl font-bold">{groupName}</h1>
		<div class="text-gray-600">{groupDescription}</div>
		<div class="mt-1 text-sm">Members: {displayMemberCount}</div>
		<div class="mt-3 flex gap-2">
			{#if member}
				<button
					class="rounded bg-gray-300 px-3 py-1"
					disabled={working}
					onclick={() => action('leave')}>Leave</button
				>
			{:else}
				<button
					class="rounded bg-blue-600 px-3 py-1 text-white"
					disabled={working}
					onclick={() => action('join')}>Join</button
				>
			{/if}
		</div>
	</div>
</div>

<section>
	<h2 class="mb-3 text-xl font-semibold">Posts</h2>
	<ul class="space-y-3">
		{#each postsItems as post}
			<li class="rounded border p-3">
				<div class="text-sm text-gray-500">{new Date(post.created).toLocaleString()}</div>
				<div>{post.content}</div>
			</li>
		{/each}
	</ul>
</section>
