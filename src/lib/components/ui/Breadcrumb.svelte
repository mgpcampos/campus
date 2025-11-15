<script lang="ts">
	import { ChevronRight, Home } from '@lucide/svelte'
	import type { ComponentType } from 'svelte'

	interface BreadcrumbItem {
		label: string
		href?: string
		icon?: ComponentType
		current?: boolean
	}

	let {
		items = [],
		separator = ChevronRight as unknown as ComponentType,
		showHome = true,
		homeHref = '/',
		class: className = ''
	}: {
		items: BreadcrumbItem[]
		separator?: ComponentType
		showHome?: boolean
		homeHref?: string
		class?: string
	} = $props()

	const homeItem: BreadcrumbItem = {
		label: 'Home',
		href: homeHref,
		icon: Home as unknown as ComponentType
	}
	const allItems: BreadcrumbItem[] = showHome ? [homeItem, ...items] : items
</script>

<nav aria-label="Breadcrumb" class="flex {className}">
	<ol class="flex items-center space-x-1 text-sm text-muted-foreground">
		{#each allItems as item, index}
			<li class="flex items-center">
				{#if index > 0}
					{@const SeparatorIcon = separator}
					<SeparatorIcon class="mx-2 h-4 w-4" aria-hidden="true" />
				{/if}

				{#if item.href && !item.current}
					<a
						href={item.href}
						class="rounded-sm px-1 transition-colors hover:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
						aria-current={item.current ? 'page' : undefined}
					>
						{#if item.icon}
							{@const IconComponent = item.icon}
							<IconComponent class="mr-1 inline h-4 w-4" aria-hidden="true" />
						{/if}
						{item.label}
					</a>
				{:else}
					<span
						class="font-medium text-foreground"
						aria-current={item.current ? 'page' : undefined}
					>
						{#if item.icon}
							{@const IconComponent = item.icon}
							<IconComponent class="mr-1 inline h-4 w-4" aria-hidden="true" />
						{/if}
						{item.label}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
