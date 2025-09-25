<script>
	export let data;
	let { group, memberCount, membershipRole, member, posts } = data;
	// Derive postsItems with loose typing to satisfy svelte-check without structural assert
	const postsItems = /** @type {any} */ (posts)?.items || [];
	let working = false;
	/** @param {string} name */
	async function action(name) {
		working = true;
		const fd = new FormData();
		const res = await fetch('?/' + name, { method: 'POST', body: fd });
		if (res.ok) location.reload();
		working = false;
	}
</script>

<div class="mb-6 flex items-start gap-6">
	<div>
		<h1 class="text-2xl font-bold">{group.name}</h1>
		<div class="text-gray-600">{group.description}</div>
		<div class="mt-1 text-sm">Members: {memberCount}</div>
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
