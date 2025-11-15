<script lang="ts">
import type { Dialog as DialogPrimitiveType } from 'bits-ui'
import { Dialog as DialogPrimitive } from 'bits-ui'
import { cn } from '$lib/utils.js'

let {
	ref = $bindable(null),
	class: className,
	...restProps
}: DialogPrimitiveType.DescriptionProps = $props()
</script>

<DialogPrimitive.Description
	bind:ref
	data-slot="dialog-description"
	class={cn('text-sm text-muted-foreground', className)}
	{...restProps}
/>
