<script lang="ts">
	import type { DropdownMenu as DropdownMenuPrimitiveType } from 'bits-ui'
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'

	let { ref = $bindable(null), ...restProps }: DropdownMenuPrimitiveType.TriggerProps = $props()
</script>

<DropdownMenuPrimitive.Trigger bind:ref data-slot="dropdown-menu-trigger" {...restProps} />
