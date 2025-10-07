<script lang="ts">
	import { LoaderCircle } from '@lucide/svelte';

	let {
		size = 'default',
		class: className = '',
		text = ''
	}: {
		size?: 'sm' | 'default' | 'lg';
		class?: string;
		text?: string;
	} = $props();

	const sizeClasses = {
		sm: 'w-4 h-4',
		default: 'w-6 h-6',
		lg: 'w-8 h-8'
	};
</script>

<div
	class="flex items-center justify-center space-x-2 {className}"
	role="status"
	aria-live="polite"
>
	<LoaderCircle class="{sizeClasses[size]} animate-spin text-muted-foreground" aria-hidden="true" />
	{#if text}
		<span class="text-sm text-muted-foreground">{text}</span>
	{:else}
		<span class="sr-only">Loading...</span>
	{/if}
</div>
