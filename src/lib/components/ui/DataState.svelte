<script lang="ts">
	import type { ComponentType, Snippet } from 'svelte'
	import EmptyState from './EmptyState.svelte'
	import ErrorBoundary from './ErrorBoundary.svelte'
	import SkeletonLoader from './SkeletonLoader.svelte'

	let {
		loading = false,
		error = null,
		data = null,
		loadingVariant = 'default',
		loadingCount = 3,
		emptyIcon = undefined,
		emptyTitle = 'No data found',
		emptyDescription = 'There is nothing here yet.',
		emptyAction = '',
		emptyActionHref = '',
		onEmptyAction = () => undefined,
		onRetry = () => undefined,
		children,
		class: className = ''
	}: {
		loading?: boolean
		error?: unknown | null
		data?: unknown
		loadingVariant?: 'default' | 'card' | 'post' | 'profile' | 'list'
		loadingCount?: number
		emptyIcon?: ComponentType
		emptyTitle?: string
		emptyDescription?: string
		emptyAction?: string
		emptyActionHref?: string
		onEmptyAction?: () => void
		onRetry?: () => void
		children?: Snippet
		class?: string
	} = $props()

	let isEmpty = $derived(
		!loading && !error && (!data || (Array.isArray(data) && data.length === 0))
	)
</script>

<div class={className}>
	{#if loading}
		<SkeletonLoader variant={loadingVariant} count={loadingCount} />
	{:else if error}
		<ErrorBoundary {error} retry={onRetry} />
	{:else if isEmpty}
		<EmptyState
			icon={emptyIcon}
			title={emptyTitle}
			description={emptyDescription}
			actionText={emptyAction}
			actionHref={emptyActionHref}
			onAction={onEmptyAction}
		/>
	{:else}
		{@render children?.()}
	{/if}
</div>
