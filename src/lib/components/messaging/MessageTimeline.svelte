<script lang="ts">
import { AlertCircle, Download, FileText, Flag, Loader2 } from '@lucide/svelte'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '$lib/components/ui/badge/index.js'
import { Button } from '$lib/components/ui/button/index.js'
import * as Card from '$lib/components/ui/card/index.js'
import type { MessageWithDetails } from '$types/messaging'

interface Props {
	messages: MessageWithDetails[]
	currentUserId: string
	onFlagMessage?: (messageId: string) => void
	loading?: boolean
	error?: string | null
}

let { messages, currentUserId, onFlagMessage, loading = false, error = null }: Props = $props()

function formatTimestamp(dateString: string): string {
	try {
		const date = new Date(dateString)
		const now = new Date()
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

		if (diffInHours < 24) {
			return formatDistanceToNow(date, { addSuffix: true })
		}

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	} catch {
		return 'recently'
	}
}

function getAttachmentIcon(filename: string) {
	const ext = filename.split('.').pop()?.toLowerCase()
	// Could expand with more specific icons per file type
	return FileText
}

function getAttachmentUrl(messageId: string, filename: string): string {
	// PocketBase file URL pattern
	return `/api/files/messages/${messageId}/${filename}`
}

function getMessageStatus(status: string): {
	label: string
	variant: 'default' | 'destructive' | 'secondary'
} {
	switch (status) {
		case 'visible':
			return { label: '', variant: 'default' }
		case 'pending_review':
			return { label: 'Under review', variant: 'secondary' }
		case 'removed':
			return { label: 'Removed', variant: 'destructive' }
		default:
			return { label: status, variant: 'default' }
	}
}
</script>

<div class="flex flex-col space-y-4" role="log" aria-live="polite" aria-label="Messages">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
			<span class="sr-only">Loading messages...</span>
		</div>
	{:else if error}
		<Card.Root class="border-destructive">
			<Card.Content class="flex items-center gap-3 py-6">
				<AlertCircle class="h-5 w-5 text-destructive" aria-hidden="true" />
				<div>
					<p class="font-semibold text-destructive">Error loading messages</p>
					<p class="text-sm text-muted-foreground">{error}</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if messages.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-muted-foreground">No messages yet</p>
				<p class="mt-2 text-sm text-muted-foreground">Start the conversation below</p>
			</Card.Content>
		</Card.Root>
	{:else}
		{#each messages as message (message.id)}
			{@const isOwnMessage = message.author === currentUserId}
			{@const statusInfo = getMessageStatus(message.status)}

			<div
				class="flex {isOwnMessage ? 'justify-end' : 'justify-start'}"
				role="article"
				aria-label="Message from {message.expand?.author?.name || 'Unknown'}"
			>
				<Card.Root
					class="max-w-[85%] {isOwnMessage
						? 'border-primary/20 bg-primary/5'
						: 'border-border bg-card'} {message.status === 'removed' ? 'opacity-60' : ''}"
				>
					<Card.Content class="p-4">
						{#if !isOwnMessage}
							<div class="mb-2 flex items-center justify-between gap-2">
								<p class="text-sm font-semibold">
									{message.expand?.author?.name || 'Unknown User'}
								</p>
								<time class="text-xs text-muted-foreground" datetime={message.created}>
									{formatTimestamp(message.created)}
								</time>
							</div>
						{:else}
							<div class="mb-2 flex justify-end">
								<time class="text-xs text-muted-foreground" datetime={message.created}>
									{formatTimestamp(message.created)}
								</time>
							</div>
						{/if}

						{#if statusInfo.label}
							<Badge variant={statusInfo.variant} class="mb-2 text-xs">
								{statusInfo.label}
							</Badge>
						{/if}

						{#if message.body && message.status !== 'removed'}
							<p class="text-sm leading-relaxed break-words whitespace-pre-wrap">
								{message.body}
							</p>
						{:else if message.status === 'removed'}
							<p class="text-sm text-muted-foreground italic">
								This message has been removed by a moderator
							</p>
						{/if}

						{#if message.attachments && message.attachments.length > 0 && message.status !== 'removed'}
							<div class="mt-3 space-y-2">
								{#each message.attachments as attachment}
									<div
										class="flex items-center justify-between rounded border border-border bg-muted/50 p-2"
									>
										<div class="flex min-w-0 flex-1 items-center gap-2">
											<FileText
												class="h-4 w-4 flex-shrink-0 text-muted-foreground"
												aria-hidden="true"
											/>
											<span class="truncate text-sm">{attachment}</span>
										</div>
										<Button
											variant="ghost"
											size="sm"
											href={getAttachmentUrl(message.id, attachment)}
											download
											aria-label="Download {attachment}"
										>
											<Download class="h-4 w-4" aria-hidden="true" />
										</Button>
									</div>
								{/each}
							</div>
						{/if}

						{#if !isOwnMessage && message.status === 'visible' && onFlagMessage}
							<div class="mt-3 flex justify-end">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => onFlagMessage?.(message.id)}
									aria-label="Report this message"
								>
									<Flag class="mr-1 h-3 w-3" aria-hidden="true" />
									Report
								</Button>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		{/each}
	{/if}
</div>
