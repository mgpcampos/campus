<script lang="ts">
import type { Tabs as TabsPrimitiveType } from 'bits-ui'
import { Tabs as TabsPrimitive } from 'bits-ui'
import { cn } from '$lib/utils.js'

let {
	ref = $bindable(null),
	value = $bindable(''),
	class: className,
	...restProps
}: TabsPrimitiveType.RootProps = $props()
</script>

<TabsPrimitive.Root
	bind:ref
	bind:value
	data-slot="tabs"
	class={cn('flex flex-col gap-2', className)}
	{...restProps}
/>
