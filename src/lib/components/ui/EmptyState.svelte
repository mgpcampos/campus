<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	let {
		icon,
		title,
		description,
		actionText = '',
		actionHref = '',
		onAction = () => {},
		class: className = ''
	}: {
		icon?: any;
		title: string;
		description: string;
		actionText?: string;
		actionHref?: string;
		onAction?: () => void;
		class?: string;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center text-center py-12 {className}">
	{#if icon}
		{@const IconComponent = icon}
		<div class="mb-4 p-3 rounded-full bg-muted">
			<IconComponent class="w-8 h-8 text-muted-foreground" />
		</div>
	{/if}
	
	<h3 class="text-lg font-semibold mb-2">{title}</h3>
	<p class="text-muted-foreground mb-6 max-w-sm">{description}</p>
	
	{#if actionText}
		{#if actionHref}
			<Button href={actionHref}>{actionText}</Button>
		{:else}
			<Button onclick={onAction}>{actionText}</Button>
		{/if}
	{/if}
</div>