<svelte:options runes />

<script lang="ts">
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { MessageSquare, Users, User, Plus, Shield } from '@lucide/svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { listUserMemberships } from '$lib/services/users';
	import { onDestroy } from 'svelte';

	let { class: className = '' } = $props();
	type RecentSpace = { id: string; name: string; slug: string };
	let recentSpaces = $state<RecentSpace[]>([]);
	let spacesLoading = $state(false);
	let spacesError = $state<string | null>(null);
	let unsubscribeMemberships: (() => void) | null = null;
	let unsubscribeSpaces: (() => void) | null = null;

	// Navigation items
	const baseNavigationItems = [
		{ href: '/feed', label: 'Feed', icon: MessageSquare, requiresAuth: false },
		{ href: '/spaces', label: 'Spaces', icon: Users, requiresAuth: true },
		{ href: '/profile', label: 'Profile', icon: User, requiresAuth: true }
	];

	const adminNavItem = { href: '/admin', label: 'Admin', icon: Shield, requiresAuth: true };

	function isActive(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return (
			$page.url.pathname === href ||
			$page.url.pathname.startsWith(href.endsWith('/') ? href : `${href}/`)
		);
	}

	async function loadRecentSpaces() {
		if (!browser) return;
		const user = $currentUser;
		if (!user) {
			recentSpaces = [];
			spacesError = null;
			return;
		}
		spacesLoading = true;
		spacesError = null;
		try {
			const memberships = await listUserMemberships(pb, user.id);
			recentSpaces = memberships.spaces.slice(0, 5);
		} catch (error) {
			console.warn('sidebar:recentSpaces failed', error);
			spacesError = 'Unable to load your spaces right now.';
		} finally {
			spacesLoading = false;
		}
	}

	function resetSubscriptions() {
		if (unsubscribeMemberships) {
			try {
				unsubscribeMemberships();
			} catch {
				/* ignore */
			}
			unsubscribeMemberships = null;
		}
		if (unsubscribeSpaces) {
			try {
				unsubscribeSpaces();
			} catch {
				/* ignore */
			}
			unsubscribeSpaces = null;
		}
	}

	async function subscribeMemberships(userId: string) {
		if (!browser) return;
		if (unsubscribeMemberships) {
			resetSubscriptions();
		}
		try {
			unsubscribeMemberships = await pb.collection('space_members').subscribe('*', (event) => {
				if (!event.record || event.record.user !== userId) return;
				loadRecentSpaces();
			});
		} catch (error) {
			console.warn('sidebar:subscribeMemberships failed', error);
		}
	}

	async function subscribeOwnedSpaces(userId: string) {
		if (!browser) return;
		if (unsubscribeSpaces) {
			try {
				unsubscribeSpaces();
			} catch {
				/* ignore */
			}
			unsubscribeSpaces = null;
		}
		try {
			unsubscribeSpaces = await pb.collection('spaces').subscribe('*', (event) => {
				const owners = Array.isArray(event.record?.owners)
					? event.record.owners
					: event.record?.owners
						? [event.record.owners]
						: [];
				if (!owners.includes(userId)) return;
				loadRecentSpaces();
			});
		} catch (error) {
			console.warn('sidebar:subscribeSpaces failed', error);
		}
	}

	$effect(() => {
		if (!browser) {
			return;
		}
		const user = $currentUser;
		if (!user) {
			recentSpaces = [];
			spacesError = null;
			resetSubscriptions();
			return;
		}

		loadRecentSpaces();
		subscribeMemberships(user.id);
		subscribeOwnedSpaces(user.id);
	});

	onDestroy(() => {
		if (!browser) return;
		resetSubscriptions();
		try {
			pb.collection('space_members').unsubscribe('*');
		} catch {
			/* ignore */
		}
		try {
			pb.collection('spaces').unsubscribe('*');
		} catch {
			/* ignore */
		}
	});
</script>

{#if $currentUser}
	<aside
		class="hidden w-64 flex-shrink-0 border-r border-border/40 bg-background/95 md:block {className}"
		aria-label="Sidebar navigation"
	>
		<div class="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-6">
			<nav class="space-y-2">
				{#each $currentUser?.isAdmin ? [...baseNavigationItems, adminNavItem] : baseNavigationItems as item}
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
						{#if spacesLoading}
							<p class="px-3 text-sm text-muted-foreground">Loading your spaces...</p>
						{:else if spacesError}
							<p class="px-3 text-sm text-red-600" role="alert">{spacesError}</p>
						{:else if recentSpaces.length === 0}
							<p class="px-3 text-sm text-muted-foreground">Join some spaces to see them here</p>
						{:else}
							<ul class="space-y-1">
								{#each recentSpaces as space}
									<li>
										<Button
											variant={isActive(`/spaces/${space.slug}`) ? 'secondary' : 'ghost'}
											class="w-full justify-start text-left focus:ring-2 focus:ring-ring focus:ring-offset-2"
											href={`/spaces/${space.slug}`}
											aria-current={isActive(`/spaces/${space.slug}`) ? 'page' : undefined}
										>
											{space.name}
										</Button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</nav>
		</div>
	</aside>
{/if}
