<script lang="ts">
	import { ChevronRight, Home } from 'lucide-svelte';

	interface BreadcrumbItem {
		label: string;
		href?: string;
		icon?: any;
		current?: boolean;
	}

	let {
		items = [],
		separator = ChevronRight,
		showHome = true,
		homeHref = '/',
		class: className = ''
	}: {
		items: BreadcrumbItem[];
		separator?: any;
		showHome?: boolean;
		homeHref?: string;
		class?: string;
	} = $props();

	const allItems = showHome 
		? [{ label: 'Home', href: homeHref, icon: Home }, ...items]
		: items;
</script>

<nav aria-label="Breadcrumb" class="flex {className}">
	<ol class="flex items-center space-x-1 text-sm text-muted-foreground">
		{#each allItems as item, index}
			<li class="flex items-center">
				{#if index > 0}
					{@const SeparatorIcon = separator}
					<SeparatorIcon class="h-4 w-4 mx-2" aria-hidden="true" />
				{/if}
				
				{#if item.href && !item.current}
					<a 
						href={item.href}
						class="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-1"
						aria-current={item.current ? 'page' : undefined}
					>
						{#if item.icon}
							{@const IconComponent = item.icon}
							<IconComponent class="h-4 w-4 mr-1 inline" aria-hidden="true" />
						{/if}
						{item.label}
					</a>
				{:else}
					<span 
						class="text-foreground font-medium"
						aria-current={item.current ? 'page' : undefined}
					>
						{#if item.icon}
							{@const IconComponent = item.icon}
							<IconComponent class="h-4 w-4 mr-1 inline" aria-hidden="true" />
						{/if}
						{item.label}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>