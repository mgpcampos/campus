<script lang="ts">
	import { Users, Search } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	let { data }: { data: any } = $props();

	let searchQuery = $state('');

	const filteredGroups = $derived.by(() => {
		if (!searchQuery) return data.groups;
		const query = searchQuery.toLowerCase();
		return data.groups.filter(
			(group: any) =>
				group.name?.toLowerCase().includes(query) ||
				group.description?.toLowerCase().includes(query) ||
				group.expand?.space?.name?.toLowerCase().includes(query)
		);
	});
</script>

<svelte:head>
	<title>Groups | Campus</title>
	<meta name="description" content="Discover and join groups across all spaces" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6">
		<h1 class="mb-2 text-3xl font-bold">Groups</h1>
		<p class="text-muted-foreground">Discover and join groups across all spaces</p>
	</div>

	<!-- Search Bar -->
	<div class="mb-6">
		<div class="relative">
			<Search class="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Search groups..."
				aria-label="Search groups"
				bind:value={searchQuery}
				class="pl-10"
			/>
		</div>
	</div>

	<!-- Groups Grid -->
	{#if filteredGroups.length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<Users class="mb-4 h-16 w-16 text-muted-foreground" />
			<h2 class="mb-2 text-xl font-semibold">No groups found</h2>
			<p class="mb-4 text-muted-foreground">
				{searchQuery ? 'Try adjusting your search query' : 'Join a space to access groups'}
			</p>
			<Button href="/spaces">Browse Spaces</Button>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredGroups as group}
				{@const space = group.expand?.space}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header>
						<Card.Title class="flex items-start justify-between gap-2">
							<a
								href={space ? `/spaces/${space.slug}/groups/${group.id}` : '#'}
								class="line-clamp-1 hover:text-primary"
							>
								{group.name}
							</a>
							{#if group.isPublic}
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
								>
									Public
								</span>
							{:else}
								<span
									class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
								>
									Private
								</span>
							{/if}
						</Card.Title>
						{#if space}
							<Card.Description>
								<a href="/spaces/{space.slug}" class="text-sm hover:text-primary">
									in {space.name}
								</a>
							</Card.Description>
						{/if}
					</Card.Header>
					{#if group.description}
						<Card.Content>
							<p class="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
						</Card.Content>
					{/if}
					<Card.Footer>
						<Button
							href={space ? `/spaces/${space.slug}/groups/${group.id}` : '#'}
							variant="outline"
							size="sm"
							class="w-full"
						>
							View Group
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>

		<!-- Pagination info -->
		{#if data.totalPages > 1}
			<div class="mt-6 text-center text-sm text-muted-foreground">
				Showing {data.groups.length} of {data.total} groups
			</div>
		{/if}
	{/if}
</div>
