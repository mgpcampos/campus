<script>
	/** @type {{ space:any; memberCount:number|null; membershipRole:string|null; member:boolean; posts:any; postsRestricted?:boolean }} */
	export let data;
	let { space, memberCount, membershipRole, member, postsRestricted = false } = data;
	const posts = /** @type {{ items: Array<any> }} */ (data.posts);
	let joining = false;
	/** @param {SubmitEvent} e */
	async function join(e) {
		e.preventDefault();
		joining = true;
		const fd = new FormData();
		const res = await fetch('?/' + 'join', { method: 'POST', body: fd });
		if (res.ok) location.reload();
		joining = false;
	}
	/** @param {SubmitEvent} e */
	async function leave(e) {
		e.preventDefault();
		joining = true;
		const fd = new FormData();
		const res = await fetch('?/' + 'leave', { method: 'POST', body: fd });
		if (res.ok) location.reload();
		joining = false;
	}
</script>

<svelte:head>
	<title>{space.name} | Campus</title>
</svelte:head>

<div class="mb-6 flex items-start gap-6">
	<div>
		<h1 class="text-2xl font-bold">{space.name}</h1>
		<div class="text-gray-600">{space.description}</div>
		<div class="mt-1 text-sm">
			Members: {memberCount === null ? '—' : memberCount}
		</div>
		<div class="mt-1 text-sm">
			<a class="text-blue-600 underline" href={`/spaces/${space.slug}/groups`}>View Groups</a>
		</div>
		<div class="mt-3 flex gap-2">
			{#if member}
				<form on:submit|preventDefault={leave}>
					<button class="rounded bg-gray-300 px-3 py-1" disabled={joining}>Leave</button>
				</form>
			{:else}
				<form on:submit|preventDefault={join}>
					<button class="rounded bg-blue-600 px-3 py-1 text-white" disabled={joining}>Join</button>
				</form>
			{/if}
			{#if membershipRole === 'owner' || membershipRole === 'moderator'}
				<a href={`/spaces/${space.slug}/manage`} class="rounded bg-indigo-600 px-3 py-1 text-white"
					>Manage</a
				>
			{/if}
		</div>
	</div>
</div>

<section>
	<h2 class="mb-3 text-xl font-semibold">Posts</h2>
	{#if posts.items.length === 0}
		<div class="rounded border border-dashed p-6 text-center text-sm text-gray-500">
			{#if postsRestricted}
				Join this space to see its posts.
			{:else}
				No posts yet. Be the first to contribute!
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
