<script lang="ts">
	import { Lock, MessageCircle, User, Users } from '@lucide/svelte'
	import { formatDistanceToNow } from 'date-fns'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import type { ConversationThreadRecord, ThreadWithMessages } from '$types/messaging'

	interface Props {
		threads: ThreadWithMessages[]
		currentUserId: string
		onThreadSelect: (threadId: string) => void
		selectedThreadId?: string
	}

	let { threads, currentUserId, onThreadSelect, selectedThreadId }: Props = $props()

	function getThreadTitle(thread: ThreadWithMessages, currentUserId: string): string {
		if (thread.type === 'group' && thread.name) {
			return thread.name
		}

		// For direct messages, show the other participant's name
		const otherMember = thread.expand?.members?.find(
			(m: { id: string; name?: string; email?: string }) => m.id !== currentUserId
		)
		return otherMember?.name || 'Unknown User'
	}

	function getThreadIcon(type: 'direct' | 'group') {
		return type === 'group' ? Users : User
	}

	function formatTimestamp(dateString: string): string {
		try {
			return formatDistanceToNow(new Date(dateString), { addSuffix: true })
		} catch {
			return 'recently'
		}
	}
</script>

<div class="space-y-2" role="list" aria-label="Message threads">
	{#if threads.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<MessageCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
				<p class="text-muted-foreground">No conversations yet</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Start a conversation to connect with others
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		{#each threads as thread (thread.id)}
			<Card.Root
				class="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm {selectedThreadId ===
				thread.id
					? 'border-primary bg-accent'
					: ''}"
				role="listitem"
			>
				<Button
					variant="ghost"
					class="h-auto w-full justify-start p-4 text-left"
					onclick={() => onThreadSelect(thread.id)}
					aria-label="Open conversation with {getThreadTitle(thread, currentUserId)}"
					aria-current={selectedThreadId === thread.id ? 'true' : undefined}
				>
					<div class="flex w-full items-start gap-3">
						<div class="flex-shrink-0">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
							>
								{#if thread.type === 'group'}
									<Users class="h-5 w-5" aria-hidden="true" />
								{:else}
									<User class="h-5 w-5" aria-hidden="true" />
								{/if}
							</div>
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<h3 class="truncate font-semibold text-foreground">
									{getThreadTitle(thread, currentUserId)}
								</h3>
								<span class="flex-shrink-0 text-xs text-muted-foreground">
									{formatTimestamp(thread.lastMessageAt || thread.created)}
								</span>
							</div>

							<div class="mt-1 flex items-center gap-2">
								{#if thread.moderationStatus === 'locked'}
									<Badge variant="destructive" class="text-xs">
										<Lock class="mr-1 h-3 w-3" aria-hidden="true" />
										Locked
									</Badge>
								{/if}

								{#if thread.type === 'group'}
									<span class="text-xs text-muted-foreground">
										{thread.expand?.members?.length || 0} members
									</span>
								{/if}
							</div>

							{#if thread.expand?.lastMessage}
								<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
									{#if thread.expand.lastMessage.expand?.author}
										<span class="font-medium">{thread.expand.lastMessage.expand.author.name}:</span>
									{/if}
									{thread.expand.lastMessage.body || '[Attachment]'}
								</p>
							{/if}
						</div>
					</div>
				</Button>
			</Card.Root>
		{/each}
	{/if}
</div>
