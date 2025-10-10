<svelte:options runes />

<script lang="ts">
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		MessageSquare,
		Users,
		User,
		Plus,
		Shield,
		BookOpen,
		Calendar,
		UserCircle
	} from '@lucide/svelte';
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
		{ href: '/materials', label: 'Materials', icon: BookOpen, requiresAuth: true },
		{ href: '/calendar', label: 'Calendar', icon: Calendar, requiresAuth: true },
		{ href: '/profiles', label: 'Profiles', icon: UserCircle, requiresAuth: true },
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
		class="hidden md:block flex-shrink-0 border-r border-border/40 bg-background/95 {className}"
		aria-label="Sidebar navigation"
	>
		<div class="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
			<nav class="space-y-1 p-2">
				{#each $currentUser?.isAdmin ? [...baseNavigationItems, adminNavItem] : baseNavigationItems as item (item.href)}
					{#if !item.requiresAuth || $currentUser}
						<a
							href={item.href}
							class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 {isActive(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
							aria-current={isActive(item.href) ? 'page' : undefined}
						>
							<item.icon class="h-5 w-5 lg:mr-3" aria-hidden="true" />
							<span class="hidden lg:block">{item.label}</span>
						</a>
					{/if}
				{/each}

				<!-- Compose Button -->
				<div class="pt-4">
					<Button
						class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full h-12 lg:h-10"
						href="/feed"
					>
						<Plus class="h-5 w-5 lg:mr-2" aria-hidden="true" />
						<span class="hidden lg:block">Compose</span>
					</Button>
				</div>

				<!-- Quick Actions -->
				<div class="pt-4">
					<div class="space-y-1" role="group">
						<a
							href="/spaces/create"
							class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-muted-foreground hover:text-foreground"
						>
							<Plus class="h-5 w-5 lg:mr-3" aria-hidden="true" />
							<span class="hidden lg:block">Create Space</span>
						</a>
					</div>
				</div>

				<!-- Recent Spaces -->
				<div class="pt-4">
					<div class="space-y-1" role="group">
						{#if spacesLoading}
							<div class="px-3 py-2">
								<div class="h-4 bg-muted/50 rounded animate-pulse"></div>
							</div>
						{:else if spacesError}
							<p class="px-3 text-xs text-destructive" role="alert">{spacesError}</p>
						{:else if recentSpaces.length === 0}
							<p class="px-3 text-xs text-muted-foreground">No recent spaces</p>
						{:else}
							{#each recentSpaces.slice(0, 3) as space (space.id)}
								<a
									href={`/spaces/${space.slug}`}
									class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 {isActive(`/spaces/${space.slug}`) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
									aria-current={isActive(`/spaces/${space.slug}`) ? 'page' : undefined}
								>
									<Users class="h-4 w-4 lg:mr-2 flex-shrink-0" aria-hidden="true" />
									<span class="hidden lg:block truncate">{space.name}</span>
								</a>
							{/each}
						{/if}
					</div>
				</div>
			</nav>
		</div>
	</aside>
{/if}
