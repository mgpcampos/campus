<script lang="ts">
	import { onMount } from 'svelte';
	import { createRovingTabindex } from '$lib/utils/accessibility.js';

	let {
		container,
		selector = '[role="option"], [role="menuitem"], [role="tab"], button:not([disabled]), a[href]',
		direction = 'both',
		wrap = true,
		class: className = '',
		children
	}: {
		container?: HTMLElement;
		selector?: string;
		direction?: 'horizontal' | 'vertical' | 'both';
		wrap?: boolean;
		class?: string;
		children?: any;
	} = $props();

	let containerElement: HTMLElement;
	let cleanup: (() => void) | null = null;

	onMount(() => {
		const element = container || containerElement;
		if (element) {
			cleanup = createRovingTabindex(element, selector);
		}

		return () => {
			cleanup?.();
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		const items = containerElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
		const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
		
		if (currentIndex === -1) return;

		let newIndex = currentIndex;
		let handled = false;

		switch (event.key) {
			case 'ArrowRight':
				if (direction === 'horizontal' || direction === 'both') {
					newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
					handled = true;
				}
				break;
			case 'ArrowLeft':
				if (direction === 'horizontal' || direction === 'both') {
					newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
					handled = true;
				}
				break;
			case 'ArrowDown':
				if (direction === 'vertical' || direction === 'both') {
					newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
					handled = true;
				}
				break;
			case 'ArrowUp':
				if (direction === 'vertical' || direction === 'both') {
					newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
					handled = true;
				}
				break;
			case 'Home':
				newIndex = 0;
				handled = true;
				break;
			case 'End':
				newIndex = items.length - 1;
				handled = true;
				break;
		}

		if (handled) {
			event.preventDefault();
			items[newIndex]?.focus();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div 
	bind:this={containerElement}
	class={className}
	onkeydown={handleKeydown}
	role="group"
	tabindex="-1"
>
	{@render children?.()}
</div>