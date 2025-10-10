<svelte:options runes />

<script lang="ts">
	import { invalidate } from '$app/navigation';

	interface SpaceGroupPermissions {
		canCreateGroups?: boolean;
		isMember?: boolean;
		isOwner?: boolean;
		isModerator?: boolean;
		membershipRole?: string | null;
	}

	let { data }: { data: Record<string, any> } = $props();
	const spaceLinkId = $derived.by(() => (data?.space?.slug ?? data?.space?.id ?? '') as string);
	const spaceDisplayName = $derived.by(() => (data?.space?.name ?? spaceLinkId) || 'this space');
	const groupItems = $derived.by(
		() => (Array.isArray(data?.groups?.items) ? data.groups.items : []) as any[]
	);
	const search = $derived.by(() => (data?.search ?? '').toString());
	const permissions = $derived.by(
		() => (data?.permissions ?? null) as SpaceGroupPermissions | null
	);
	const pageTitle = $derived.by(() => `${spaceDisplayName} Groups | Campus`);

	let creating = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	async function createGroupAction(e: SubmitEvent) {
		e.preventDefault();
		if (creating) return;
		if (!permissions?.canCreateGroups) {
			error = 'You need to join this space before creating a group.';
			success = null;
			return;
		}
		creating = true;
		error = null;
		success = null;
		const formEl = e.target instanceof HTMLFormElement ? e.target : undefined;
		const fd = new FormData(formEl);
		try {
			const res = await fetch('?/create', { method: 'POST', body: fd });
			if (!res.ok) {
				const payload = await res.json().catch(() => null);
				throw new Error(payload?.error ?? 'Failed to create group');
			}
			const payload = await res.json().catch(() => null);
			formEl?.reset();
			await invalidate('app:groups');
			success = payload?.message ?? 'Group created successfully.';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create group';
			success = null;
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Groups in {spaceDisplayName}</h1>

<!-- Search groups -->
<form method="GET" class="mb-6 flex items-center gap-2">
	<input
		type="text"
		name="q"
		placeholder="Search groups..."
		value={search ?? ''}
		class="flex-1 rounded border px-2 py-1 text-sm"
	/>
	<button class="rounded bg-gray-200 px-3 py-1 text-sm" type="submit">Search</button>
	{#if search}
		<a href="." class="text-xs text-blue-600 underline">Clear</a>
	{/if}
</form>

<form onsubmit={createGroupAction} class="mb-6 space-y-2 rounded border p-4">
	<div>
		<label class="block text-sm font-medium" for="group_name">Name</label>
		<input
			id="group_name"
			name="name"
			class="w-full rounded border px-2 py-1"
			required
			disabled={creating || !permissions?.canCreateGroups}
		/>
	</div>
	<div>
		<label class="block text-sm font-medium" for="group_description">Description</label>
		<textarea
			id="group_description"
			name="description"
			class="w-full rounded border px-2 py-1"
			rows="2"
			disabled={creating || !permissions?.canCreateGroups}
		></textarea>
	</div>
	<label class="inline-flex items-center gap-2 text-sm">
		<input
			type="checkbox"
			name="isPublic"
			checked
			disabled={creating || !permissions?.canCreateGroups}
		/>
		Public
	</label>
	<div class="flex flex-col gap-2">
		<button
			class="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-60"
			disabled={creating || !permissions?.canCreateGroups}
			>{creating ? 'Creating…' : 'Create Group'}</button
		>
		{#if error}
			<p class="text-sm text-red-600">{error}</p>
		{/if}
		{#if success}
			<p class="text-sm text-green-600">{success}</p>
		{/if}
		{#if !permissions?.canCreateGroups}
			<p class="text-sm text-muted-foreground">
				You need to join this space before creating a group.
			</p>
		{/if}
	</div>
</form>

<ul class="space-y-3">
	{#if groupItems.length === 0}
		<li class="rounded border border-dashed p-6 text-center text-sm text-gray-500">
			No groups yet. Be the first to create one!
		</li>
	{:else}
		{#each groupItems as group}
			<li class="flex items-center justify-between rounded border p-3">
				<div>
					<div class="font-medium">{group.name}</div>
					<div class="text-sm text-gray-600">{group.description}</div>
				</div>
				<a
					class="text-sm text-blue-600"
					href={spaceLinkId ? `/spaces/${spaceLinkId}/groups/${group.id}` : `#group-${group.id}`}
					>View</a
				>
			</li>
		{/each}
	{/if}
</ul>
