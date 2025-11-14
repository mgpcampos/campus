<script lang="ts">
import { onMount } from 'svelte'
import { FocusManager as FocusManagerClass, trapFocus } from '$lib/utils/accessibility.js'

let {
	trap = false,
	restore = false,
	autoFocus = false,
	children,
	class: className = ''
}: {
	trap?: boolean
	restore?: boolean
	autoFocus?: boolean
	children?: any
	class?: string
} = $props()

let containerElement: HTMLElement
let focusManager = new FocusManagerClass()
let cleanupTrap: (() => void) | null = null

onMount(() => {
	if (restore) {
		focusManager.save()
	}

	if (trap && containerElement) {
		cleanupTrap = trapFocus(containerElement)
	}

	if (autoFocus && containerElement) {
		const firstFocusable = containerElement.querySelector(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		) as HTMLElement
		firstFocusable?.focus()
	}

	return () => {
		cleanupTrap?.()
		if (restore) {
			focusManager.restore()
		}
	}
})
</script>

<div bind:this={containerElement} class={className}>
	{@render children?.()}
</div>
