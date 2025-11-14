<script lang="ts">
import { page } from '$app/stores'

interface NavigationItem {
	href: string
	label: string
	icon?: any
	badge?: string | number
	disabled?: boolean
}

let {
	items = [],
	orientation = 'horizontal',
	variant = 'default',
	class: className = '',
	onNavigate = () => {}
}: {
	items: NavigationItem[]
	orientation?: 'horizontal' | 'vertical'
	variant?: 'default' | 'pills' | 'underline'
	class?: string
	onNavigate?: (item: NavigationItem) => void
} = $props()

function isActive(href: string): boolean {
	if (href === '/') {
		return $page.url.pathname === '/'
	}
	return $page.url.pathname.startsWith(href)
}

function handleKeydown(event: KeyboardEvent, item: NavigationItem) {
	// Handle keyboard navigation
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()
		if (!item.disabled) {
			onNavigate(item)
		}
	}
}

function getVariantClasses(item: NavigationItem, active: boolean) {
	const base =
		'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

	if (variant === 'pills') {
		return active
			? `${base} bg-primary text-primary-foreground hover:bg-primary/90`
			: `${base} hover:bg-accent hover:text-accent-foreground`
	}

	if (variant === 'underline') {
		return active
			? `${base} border-b-2 border-primary text-primary`
			: `${base} border-b-2 border-transparent hover:border-border hover:text-foreground`
	}

	// default variant
	return active
		? `${base} bg-accent text-accent-foreground`
		: `${base} hover:bg-accent/50 hover:text-accent-foreground`
}
</script>

<nav
	class="flex {orientation === 'vertical' ? 'flex-col space-y-1' : 'space-x-1'} {className}"
	aria-label="Navigation"
>
	{#each items as item}
		<a
			href={item.href}
			class="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ring-offset-background disabled:pointer-events-none disabled:opacity-50 {getVariantClasses(
				item,
				isActive(item.href)
			)}"
			aria-current={isActive(item.href) ? 'page' : undefined}
			aria-disabled={item.disabled}
			tabindex={item.disabled ? -1 : 0}
			onkeydown={(e) => handleKeydown(e, item)}
			onclick={() => onNavigate(item)}
		>
			{#if item.icon}
				{@const IconComponent = item.icon}
				<IconComponent class="mr-2 h-4 w-4" aria-hidden="true" />
			{/if}
			{item.label}
			{#if item.badge}
				<span
					class="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-1 text-xs leading-none font-bold text-primary-foreground"
					aria-label="{item.badge} notifications"
				>
					{item.badge}
				</span>
			{/if}
		</a>
	{/each}
</nav>
