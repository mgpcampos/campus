<script lang="ts">
	import { onMount } from 'svelte';

	let {
		message = '',
		priority = 'polite',
		atomic = true,
		relevant = 'additions text',
		class: className = 'sr-only'
	}: {
		message?: string;
		priority?: 'polite' | 'assertive';
		atomic?: boolean;
		relevant?:
			| 'additions'
			| 'removals'
			| 'text'
			| 'additions text'
			| 'additions removals'
			| 'removals text'
			| 'all';
		class?: string;
	} = $props();

	let regionElement: HTMLElement;

	// Function to announce a message
	export function announce(text: string, urgency: 'polite' | 'assertive' = 'polite') {
		if (regionElement) {
			// Clear first to ensure screen readers pick up the change
			regionElement.textContent = '';

			// Set the priority if different
			if (urgency !== priority) {
				regionElement.setAttribute('aria-live', urgency);
			}

			// Small delay to ensure screen readers detect the change
			setTimeout(() => {
				regionElement.textContent = text;
			}, 100);
		}
	}

	onMount(() => {
		// Auto-announce if message is provided
		if (message) {
			announce(message, priority);
		}
	});

	// Watch for message changes
	$effect(() => {
		if (message && regionElement) {
			announce(message, priority);
		}
	});
</script>

<div
	bind:this={regionElement}
	class={className}
	aria-live={priority}
	aria-atomic={atomic}
	aria-relevant={relevant}
	role="status"
>
	{message}
</div>
