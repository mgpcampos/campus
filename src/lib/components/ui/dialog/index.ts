import { Dialog as DialogPrimitive } from 'bits-ui'

const Root = DialogPrimitive.Root
const Portal = DialogPrimitive.Portal

export { Root, Portal }
export { Root as Dialog, Portal as DialogPortal }

export { default as Close, default as DialogClose } from './dialog-close.svelte'
export { default as Content, default as DialogContent } from './dialog-content.svelte'
export { default as Description, default as DialogDescription } from './dialog-description.svelte'
export { default as Footer, default as DialogFooter } from './dialog-footer.svelte'
export { default as Header, default as DialogHeader } from './dialog-header.svelte'
export { default as Overlay, default as DialogOverlay } from './dialog-overlay.svelte'
export { default as Title, default as DialogTitle } from './dialog-title.svelte'
export { default as Trigger, default as DialogTrigger } from './dialog-trigger.svelte'
