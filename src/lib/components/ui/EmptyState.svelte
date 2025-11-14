<script lang="ts">
import type { ComponentType } from 'svelte'
import { Button } from '$lib/components/ui/button/index.js'

let {
	icon,
	title,
	description,
	actionText = '',
	actionHref = '',
	onAction = () => undefined,
	class: className = ''
}: {
	icon?: ComponentType
	title: string
	description: string
	actionText?: string
	actionHref?: string
	onAction?: () => void
	class?: string
} = $props()
</script>

<div class="flex flex-col items-center justify-center py-12 text-center {className}">
	{#if icon}
		{@const IconComponent = icon}
		<div class="mb-4 rounded-full bg-muted p-3">
			<IconComponent class="h-8 w-8 text-muted-foreground" />
		</div>
	{/if}

	<h3 class="mb-2 text-lg font-semibold">{title}</h3>
	<p class="mb-6 max-w-sm text-muted-foreground">{description}</p>

	{#if actionText}
		{#if actionHref}
			<Button href={actionHref}>{actionText}</Button>
		{:else}
			<Button onclick={onAction}>{actionText}</Button>
		{/if}
	{/if}
</div>
