<script lang="ts">
import type { DropdownMenu as DropdownMenuPrimitiveType } from 'bits-ui'
import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'

let {
	ref = $bindable(null),
	value = $bindable(),
	...restProps
}: DropdownMenuPrimitiveType.RadioGroupProps = $props()
</script>

<DropdownMenuPrimitive.RadioGroup
	bind:ref
	bind:value
	data-slot="dropdown-menu-radio-group"
	{...restProps}
/>
