<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	type SpaceListItem = {
		id: string;
		name?: string;
		description?: string;
		memberCount?: number | null;
		memberCountHidden?: boolean;
	};

	const spaces = data.spaces as { items: SpaceListItem[] };
	const search = data.search;
	const numberFormatter = new Intl.NumberFormat();

	function formatMemberCount(space: SpaceListItem) {
		if (space.memberCountHidden) return 'Hidden';
		if (typeof space.memberCount === 'number') {
			return numberFormatter.format(space.memberCount);
		}
		return '0';
	}
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
			<div class="mt-1 text-xs">Members: {formatMemberCount(space)}</div>
		</li>
	{/each}
</ul>
