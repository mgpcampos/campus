<script>
	export let data;
	let { space, groups, search } = data;
	let creating = false;

	/** @param {SubmitEvent} e */
	async function createGroupAction(e) {
		e.preventDefault();
		creating = true;
		const formEl = e.target instanceof HTMLFormElement ? e.target : undefined;
		const fd = new FormData(formEl);
		const res = await fetch('?/' + 'create', { method: 'POST', body: fd });
		if (res.ok) location.reload();
		creating = false;
	}
</script>

<h1 class="mb-4 text-2xl font-bold">Groups in {space.name}</h1>

<!-- Search groups -->
<form method="GET" class="mb-6 flex items-center gap-2">
	<input
		type="text"
		name="q"
		placeholder="Search groups..."
		value={search}
		class="flex-1 rounded border px-2 py-1 text-sm"
	/>
	<button class="rounded bg-gray-200 px-3 py-1 text-sm" type="submit">Search</button>
	{#if search}
		<a href="." class="text-xs text-blue-600 underline">Clear</a>
	{/if}
</form>

<form on:submit|preventDefault={createGroupAction} class="mb-6 space-y-2 rounded border p-4">
	<div>
		<label class="block text-sm font-medium" for="group_name">Name</label>
		<input id="group_name" name="name" class="w-full rounded border px-2 py-1" required />
	</div>
	<div>
		<label class="block text-sm font-medium" for="group_description">Description</label>
		<textarea
			id="group_description"
			name="description"
			class="w-full rounded border px-2 py-1"
			rows="2"
		></textarea>
	</div>
	<label class="inline-flex items-center gap-2 text-sm">
		<input type="checkbox" name="isPublic" checked /> Public
	</label>
	<div>
		<button class="rounded bg-blue-600 px-3 py-1 text-white" disabled={creating}
			>Create Group</button
		>
	</div>
</form>

<ul class="space-y-3">
	{#each groups.items as group}
		<li class="flex items-center justify-between rounded border p-3">
			<div>
				<div class="font-medium">{group.name}</div>
				<div class="text-sm text-gray-600">{group.description}</div>
			</div>
			<a class="text-sm text-blue-600" href={`/spaces/${space.id}/groups/${group.id}`}>View</a>
		</li>
	{/each}
</ul>
