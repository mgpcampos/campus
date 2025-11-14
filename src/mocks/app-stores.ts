// Mock implementation of SvelteKit's $app/stores for Vitest environment
// Provides a minimal `page` store with a stable URL reference used by components
import { readable } from 'svelte/store'

export const page = readable({ url: new URL('http://localhost/') })
export const navigating = readable(null)
export const updated = readable(false)
