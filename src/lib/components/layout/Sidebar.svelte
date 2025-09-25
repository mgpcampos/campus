<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { House, Users, User, Plus } from 'lucide-svelte';
	import { page } from '$app/stores';

	let { class: className = '' } = $props();

	// Navigation items
	const navigationItems = [
		{ href: '/', label: 'Home', icon: House, requiresAuth: false },
		{ href: '/spaces', label: 'Spaces', icon: Users, requiresAuth: true },
		{ href: '/profile', label: 'Profile', icon: User, requiresAuth: true }
	];

	function isActive(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

{#if $currentUser}
	<aside
		class="hidden w-64 flex-shrink-0 border-r border-border/40 bg-background/95 md:block {className}"
		aria-label="Sidebar navigation"
	>
		<div class="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-6">
			<nav class="space-y-2">
				{#each navigationItems as item}
					{#if !item.requiresAuth || $currentUser}
						<Button
							variant={isActive(item.href) ? 'secondary' : 'ghost'}
							class="w-full justify-start focus:ring-2 focus:ring-ring focus:ring-offset-2"
							href={item.href}
							aria-current={isActive(item.href) ? 'page' : undefined}
						>
							{@const IconComponent = item.icon}
							<IconComponent class="mr-2 h-4 w-4" aria-hidden="true" />
							{item.label}
						</Button>
					{/if}
				{/each}

				<!-- Quick Actions -->
				<div class="pt-6">
					<h3
						class="mb-3 px-3 text-sm font-semibold tracking-tight text-muted-foreground"
						id="quick-actions-heading"
					>
						Quick Actions
					</h3>
					<div class="space-y-1" role="group" aria-labelledby="quick-actions-heading">
						<Button
							variant="ghost"
							class="w-full justify-start focus:ring-2 focus:ring-ring focus:ring-offset-2"
							href="/spaces/create"
						>
							<Plus class="mr-2 h-4 w-4" aria-hidden="true" />
							Create Space
						</Button>
					</div>
				</div>

				<!-- Recent Spaces (placeholder for future implementation) -->
				<div class="pt-6">
					<h3
						class="mb-3 px-3 text-sm font-semibold tracking-tight text-muted-foreground"
						id="recent-spaces-heading"
					>
						Recent Spaces
					</h3>
					<div class="space-y-1" role="group" aria-labelledby="recent-spaces-heading">
						<p class="px-3 text-sm text-muted-foreground">Join some spaces to see them here</p>
					</div>
				</div>
			</nav>
		</div>
	</aside>
{/if}
