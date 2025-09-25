<script lang="ts">
	import {
		notifications,
		unreadCount,
		describeNotification,
		markAllRead,
		markRead,
		subscribeNotifications
	} from '$lib/services/notificationClient';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Bell } from 'lucide-svelte';
	import { pb, currentUser } from '$lib/pocketbase.js';

	let open = false;
	onMount(() => {
		subscribeNotifications();
	});

	function handleOpenChange(v: boolean) {
		open = v;
	}
</script>

<DropdownMenu.Root {open}>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				aria-label="Notifications"
				aria-haspopup="true"
				aria-expanded={open}
			>
				<Bell size={18} />
				{#if $unreadCount > 0}
					<span
						class="absolute -top-1 -right-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none text-white"
						>{$unreadCount}</span
					>
				{/if}
			</button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="max-h-96 w-80 overflow-y-auto">
		<div class="mb-1 flex items-center justify-between border-b px-2 py-1">
			<span class="text-sm font-semibold">Notifications</span>
			{#if $unreadCount > 0}
				<button class="text-xs text-blue-600 hover:underline" onclick={() => markAllRead()}
					>Mark all read</button
				>
			{/if}
		</div>
		{#if $notifications.length === 0}
			<div class="p-3 text-sm text-gray-500">No notifications yet</div>
		{:else}
			{#each $notifications as n (n.id)}
				<button
					type="button"
					class="flex w-full items-start space-x-2 rounded px-2 py-2 text-left text-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none {n.read
						? 'opacity-70'
						: ''}"
					onclick={() => markRead(n.id)}
				>
					<span class="sr-only">Notification</span>
					<div class="flex-1">
						<p class="leading-snug">{describeNotification(n)}</p>
					</div>
				</button>
			{/each}
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>

<style>
</style>
