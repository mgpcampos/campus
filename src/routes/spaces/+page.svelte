<svelte:options runes />

<script lang="ts">
	import type { PageData } from './$types';

	type SpaceListItem = {
		id: string;
		slug?: string;
		name?: string;
		description?: string;
		memberCount?: number | null;
		memberCountHidden?: boolean;
	};

	let { data }: { data: PageData } = $props();
	const numberFormatter = new Intl.NumberFormat();
	const spaces = $derived.by<SpaceListItem[]>(() => {
		const items = data.spaces?.items ?? [];
		return items as SpaceListItem[];
	});
	const search = $derived.by(() => (data.search ?? '').toString());
	const normalizedSearch = $derived.by(() => search.trim().toLowerCase());
	const filteredSpaces = $derived.by((): SpaceListItem[] => {
		const items = spaces;
		const query = normalizedSearch;
		if (!query) {
			return items;
		}
		return items.filter((space) => {
			const haystack =
				`${space.name ?? ''} ${space.slug ?? ''} ${space.description ?? ''}`.toLowerCase();
			return haystack.includes(query);
		});
	});
	const hasNoResults = $derived.by(() => filteredSpaces.length === 0);
	const pageTitle = $derived.by(() =>
		normalizedSearch ? `Spaces matching “${search}” – Campus` : 'Spaces – Campus'
	);

	function formatMemberCount(space: SpaceListItem) {
		if (space.memberCountHidden) return 'Hidden';
		if (typeof space.memberCount === 'number') {
			return numberFormatter.format(space.memberCount);
		}
		return '0';
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Spaces</h1>
<form method="GET" class="mb-4 flex gap-2" role="search" aria-label="Space search">
	<input
		type="text"
		name="q"
		placeholder="Search"
		value={search}
		class="rounded border px-2 py-1"
	/>
	<button class="rounded bg-blue-600 px-3 py-1 text-white" type="submit">Search</button>
</form>
{#if hasNoResults}
	<div class="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
		{#if search.trim().length > 0}
			No spaces matched “{search}”. Try a different keyword or create a new space.
		{:else}
			No spaces are available yet. Be the first to <a
				class="text-blue-600 underline"
				href="/spaces/create">create one</a
			>.
		{/if}
	</div>
{:else}
	<ul class="space-y-3">
		{#each filteredSpaces as space}
			<li class="rounded border p-3">
				<a class="font-semibold" href={`/spaces/${space.slug ?? space.id}`}
					>{space.name ?? space.slug ?? space.id}</a
				>
				<div class="text-sm text-gray-600">{space.description}</div>
				<div class="mt-1 text-xs">Members: {formatMemberCount(space)}</div>
			</li>
		{/each}
	</ul>
{/if}
