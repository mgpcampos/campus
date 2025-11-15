<script lang="ts">
	import type { DropdownMenu as DropdownMenuPrimitiveType } from 'bits-ui'
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
	import { cn } from '$lib/utils.js'

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DropdownMenuPrimitiveType.SeparatorProps = $props()
</script>

<DropdownMenuPrimitive.Separator
	bind:ref
	data-slot="dropdown-menu-separator"
	class={cn('-mx-1 my-1 h-px bg-border', className)}
	{...restProps}
/>
