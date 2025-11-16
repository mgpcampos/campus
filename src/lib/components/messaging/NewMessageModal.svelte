<script lang="ts">
  // Core Svelte imports
  import { createEventDispatcher } from 'svelte';

  // Third-party library imports
  import { UserPlus, X } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  // Local/application-specific imports
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { currentUser } from '$lib/pocketbase';
  import type { User } from '$types/users';

  // Component props
  export let open: boolean = false;

  // Local component state
  let searchQuery = '';
  let searchResults: User[] = [];
  let selectedUsers: User[] = [];
  let messageBody = '';
  let isSearching = false;
  let isCreating = false;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    threadCreated: { threadId: string };
  }>();

  // Debounced search function
  let searchTimeout: ReturnType<typeof setTimeout>;
  async function searchUsers() {
    clearTimeout(searchTimeout);
    isSearching = true;
    searchTimeout = setTimeout(async () => {
      if (searchQuery.length < 2) {
        searchResults = [];
        isSearching = false;
        return;
      }
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('Failed to fetch users.');
        const data = await res.json();
        // Exclude already selected users and the current user from search results
        searchResults = data.filter(
          (user: User) =>
            !selectedUsers.find((su) => su.id === user.id) && user.id !== $currentUser?.id
        );
      } catch (error) {
        toast.error('Error searching for users.');
        console.error(error);
      } finally {
        isSearching = false;
      }
    }, 300);
  }

  function addUser(user: User) {
    selectedUsers = [...selectedUsers, user];
    searchResults = searchResults.filter((u) => u.id !== user.id);
    searchQuery = '';
  }

  function removeUser(userId: string) {
    selectedUsers = selectedUsers.filter((u) => u.id !== userId);
  }

  async function createThread() {
    if (selectedUsers.length === 0) {
      toast.info('Please select at least one user to start a conversation.');
      return;
    }
    if (!messageBody.trim()) {
      toast.info('Please enter a message to start the conversation.');
      return;
    }
    isCreating = true;
    try {
      // Step 1: Create the conversation thread
      const threadRes = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedUsers.length > 1 ? 'group' : 'direct',
          members: selectedUsers.map((u) => u.id),
          // Group name can be added here if it's a group chat
        }),
      });

      if (!threadRes.ok) throw new Error('Failed to create conversation thread.');

      const thread = await threadRes.json();

      // Step 2: Send the initial message
      const messageRes = await fetch(`/api/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: messageBody }),
      });

      if (!messageRes.ok) throw new Error('Failed to send initial message.');

      toast.success('Conversation started!');
      dispatch('threadCreated', { threadId: thread.id });
      closeModal();
    } catch (error) {
      toast.error('Error starting conversation.');
      console.error(error);
    } finally {
      isCreating = false;
    }
  }

  function closeModal() {
    // Reset state
    searchQuery = '';
    searchResults = [];
    selectedUsers = [];
    messageBody = '';
    dispatch('close');
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[525px]">
    <Dialog.Header>
      <Dialog.Title>New Message</Dialog.Title>
      <Dialog.Description>
        Start a new conversation with one or more people.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <!-- User Search and Selection -->
      <div class="space-y-2">
        <label for="user-search" class="text-sm font-medium">To:</label>
        <div class="flex flex-wrap items-center gap-2 rounded-md border p-2">
          {#each selectedUsers as user}
            <div class="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-sm">
              <span>{user.name || user.username}</span>
              <button on:click={() => removeUser(user.id)} class="text-muted-foreground hover:text-foreground">
                <X class="h-4 w-4" />
              </button>
            </div>
          {/each}
          <Input
            id="user-search"
            placeholder="Search for people..."
            class="flex-1 border-none shadow-none focus-visible:ring-0"
            bind:value={searchQuery}
            on:input={searchUsers}
          />
        </div>
        {#if isSearching}
          <p class="text-sm text-muted-foreground">Searching...</p>
        {:else if searchResults.length > 0}
          <ul class="rounded-md border">
            {#each searchResults as user}
              <li class="border-b last:border-b-0">
                <button on:click={() => addUser(user)} class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent">
                  <UserPlus class="h-4 w-4" />
                  <span>{user.name || user.username}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- Message Composer -->
      <div>
        <label for="message-body" class="sr-only">Message</label>
        <textarea
          id="message-body"
          rows="4"
          class="w-full rounded-md border p-2"
          placeholder="Write a message..."
          bind:value={messageBody}
        ></textarea>
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="ghost" on:click={closeModal}>Cancel</Button>
      <Button on:click={createThread} disabled={isCreating || selectedUsers.length === 0 || !messageBody.trim()}>
        {#if isCreating}
          Sending...
        {:else}
          Send Message
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
