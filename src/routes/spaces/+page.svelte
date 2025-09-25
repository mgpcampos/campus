<script>
	/** @type {{ spaces: { items: Array<any> }, search: string }} */
	export let data;
	// Cast items to include expected properties for template assistance
	const spaces =
		/** @type {{ items: Array<{ id:string; name?:string; description?:string; memberCount?:number }>}} */ (
			data.spaces
		);
	const search = data.search;
</script>

<h1 class="mb-4 text-2xl font-bold">Spaces</h1>
<form method="GET" class="mb-4 flex gap-2">
	<input
		type="text"
		name="q"
		placeholder="Search"
		value={search}
		class="rounded border px-2 py-1"
	/>
	<button class="rounded bg-blue-600 px-3 py-1 text-white" type="submit">Search</button>
	<a href="/spaces/create" class="ml-auto rounded bg-green-600 px-3 py-1 text-white">Create Space</a
	>
</form>

<ul class="space-y-3">
	{#each spaces.items as space}
		<li class="rounded border p-3">
			<a class="font-semibold" href={`/spaces/${space.id}`}>{space.name}</a>
			<div class="text-sm text-gray-600">{space.description}</div>
			<div class="mt-1 text-xs">Members: {space.memberCount}</div>
		</li>
	{/each}
</ul>
