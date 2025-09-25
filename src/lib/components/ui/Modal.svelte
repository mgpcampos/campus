<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { X } from 'lucide-svelte';

	let {
		open = false,
		title = '',
		description = '',
		children,
		onOpenChange = (open: boolean) => {},
		onClose = () => {},
		class: className = '',
		size = 'default',
		showCloseButton = true,
		closeOnOutsideClick = true,
		closeOnEscape = true
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		children?: any;
		onOpenChange?: (open: boolean) => void;
		onClose?: () => void;
		class?: string;
		size?: 'sm' | 'default' | 'lg' | 'xl' | 'full';
		showCloseButton?: boolean;
		closeOnOutsideClick?: boolean;
		closeOnEscape?: boolean;
	} = $props();

	const sizeClasses = {
		sm: 'max-w-md',
		default: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl',
		full: 'max-w-[95vw] max-h-[95vh]'
	};

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			onClose();
		}
		onOpenChange(newOpen);
	}

	function handleClose() {
		open = false;
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="{sizeClasses[size]} {className}"
		onInteractOutside={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
		onEscapeKeydown={closeOnEscape ? undefined : (e) => e.preventDefault()}
	>
		{#if title || showCloseButton}
			<Dialog.Header class="flex items-center justify-between">
				<div>
					{#if title}
						<Dialog.Title>{title}</Dialog.Title>
					{/if}
					{#if description}
						<Dialog.Description>{description}</Dialog.Description>
					{/if}
				</div>

				{#if showCloseButton}
					<Dialog.Close>
						<Button
							variant="ghost"
							size="sm"
							class="h-6 w-6 p-0"
							onclick={handleClose}
							aria-label="Close modal"
						>
							<X class="h-4 w-4" />
						</Button>
					</Dialog.Close>
				{/if}
			</Dialog.Header>
		{/if}

		{@render children?.()}
	</Dialog.Content>
</Dialog.Root>
