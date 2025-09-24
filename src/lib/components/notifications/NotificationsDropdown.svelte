<script lang="ts">
  import { notifications, unreadCount, describeNotification, markAllRead, markRead, subscribeNotifications } from '$lib/services/notificationClient';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Bell } from 'lucide-svelte';
  import { pb, currentUser } from '$lib/pocketbase.js';
  
  let open = false;
  onMount(() => { subscribeNotifications(); });

  function handleOpenChange(v: boolean){ open = v; }
</script>

<DropdownMenu.Root {open}>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
    <button {...props} type="button" class="relative inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-2 hover:bg-gray-100" aria-label="Notifications" aria-haspopup="true" aria-expanded={open} >
      <Bell size={18} />
      {#if $unreadCount > 0}
        <span class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">{$unreadCount}</span>
      {/if}
    </button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-80 max-h-96 overflow-y-auto">
    <div class="flex items-center justify-between px-2 py-1 border-b mb-1">
      <span class="text-sm font-semibold">Notifications</span>
      {#if $unreadCount > 0}
        <button class="text-xs text-blue-600 hover:underline" on:click={() => markAllRead()}>Mark all read</button>
      {/if}
    </div>
    {#if $notifications.length === 0}
      <div class="p-3 text-sm text-gray-500">No notifications yet</div>
    {:else}
      {#each $notifications as n (n.id)}
        <button type="button" class="w-full text-left px-2 py-2 text-sm flex items-start space-x-2 hover:bg-gray-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 {n.read ? 'opacity-70' : ''}" on:click={() => markRead(n.id)}>
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
