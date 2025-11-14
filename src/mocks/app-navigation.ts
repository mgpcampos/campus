import { vi } from 'vitest'

type NavigateHook = (
	fn: (event: { from?: URL; to?: URL | null; cancel: () => void }) => void
) => () => void

type VoidAsync = () => Promise<void>

type Invalidate = (resource?: string | URL | (string | URL)[]) => Promise<void>

type Preload = (href: string, ops?: Record<string, unknown>) => Promise<void>

export const goto: (href: string, options?: Record<string, unknown>) => Promise<void> = vi.fn(
	async () => {
		// No-op mock navigation
	}
)
export const invalidate: Invalidate = vi.fn(async () => {
	// No-op mock cache invalidation
})
export const invalidateAll: VoidAsync = vi.fn(async () => {
	// No-op mock cache invalidation
})
export const preloadData: Preload = vi.fn(async () => {
	// No-op mock preloading
})
export const preloadCode: Preload = vi.fn(async () => {
	// No-op mock preloading
})
export const afterNavigate: NavigateHook = vi.fn(() => () => {
	// No-op after navigate hook
})
export const beforeNavigate: NavigateHook = vi.fn(() => () => {
	// No-op before navigate hook
})
