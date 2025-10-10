<svelte:options runes />

<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		MessageSquare,
		Users,
		User,
		Shield,
		BookOpen,
		Calendar,
		UserCircle
	} from '@lucide/svelte';
	import { page } from '$app/stores';

	let { class: className = '' } = $props();

	// Navigation items
	const baseNavigationItems = [
		{ href: '/feed', label: 'Feed', icon: MessageSquare, requiresAuth: false },
		{ href: '/materials', label: 'Materials', icon: BookOpen, requiresAuth: true },
		{ href: '/calendar', label: 'Calendar', icon: Calendar, requiresAuth: true },
		{ href: '/profiles', label: 'Profiles', icon: UserCircle, requiresAuth: true },
		{ href: '/spaces', label: 'Spaces', icon: Users, requiresAuth: true },
		{ href: '/profile', label: 'Profile', icon: User, requiresAuth: true }
	];

	const adminNavItems = [
		{ href: '/admin', label: 'Admin Dashboard', icon: Shield, requiresAuth: true },
		{ href: '/admin/moderation', label: 'Moderation', icon: Shield, requiresAuth: true }
	];

	function isActive(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return (
			$page.url.pathname === href ||
			$page.url.pathname.startsWith(href.endsWith('/') ? href : `${href}/`)
		);
	}
</script>

{#if $currentUser}
	<aside
		class="hidden w-64 flex-shrink-0 border-r border-border/40 bg-background/95 md:block {className}"
		aria-label="Sidebar navigation"
	>
		<div class="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-6">
			<nav class="space-y-2">
				{#each baseNavigationItems as item}
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

				<!-- Admin Section -->
				{#if $currentUser?.isAdmin}
					<div class="pt-6">
						<h3
							class="mb-3 px-3 text-sm font-semibold tracking-tight text-muted-foreground"
							id="admin-section-heading"
						>
							Admin
						</h3>
						<div class="space-y-1" role="group" aria-labelledby="admin-section-heading">
							{#each adminNavItems as item}
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
							{/each}
						</div>
					</div>
				{/if}
			</nav>
		</div>
	</aside>
{/if}
