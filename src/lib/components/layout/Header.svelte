<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { User, LogOut, Settings, Menu, X, Shield } from 'lucide-svelte';
	import NotificationsDropdown from '$lib/components/notifications/NotificationsDropdown.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';

	const domAvailable = typeof window !== 'undefined' && typeof document !== 'undefined';

	let { class: className = '', id, ...restProps } = $props();
	let mobileMenuOpen = $state(false);
	let mobileMenuEl = $state<HTMLElement | null>(null);
	let mobileToggleButton = $state<HTMLButtonElement | null>(null);
	let userMenuOpen = $state(false);

	function handleUserMenuOpenChange(value: boolean) {
		userMenuOpen = value;
	}

	async function openMobileMenu() {
		mobileMenuOpen = true;
		if (!domAvailable) {
			return;
		}
		await tick();
		const firstLink = mobileMenuEl?.querySelector('a') as HTMLElement | null;
		firstLink?.focus();
	}

	function closeMobileMenu() {
		if (!mobileMenuOpen) return;
		mobileMenuOpen = false;
		mobileToggleButton?.focus();
	}

	function toggleMobileMenu() {
		mobileMenuOpen ? closeMobileMenu() : openMobileMenu();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && mobileMenuOpen) {
			closeMobileMenu();
		}
	}

	onMount(() => {
		if (!domAvailable) {
			return;
		}

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		if (!domAvailable) {
			return;
		}

		const rootMain = document.getElementById('main-content');
		if (rootMain) {
			if (mobileMenuOpen) {
				rootMain.setAttribute('inert', '');
			} else {
				rootMain.removeAttribute('inert');
			}
		}
	});

	function isActivePage(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 {className}"
	{id}
	{...restProps}
>
	<div class="container flex h-14 max-w-screen-2xl items-center px-4">
		<!-- Logo and Brand -->
		<div class="mr-4 flex items-center space-x-4">
			<a
				href="/"
				class="mr-2 flex items-center space-x-2 rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
				aria-label="Campus Home"
			>
				<span class="text-xl font-bold">Campus</span>
			</a>
			{#if $currentUser}
				<Button
					bind:ref={mobileToggleButton}
					variant="ghost"
					size="sm"
					class="md:hidden"
					onclick={toggleMobileMenu}
					aria-expanded={mobileMenuOpen}
					aria-controls="mobile-menu"
					aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
				>
					{#if mobileMenuOpen}
						<X class="h-4 w-4" />
					{:else}
						<Menu class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
		</div>

		<!-- Desktop Navigation Links -->
		<nav class="hidden items-center gap-4 text-sm md:flex lg:gap-6" aria-label="Primary navigation">
			{#if $currentUser}
				<a
					href="/"
					class="rounded-md px-2 py-1 transition-colors hover:text-foreground/80 focus:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none {isActivePage(
						'/'
					)
						? 'font-medium text-foreground'
						: 'text-foreground/60'}"
					aria-current={isActivePage('/') ? 'page' : undefined}
				>
					Feed
				</a>
				<a
					href="/spaces"
					class="rounded-md px-2 py-1 transition-colors hover:text-foreground/80 focus:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none {isActivePage(
						'/spaces'
					)
						? 'font-medium text-foreground'
						: 'text-foreground/60'}"
					aria-current={isActivePage('/spaces') ? 'page' : undefined}
				>
					Spaces
				</a>
				{#if $currentUser?.isAdmin}
					<a
						href="/admin"
						class="rounded-md px-2 py-1 transition-colors hover:text-foreground/80 focus:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none {isActivePage(
							'/admin'
						)
							? 'font-medium text-foreground'
							: 'text-foreground/60'}"
						aria-current={isActivePage('/admin') ? 'page' : undefined}
					>
						Admin
					</a>
				{/if}
			{/if}
		</nav>

		<!-- Spacer -->
		<div class="flex flex-1 items-center justify-end space-x-2">
			<!-- User Menu -->
			<nav class="flex items-center gap-2">
				{#if $currentUser}
					<NotificationsDropdown />
					<DropdownMenu.Root open={userMenuOpen} onOpenChange={handleUserMenuOpenChange}>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									size="sm"
									class="relative h-8 w-8 rounded-full"
									aria-label="User menu"
									aria-expanded={userMenuOpen}
								>
									{#if $currentUser && $currentUser.avatar}
										<img
											src={$currentUser?.avatar}
											alt="{$currentUser?.name || 'User'}'s avatar"
											class="h-8 w-8 rounded-full object-cover"
										/>
									{:else}
										<User class="h-4 w-4" />
									{/if}
									<span class="sr-only">Open user menu</span>
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-56" align="end">
							<DropdownMenu.Label class="font-normal">
								<div class="flex flex-col space-y-1">
									<p class="text-sm leading-none font-medium">{$currentUser.name}</p>
									<p class="text-xs leading-none text-muted-foreground">
										@{$currentUser.username}
									</p>
								</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Item>
									<User class="mr-2 h-4 w-4" aria-hidden="true" />
									<a href="/profile" class="flex-1">Profile</a>
								</DropdownMenu.Item>
								<DropdownMenu.Item>
									<Settings class="mr-2 h-4 w-4" aria-hidden="true" />
									<span>Settings</span>
								</DropdownMenu.Item>
								{#if $currentUser.isAdmin}
									<DropdownMenu.Item>
										<Shield class="mr-2 h-4 w-4" aria-hidden="true" />
										<a href="/admin" class="flex-1">Admin dashboard</a>
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Item>
								<LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
								<a href="/auth/logout" class="flex-1">Sign out</a>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else}
					<Button variant="ghost" size="sm" href="/auth/login">Sign In</Button>
					<Button size="sm" href="/auth/register">Sign Up</Button>
				{/if}
			</nav>
		</div>
	</div>

	<!-- Mobile Navigation Menu -->
	{#if $currentUser && mobileMenuOpen}
		<nav
			id="mobile-menu"
			class="border-t border-border/40 bg-background/95 backdrop-blur md:hidden"
			aria-label="Mobile"
			bind:this={mobileMenuEl}
		>
			<div class="container space-y-2 px-4 py-4">
				<a
					href="/"
					class="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none {isActivePage(
						'/'
					)
						? 'bg-accent text-accent-foreground'
						: 'text-foreground/60'}"
					onclick={closeMobileMenu}
					aria-current={isActivePage('/') ? 'page' : undefined}
				>
					Feed
				</a>
				<a
					href="/spaces"
					class="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none {isActivePage(
						'/spaces'
					)
						? 'bg-accent text-accent-foreground'
						: 'text-foreground/60'}"
					onclick={closeMobileMenu}
					aria-current={isActivePage('/spaces') ? 'page' : undefined}
				>
					Spaces
				</a>
				{#if $currentUser?.isAdmin}
					<a
						href="/admin"
						class="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none {isActivePage(
							'/admin'
						)
							? 'bg-accent text-accent-foreground'
							: 'text-foreground/60'}"
						onclick={closeMobileMenu}
						aria-current={isActivePage('/admin') ? 'page' : undefined}
					>
						Admin
					</a>
				{/if}
			</div>
		</nav>
	{/if}
</header>
