<svelte:options runes />

<script lang="ts">
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

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
		normalizedSearch ? t('spaces.pageTitleWithSearch', { query: search }) : t('spaces.pageTitle')
	);

	function formatMemberCount(space: SpaceListItem) {
		if (space.memberCountHidden) return t('spaces.hidden');
		if (typeof space.memberCount === 'number') {
			return numberFormatter.format(space.memberCount);
		}
		return '0';
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">{t('spaces.heading')}</h1>
<form method="GET" class="mb-4 flex gap-2" role="search" aria-label="Space search">
	<input
		type="text"
		name="q"
		placeholder={t('spaces.searchPlaceholder')}
		value={search}
		class="rounded border px-2 py-1"
	/>
	<button class="rounded bg-blue-600 px-3 py-1 text-white" type="submit"
		>{t('spaces.searchButton')}</button
	>
</form>
{#if hasNoResults}
	<div class="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
		{#if search.trim().length > 0}
			{t('spaces.noResultsFor', { query: search })}
		{:else}
			{@html t('spaces.noSpaces')}
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
				<div class="mt-1 text-xs">{t('spaces.members')}: {formatMemberCount(space)}</div>
			</li>
		{/each}
	</ul>
{/if}
