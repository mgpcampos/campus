<script lang="ts">
import type { Snippet } from 'svelte'
import { Button } from '$lib/components/ui/button/index.js'
import * as Card from '$lib/components/ui/card/index.js'
import LoadingSpinner from './LoadingSpinner.svelte'

let {
	title = '',
	description = '',
	children,
	actions = [],
	loading = false,
	error = null,
	class: className = '',
	variant = 'default'
}: {
	title?: string
	description?: string
	children?: Snippet
	actions?: Array<{
		label: string
		onClick: () => void
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
		disabled?: boolean
	}>
	loading?: boolean
	error?: string | null
	class?: string
	variant?: 'default' | 'elevated' | 'outlined'
} = $props()

const variantClasses = {
	default: '',
	elevated: 'shadow-lg',
	outlined: 'border-2'
}
</script>

<Card.Root class="{variantClasses[variant]} {className}">
	{#if title || description}
		<Card.Header>
			{#if title}
				<Card.Title>{title}</Card.Title>
			{/if}
			{#if description}
				<Card.Description>{description}</Card.Description>
			{/if}
		</Card.Header>
	{/if}

	<Card.Content>
		{#if loading}
			<div class="flex justify-center py-8">
				<LoadingSpinner text="Loading..." />
			</div>
		{:else if error}
			<div class="py-8 text-center">
				<p class="text-sm text-destructive">{error}</p>
			</div>
		{:else}
			{@render children?.()}
		{/if}
	</Card.Content>

	{#if actions.length > 0}
		<Card.Footer class="flex justify-end gap-2">
			{#each actions as action}
				<Button
					variant={action.variant || 'default'}
					disabled={action.disabled || loading}
					onclick={action.onClick}
				>
					{action.label}
				</Button>
			{/each}
		</Card.Footer>
	{/if}
</Card.Root>
