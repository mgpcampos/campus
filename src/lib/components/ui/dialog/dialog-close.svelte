<script lang="ts">
import type { Dialog as DialogPrimitiveType } from 'bits-ui'
import { Dialog as DialogPrimitive } from 'bits-ui'

let { ref = $bindable(null), ...restProps }: DialogPrimitiveType.CloseProps = $props()
</script>

<DialogPrimitive.Close bind:ref data-slot="dialog-close" {...restProps} />
