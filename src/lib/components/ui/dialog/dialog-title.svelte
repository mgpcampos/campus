<script lang="ts">
import type { Dialog as DialogPrimitiveType } from 'bits-ui'
import { Dialog as DialogPrimitive } from 'bits-ui'
import { cn } from '$lib/utils.js'

let {
	ref = $bindable(null),
	class: className,
	...restProps
}: DialogPrimitiveType.TitleProps = $props()
</script>

<DialogPrimitive.Title
	bind:ref
	data-slot="dialog-title"
	class={cn('text-lg leading-none font-semibold', className)}
	{...restProps}
/>
