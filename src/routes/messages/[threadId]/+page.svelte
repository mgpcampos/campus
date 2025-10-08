<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/pocketbase';
	import MessageTimeline from '$lib/components/messaging/MessageTimeline.svelte';
	import MessageComposer from '$lib/components/messaging/MessageComposer.svelte';
	import FlagDialog from '$lib/components/messaging/FlagDialog.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { ArrowLeft, Lock, Users, User, AlertCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { MessageWithDetails } from '$types/messaging';

	let { data }: { data: PageData } = $props();

	let messages = $state<MessageWithDetails[]>(data.messages);
	let flagDialogOpen = $state(false);
	let selectedMessageId = $state<string | null>(null);
	let messageTimelineElement = $state<HTMLDivElement | null>(null);

	// Set up realtime updates
	$effect(() => {
		if (!data.thread) return;

		// Poll for new messages every 5 seconds
		// In a production app, you'd use WebSockets or SSE
		const interval = setInterval(async () => {
			try {
				const response = await fetch(`/api/threads/${data.thread!.id}/messages?page=1&perPage=100`);
				if (response.ok) {
					const newData = await response.json();
					messages = newData.items;

					// Scroll to bottom if user is near the bottom
					if (messageTimelineElement) {
						const { scrollTop, scrollHeight, clientHeight } = messageTimelineElement;
						const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

						if (isNearBottom) {
							setTimeout(() => {
								messageTimelineElement?.scrollTo({ top: scrollHeight, behavior: 'smooth' });
							}, 100);
						}
					}
				}
			} catch (error) {
				console.error('Failed to refresh messages:', error);
			}
		}, 5000);

		return () => clearInterval(interval);
	});

	// Scroll to bottom on initial load
	$effect(() => {
		if (messageTimelineElement && messages.length > 0) {
			setTimeout(() => {
				messageTimelineElement?.scrollTo({
					top: messageTimelineElement.scrollHeight,
					behavior: 'auto'
				});
			}, 100);
		}
	});

	function handleFlagMessage(messageId: string) {
		selectedMessageId = messageId;
		flagDialogOpen = true;
	}

	async function handleMessageSent() {
		// Refresh messages
		try {
			const response = await fetch(`/api/threads/${data.thread!.id}/messages?page=1&perPage=100`);
			if (response.ok) {
				const newData = await response.json();
				messages = newData.items;

				// Scroll to bottom
				setTimeout(() => {
					if (messageTimelineElement) {
						messageTimelineElement.scrollTo({
							top: messageTimelineElement.scrollHeight,
							behavior: 'smooth'
						});
					}
				}, 100);
			}
		} catch (error) {
			console.error('Failed to refresh messages:', error);
		}
	}

	function handleFlagSubmitted() {
		// Refresh messages to show updated status
		handleMessageSent();
	}

	function getThreadTitle(): string {
		if (!data.thread || !$currentUser) return 'Unknown';

		if (data.thread.type === 'group' && data.thread.name) {
			return data.thread.name;
		}

		// For direct messages, show the other participant's name
		const otherMember = data.thread.expand?.members?.find(
			(m: { id: string; name?: string; email?: string }) => m.id !== $currentUser.id
		);
		return otherMember?.name || 'Unknown User';
	}

	const isLocked = $derived(data.thread?.moderationStatus === 'locked');
</script>

<svelte:head>
	<title>{getThreadTitle()} - Messages - Campus</title>
</svelte:head>

<div class="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col py-4">
	<!-- Header -->
	<header class="mb-4 flex items-center gap-4 border-b border-border pb-4">
		<Button
			variant="ghost"
			size="sm"
			onclick={() => goto('/messages')}
			aria-label="Back to messages"
		>
			<ArrowLeft class="h-4 w-4" aria-hidden="true" />
		</Button>

		<div class="flex flex-1 items-center gap-3">
			<div
				class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
			>
				{#if data.thread?.type === 'group'}
					<Users class="h-5 w-5" aria-hidden="true" />
				{:else}
					<User class="h-5 w-5" aria-hidden="true" />
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<h1 class="truncate text-lg font-semibold">{getThreadTitle()}</h1>
				<div class="flex items-center gap-2">
					{#if data.thread?.type === 'group'}
						<p class="text-sm text-muted-foreground">
							{data.thread.expand?.members?.length || 0} members
						</p>
					{/if}
					{#if isLocked}
						<Badge variant="destructive" class="text-xs">
							<Lock class="mr-1 h-3 w-3" aria-hidden="true" />
							Locked
						</Badge>
					{/if}
				</div>
			</div>
		</div>
	</header>

	{#if data.error}
		<Card.Root class="border-destructive">
			<Card.Content class="flex items-center gap-3 py-6">
				<AlertCircle class="h-5 w-5 text-destructive" aria-hidden="true" />
				<div>
					<p class="font-semibold text-destructive">Error loading conversation</p>
					<p class="text-sm text-muted-foreground">{data.error}</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if !$currentUser}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-muted-foreground">Please sign in to view this conversation</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Messages container -->
		<div
			bind:this={messageTimelineElement}
			class="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4"
		>
			<MessageTimeline
				{messages}
				currentUserId={$currentUser.id}
				onFlagMessage={handleFlagMessage}
			/>
		</div>

		<!-- Composer -->
		<div class="mt-4">
			{#if isLocked}
				<Card.Root class="border-destructive/50 bg-destructive/5">
					<Card.Content class="flex items-center gap-3 py-4">
						<Lock class="h-5 w-5 text-destructive" aria-hidden="true" />
						<div>
							<p class="font-semibold text-destructive">This conversation is locked</p>
							<p class="text-sm text-muted-foreground">
								A moderator has locked this conversation. No new messages can be sent.
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Content class="p-4">
						<MessageComposer
							threadId={data.thread!.id}
							disabled={isLocked}
							onMessageSent={handleMessageSent}
						/>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{/if}
</div>

<!-- Flag Dialog -->
{#if selectedMessageId}
	<FlagDialog
		messageId={selectedMessageId}
		open={flagDialogOpen}
		onOpenChange={(open) => (flagDialogOpen = open)}
		onFlagSubmitted={handleFlagSubmitted}
	/>
{/if}
