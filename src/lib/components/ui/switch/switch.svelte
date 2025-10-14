<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { cn, type WithoutChildrenOrChild, type WithElementRef } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type ButtonContext = {
		disabled?: boolean;
	};

	const BUTTON_CONTEXT = 'bits-ui:Button';

	type SwitchProps = WithElementRef<
		WithoutChildrenOrChild<SvelteHTMLElements['button']>,
		HTMLButtonElement
	> & {
		children?: Snippet;
		disabled?: boolean;
		checked?: boolean;
	};

	type $$Events = {
		click: MouseEvent;
		keydown: KeyboardEvent;
	};

	let {
		ref = $bindable<HTMLButtonElement | null>(null),
		class: className,
		children,
		disabled = false,
		checked = $bindable(false),
		type = 'button',
		role = 'switch',
		...restProps
	}: SwitchProps = $props();

	let buttonContext: ButtonContext | undefined;

	onMount(() => {
		try {
			buttonContext = getContext<ButtonContext>(BUTTON_CONTEXT);
		} catch {
			buttonContext = undefined;
		}
	});

	let isDisabled = $derived(disabled || buttonContext?.disabled);
</script>

<button
	bind:this={ref}
	{type}
	{role}
	aria-checked={checked}
	aria-disabled={isDisabled}
	data-state={checked ? 'checked' : 'unchecked'}
	disabled={isDisabled}
	class={cn(
		'relative h-6 w-10 rounded-full border border-input bg-input transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary',
		className
	)}
	{...restProps}
>
	<span
		class="absolute top-1 left-1 inline-block h-4 w-4 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-4"
		data-state={checked ? 'checked' : 'unchecked'}
	></span>
	{@render children?.()}
</button>
