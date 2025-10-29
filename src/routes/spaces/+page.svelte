<svelte:options runes />

<script lang="ts">
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Plus, Search, Users } from 'lucide-svelte';

	type SpaceListItem = {
		id: string;
		slug?: string;
		name?: string;
		description?: string;
		memberCount?: number | null;
		memberCountHidden?: boolean;
		avatar?: string;
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

	function getAvatarUrl(space: SpaceListItem) {
		if (space.avatar) {
			return `/api/files/spaces/${space.id}/${space.avatar}`;
		}
		return null;
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">{t('spaces.heading')}</h1>
		<Button href="/spaces/create">
			<Plus class="mr-2 h-4 w-4" />
			Create Space
		</Button>
	</div>

	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<form method="GET" class="flex gap-2" role="search" aria-label="Space search">
				<div class="relative flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						name="q"
						placeholder={t('spaces.searchPlaceholder')}
						value={search}
						class="pl-9"
					/>
				</div>
				<Button type="submit">{t('spaces.searchButton')}</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if hasNoResults}
		<Card.Root class="border-dashed">
			<Card.Content class="py-12 text-center">
				<p class="text-sm text-muted-foreground">
					{#if search.trim().length > 0}
						{t('spaces.noResultsFor', { query: search })}
					{:else}
						{@html t('spaces.noSpaces')}
					{/if}
				</p>
				{#if search.trim().length === 0}
					<Button href="/spaces/create" class="mt-4">
						<Plus class="mr-2 h-4 w-4" />
						Create the first space
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-3">
			{#each filteredSpaces as space}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Content class="p-4">
						<a href={`/spaces/${space.slug ?? space.id}`} class="flex items-start gap-4">
							{#if getAvatarUrl(space)}
								<img
									src={getAvatarUrl(space)}
									alt={space.name}
									class="h-12 w-12 rounded-full object-cover"
								/>
							{:else}
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
								>
									<span class="font-bold">
										{(space.name ?? space.slug ?? 'S').charAt(0).toUpperCase()}
									</span>
								</div>
							{/if}

							<div class="min-w-0 flex-1">
								<h3 class="text-lg font-semibold">
									{space.name ?? space.slug ?? space.id}
								</h3>
								{#if space.description}
									<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
										{space.description}
									</p>
								{/if}
								<div class="mt-2">
									<Badge variant="secondary" class="flex w-fit items-center gap-1">
										<Users class="h-3 w-3" />
										{formatMemberCount(space)}
										{formatMemberCount(space) === '1' ? 'member' : 'members'}
									</Badge>
								</div>
							</div>
						</a>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
