<script lang="ts">
	import { AlertTriangle, Loader2 } from '@lucide/svelte'
	import { toast } from 'svelte-sonner'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'

	interface Props {
		messageId: string
		open: boolean
		onOpenChange: (open: boolean) => void
		onFlagSubmitted?: () => void
	}

	let { messageId, open, onOpenChange, onFlagSubmitted }: Props = $props()

	let reason = $state('')
	let isSubmitting = $state(false)

	const MIN_REASON_LENGTH = 10
	const MAX_REASON_LENGTH = 500

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			// Reset form when closing
			reason = ''
		}
		onOpenChange(newOpen)
	}

	async function handleSubmit(event: Event) {
		event.preventDefault()

		const trimmedReason = reason.trim()

		// Validation
		if (trimmedReason.length < MIN_REASON_LENGTH) {
			toast.error(`Reason must be at least ${MIN_REASON_LENGTH} characters`)
			return
		}

		if (trimmedReason.length > MAX_REASON_LENGTH) {
			toast.error(`Reason must be less than ${MAX_REASON_LENGTH} characters`)
			return
		}

		isSubmitting = true

		try {
			const response = await fetch(`/api/messages/${messageId}/flag`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					reason: trimmedReason
				})
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to report message')
			}

			toast.success('Message reported successfully. Moderators will review it shortly.')

			// Close dialog and reset
			handleOpenChange(false)

			onFlagSubmitted?.()
		} catch (error) {
			console.error('Failed to report message:', error)
			toast.error(error instanceof Error ? error.message : 'Failed to report message')
		} finally {
			isSubmitting = false
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<div class="flex items-center gap-2">
				<AlertTriangle class="h-5 w-5 text-destructive" aria-hidden="true" />
				<Dialog.Title>Report Message</Dialog.Title>
			</div>
			<Dialog.Description>
				Help us maintain a safe community by reporting inappropriate content. Your report will be
				reviewed by our moderation team.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="flag-reason">
					Reason for reporting <span class="text-destructive">*</span>
				</Label>
				<Textarea
					id="flag-reason"
					bind:value={reason}
					placeholder="Please describe why you're reporting this message (minimum 10 characters)"
					rows={4}
					required
					minlength={MIN_REASON_LENGTH}
					maxlength={MAX_REASON_LENGTH}
					disabled={isSubmitting}
					class="resize-none"
					aria-describedby="flag-reason-hint"
				/>
				<p id="flag-reason-hint" class="text-xs text-muted-foreground">
					{reason.trim().length}/{MAX_REASON_LENGTH} characters
					{#if reason.trim().length < MIN_REASON_LENGTH}
						(minimum {MIN_REASON_LENGTH})
					{/if}
				</p>
			</div>

			<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onclick={() => handleOpenChange(false)}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					variant="destructive"
					disabled={isSubmitting || reason.trim().length < MIN_REASON_LENGTH}
				>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
						Submitting...
					{:else}
						Submit Report
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
