<script lang="ts">
	import { currentUser, pb } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { User, LogOut, Settings, Shield } from '@lucide/svelte';
	import NotificationsDropdown from '$lib/components/notifications/NotificationsDropdown.svelte';
	import { cn } from '$lib/utils.js';

	const logoutFormId = 'user-menu-logout-form';

	let { class: className = '', id, ...restProps } = $props();
	let userMenuOpen = $state(false);

	function handleUserMenuOpenChange(value: boolean) {
		userMenuOpen = value;
	}
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 {className}"
	{id}
	{...restProps}
>
	<div class="container flex h-14 max-w-screen-2xl items-end justify-end px-4 pb-2">
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
										src={pb.files.getURL($currentUser, $currentUser.avatar, { thumb: '40x40' })}
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
						<DropdownMenu.Item variant="destructive">
							{#snippet child({ props })}
								<button
									{...props}
									type="submit"
									form={logoutFormId}
									class={cn(
										'flex w-full items-center gap-2 text-left',
										props.class ? String(props.class) : undefined
									)}
								>
									<LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
									<span class="flex-1">Sign out</span>
								</button>
							{/snippet}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<form
					id={logoutFormId}
					method="POST"
					action="/auth/logout"
					class="hidden"
					tabindex="-1"
					aria-hidden="true"
				></form>
			{:else}
				<Button variant="ghost" size="sm" href="/auth/login">Sign In</Button>
				<Button size="sm" href="/auth/register">Sign Up</Button>
			{/if}
		</nav>
	</div>
</header>
