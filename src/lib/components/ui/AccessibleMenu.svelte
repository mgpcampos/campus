<script lang="ts">
import { onMount, type Snippet } from 'svelte'
import { FocusManager, trapFocus } from '$lib/utils/accessibility.js'
import KeyboardNavigation from './KeyboardNavigation.svelte'

let {
	open = false,
	trigger,
	children,
	onOpenChange = (_open: boolean) => undefined,
	class: className = '',
	placement = 'bottom-start',
	closeOnSelect = true,
	closeOnEscape = true,
	closeOnOutsideClick = true
}: {
	open?: boolean
	trigger?: Snippet
	children?: Snippet
	onOpenChange?: (open: boolean) => void
	class?: string
	placement?:
		| 'top'
		| 'bottom'
		| 'left'
		| 'right'
		| 'top-start'
		| 'top-end'
		| 'bottom-start'
		| 'bottom-end'
	closeOnSelect?: boolean
	closeOnEscape?: boolean
	closeOnOutsideClick?: boolean
} = $props()

let menuElement = $state<HTMLElement>()
let triggerElement = $state<HTMLElement>()
let focusManager = new FocusManager()
let cleanupFocusTrap: (() => void) | null = null

$effect(() => {
	if (open) {
		focusManager.save()
		if (menuElement) {
			cleanupFocusTrap = trapFocus(menuElement)
		}
	} else {
		cleanupFocusTrap?.()
		focusManager.restore()
	}
})

function handleTriggerClick() {
	open = !open
	onOpenChange(open)
}

function handleTriggerKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
		event.preventDefault()
		open = true
		onOpenChange(true)
	}
}

function handleMenuKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && closeOnEscape) {
		event.preventDefault()
		open = false
		onOpenChange(false)
		triggerElement?.focus()
	}
}

function handleOutsideClick(event: MouseEvent) {
	if (
		closeOnOutsideClick &&
		menuElement &&
		!menuElement.contains(event.target as Node) &&
		!triggerElement?.contains(event.target as Node)
	) {
		open = false
		onOpenChange(false)
	}
}

function handleMenuItemClick() {
	if (closeOnSelect) {
		open = false
		onOpenChange(false)
	}
}

onMount(() => {
	if (closeOnOutsideClick) {
		document.addEventListener('click', handleOutsideClick)
	}

	return () => {
		document.removeEventListener('click', handleOutsideClick)
		cleanupFocusTrap?.()
	}
})

const placementClasses = {
	top: 'bottom-full mb-2',
	bottom: 'top-full mt-2',
	left: 'right-full mr-2',
	right: 'left-full ml-2',
	'top-start': 'bottom-full mb-2 left-0',
	'top-end': 'bottom-full mb-2 right-0',
	'bottom-start': 'top-full mt-2 left-0',
	'bottom-end': 'top-full mt-2 right-0'
}
</script>

<div class="relative inline-block">
	<!-- Trigger -->
	<button
		bind:this={triggerElement}
		type="button"
		class="focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
		onclick={handleTriggerClick}
		onkeydown={handleTriggerKeydown}
		aria-expanded={open}
		aria-haspopup="menu"
	>
		{@render trigger?.()}
	</button>

	<!-- Menu -->
	{#if open}
		<div
			bind:this={menuElement}
			class="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md {placementClasses[
				placement
			]} {className}"
			role="menu"
			aria-orientation="vertical"
			onkeydown={handleMenuKeydown}
			tabindex="-1"
		>
			<KeyboardNavigation
				selector="[role='menuitem']:not([aria-disabled='true'])"
				direction="vertical"
			>
				{#snippet children()}
					<div
						role="presentation"
						onclick={handleMenuItemClick}
						onkeydown={(e) => e.key === 'Enter' && handleMenuItemClick()}
					>
						{@render children?.()}
					</div>
				{/snippet}
			</KeyboardNavigation>
		</div>
	{/if}
</div>

<svelte:window
	on:keydown={(e) =>
		e.key === 'Escape' && open && closeOnEscape && ((open = false), onOpenChange(false))}
/>
