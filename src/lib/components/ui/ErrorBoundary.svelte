<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { AlertTriangle, RefreshCw } from '@lucide/svelte';
	import { normalizeError } from '$lib/utils/errors.js';
	import LiveRegion from './LiveRegion.svelte';

	const props = $props<{
		error?: any | null;
		retry?: () => void;
		class?: string;
		showDetails?: boolean;
	}>();

	const defaultRetry = () => window.location.reload();

	const normalized = $derived.by(() => {
		const value = props.error;
		if (!value) return null;
		return value?.__normalized ? value : normalizeError(value);
	});

	const announcedMessage = $derived.by(() => {
		if (!props.error) return '';
		return normalized?.userMessage || 'Something went wrong.';
	});

	let detailsVisible = $state(props.showDetails ?? false);

	$effect(() => {
		if (props.showDetails !== undefined) {
			detailsVisible = props.showDetails;
		}
	});

	function revealDetails() {
		detailsVisible = true;
	}

	function handleRetry() {
		const retry = props.retry ?? defaultRetry;
		retry();
	}
</script>

{#if props.error}
	<Card.Root
		class={`mx-auto w-full max-w-md ${props.class ?? ''}`}
		role="alert"
		aria-live="assertive"
	>
		<Card.Header class="space-y-2 text-center">
			<div class="mb-2 flex justify-center">
				<div class="rounded-full bg-destructive/10 p-3">
					<AlertTriangle class="h-8 w-8 text-destructive" />
				</div>
			</div>
			<Card.Title class="text-destructive">
				{#if normalized}{normalized.userMessage || 'Something went wrong'}{:else}Something went
					wrong{/if}
			</Card.Title>
			<Card.Description>
				{#if normalized && normalized.retryable}
					You can try again. {#if normalized.code === 'offline'}Check your connection first.{/if}
				{:else}
					We encountered an error while loading this content.
				{/if}
			</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-3 text-center">
			{#if detailsVisible}
				<details class="text-left">
					<summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
						Details
					</summary>
					<pre class="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
{#if normalized}
							code: {normalized.code}
type: {normalized.type}
status: {normalized.status}
dev: {normalized.devMessage}
						{:else}
							{props.error?.message}
						{/if}
</pre>
				</details>
			{:else}
				<button
					type="button"
					class="text-xs text-muted-foreground underline hover:text-foreground"
					onclick={revealDetails}
				>
					Show details
				</button>
			{/if}
			<LiveRegion message={announcedMessage} priority="assertive" class="sr-only" />
		</Card.Content>

		<Card.Footer class="flex justify-center gap-2">
			{#if normalized?.retryable}
				<Button onclick={handleRetry} variant="outline">
					<RefreshCw class="mr-2 h-4 w-4" />
					Try Again
				</Button>
			{:else}
				<Button onclick={handleRetry} variant="outline">Dismiss</Button>
			{/if}
		</Card.Footer>
	</Card.Root>
{/if}
