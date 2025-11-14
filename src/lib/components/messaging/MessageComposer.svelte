<script lang="ts">
import { Loader2, Paperclip, Send, X } from '@lucide/svelte'
import { toast } from 'svelte-sonner'
import { Button } from '$lib/components/ui/button/index.js'
import { Label } from '$lib/components/ui/label/index.js'
import { Textarea } from '$lib/components/ui/textarea/index.js'

interface Props {
	threadId: string
	disabled?: boolean
	onMessageSent?: () => void
}

let { threadId, disabled = false, onMessageSent }: Props = $props()

let body = $state('')
let files = $state<File[]>([])
let fileInput: HTMLInputElement | null = $state(null)
let isSubmitting = $state(false)

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function handleFileSelect(event: Event) {
	const input = event.target as HTMLInputElement
	if (!input.files) return

	const newFiles = Array.from(input.files)

	// Check file count
	if (files.length + newFiles.length > MAX_FILES) {
		toast.error(`Maximum ${MAX_FILES} files allowed`)
		return
	}

	// Check file sizes
	const oversizedFiles = newFiles.filter((f) => f.size > MAX_FILE_SIZE)
	if (oversizedFiles.length > 0) {
		toast.error(`Files must be smaller than 10MB`)
		return
	}

	files = [...files, ...newFiles]

	// Reset input so the same file can be selected again if removed
	if (fileInput) fileInput.value = ''
}

function removeFile(index: number) {
	files = files.filter((_, i) => i !== index)
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return bytes + ' B'
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
	return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function handleSubmit(event: Event) {
	event.preventDefault()

	// Validation
	const trimmedBody = body.trim()
	if (!trimmedBody && files.length === 0) {
		toast.error('Please enter a message or attach files')
		return
	}

	isSubmitting = true

	try {
		const formData = new FormData()
		if (trimmedBody) {
			formData.append('body', trimmedBody)
		}

		files.forEach((file) => {
			formData.append('attachments', file)
		})

		const response = await fetch(`/api/threads/${threadId}/messages`, {
			method: 'POST',
			body: formData
		})

		if (!response.ok) {
			const errorData = await response.json()
			throw new Error(errorData.message || 'Failed to send message')
		}

		// Reset form
		body = ''
		files = []

		toast.success('Message sent')

		onMessageSent?.()
	} catch (error) {
		console.error('Failed to send message:', error)
		toast.error(error instanceof Error ? error.message : 'Failed to send message')
	} finally {
		isSubmitting = false
	}
}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div>
		<Label for="message-body" class="sr-only">Message</Label>
		<Textarea
			id="message-body"
			bind:value={body}
			placeholder="Type your message..."
			rows={3}
			{disabled}
			class="resize-none"
			aria-label="Message content"
		/>
	</div>

	{#if files.length > 0}
		<div class="space-y-2">
			<Label class="text-sm font-medium">Attachments ({files.length}/{MAX_FILES})</Label>
			<ul class="space-y-2" role="list" aria-label="Attached files">
				{#each files as file, index (file.name + index)}
					<li
						class="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{file.name}</p>
							<p class="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => removeFile(index)}
							aria-label="Remove {file.name}"
							disabled={isSubmitting}
						>
							<X class="h-4 w-4" aria-hidden="true" />
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="flex items-center justify-between gap-2">
		<div>
			<input
				type="file"
				bind:this={fileInput}
				onchange={handleFileSelect}
				multiple
				accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
				class="sr-only"
				id="message-attachments"
				disabled={disabled || files.length >= MAX_FILES}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => fileInput?.click()}
				disabled={disabled || files.length >= MAX_FILES || isSubmitting}
			>
				<Paperclip class="mr-2 h-4 w-4" aria-hidden="true" />
				Attach files
				{#if files.length > 0}
					<span class="ml-1">({files.length}/{MAX_FILES})</span>
				{/if}
			</Button>
		</div>

		<Button
			type="submit"
			disabled={disabled || isSubmitting || (!body.trim() && files.length === 0)}
		>
			{#if isSubmitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
				Sending...
			{:else}
				<Send class="mr-2 h-4 w-4" aria-hidden="true" />
				Send
			{/if}
		</Button>
	</div>
</form>
