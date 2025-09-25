<script lang="ts">
	interface SkipLink {
		href: string;
		label: string;
	}

	let {
		links = [
			{ href: '#main-content', label: 'Skip to main content' },
			{ href: '#navigation', label: 'Skip to navigation' },
			{ href: '#footer', label: 'Skip to footer' }
		],
		class: className = ''
	}: {
		links?: SkipLink[];
		class?: string;
	} = $props();
</script>

<div class="sr-only focus-within:not-sr-only {className}">
	<nav
		aria-label="Skip links"
		class="fixed top-0 left-0 z-[9999] space-x-2 bg-primary p-2 text-primary-foreground"
	>
		{#each links as link}
			<a
				href={link.href}
				class="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
			>
				{link.label}
			</a>
		{/each}
	</nav>
</div>
