<script lang="ts">
import type { ComponentType, Snippet } from 'svelte'
import { Button } from '$lib/components/ui/button/index.js'
import LoadingSpinner from './LoadingSpinner.svelte'

let {
	variant = 'default',
	size = 'default',
	loading = false,
	disabled = false,
	href,
	type = 'button',
	onclick = () => undefined,
	children,
	icon,
	iconPosition = 'left',
	class: className = '',
	loadingText = 'Loading...',
	ariaLabel
}: {
	variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
	size?: 'default' | 'sm' | 'lg' | 'icon'
	loading?: boolean
	disabled?: boolean
	href?: string
	type?: 'button' | 'submit' | 'reset'
	onclick?: (event: MouseEvent) => void
	children?: Snippet
	icon?: ComponentType
	iconPosition?: 'left' | 'right'
	class?: string
	loadingText?: string
	ariaLabel?: string
} = $props()

function handleClick(event: MouseEvent) {
	if (!loading && !disabled) {
		onclick(event)
	}
}

const isDisabled = disabled || loading
</script>

<Button
	{variant}
	{size}
	{href}
	{type}
	disabled={isDisabled}
	class={className}
	onclick={handleClick}
	aria-label={ariaLabel}
	aria-busy={loading}
>
	{#if loading}
		<LoadingSpinner size="sm" class="mr-2" />
		{loadingText}
	{:else}
		{#if icon && iconPosition === 'left'}
			{@const IconComponent = icon}
			<IconComponent class="mr-2 h-4 w-4" aria-hidden="true" />
		{/if}

		{@render children?.()}

		{#if icon && iconPosition === 'right'}
			{@const IconComponent = icon}
			<IconComponent class="ml-2 h-4 w-4" aria-hidden="true" />
		{/if}
	{/if}
</Button>
