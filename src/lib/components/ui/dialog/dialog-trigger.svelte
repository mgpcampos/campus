<script lang="ts">
import type { Dialog as DialogPrimitiveType } from 'bits-ui'
import { Dialog as DialogPrimitive } from 'bits-ui'

let { ref = $bindable(null), ...restProps }: DialogPrimitiveType.TriggerProps = $props()
</script>

<DialogPrimitive.Trigger bind:ref data-slot="dialog-trigger" {...restProps} />
