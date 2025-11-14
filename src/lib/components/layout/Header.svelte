<script lang="ts">
import { LogOut, Settings, Shield, User } from '@lucide/svelte'
import NotificationsDropdown from '$lib/components/notifications/NotificationsDropdown.svelte'
import SettingsModal from '$lib/components/settings/SettingsModal.svelte'
import { Button } from '$lib/components/ui/button/index.js'
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
import { t } from '$lib/i18n/index.js'
import { currentUser, pb } from '$lib/pocketbase.js'
import { cn } from '$lib/utils.js'

const logoutFormId = 'user-menu-logout-form'

let { class: className = '', id, ...restProps } = $props()
let userMenuOpen = $state(false)
let settingsOpen = $state(false)

function handleUserMenuOpenChange(value: boolean) {
	userMenuOpen = value
}

function openSettings() {
	settingsOpen = true
	userMenuOpen = false
}
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 {className}"
	{id}
	tabindex="-1"
	{...restProps}
>
	<div class="flex h-14 items-center justify-between gap-4 px-4">
		<!-- Logo/Brand -->
		<a href="/" class="flex items-center space-x-2">
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
				<span class="text-lg font-bold text-primary-foreground">C</span>
			</div>
			<span class="text-xl font-bold text-foreground">{t('common.appName')}</span>
		</a>

		<!-- Actions -->
		<nav class="flex items-center gap-3">
			{#if $currentUser}
				<NotificationsDropdown />
			{/if}

			<!-- User Menu -->
			{#if $currentUser}
				<DropdownMenu.Root open={userMenuOpen} onOpenChange={handleUserMenuOpenChange}>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="sm"
								class="relative h-8 w-8 rounded-full"
								aria-label={t('header.userMenu')}
								aria-expanded={userMenuOpen}
							>
								{#if $currentUser && $currentUser.avatar}
									<img
										src={pb.files.getURL($currentUser, $currentUser.avatar, { thumb: '40x40' })}
										alt={t('header.avatarAlt', {
											name:
												$currentUser?.name ||
												$currentUser?.username ||
												$currentUser?.email?.split('@')[0] ||
												t('header.defaultUserName')
										})}
										class="h-8 w-8 rounded-full object-cover"
									/>
								{:else}
									<User class="h-4 w-4" />
								{/if}
								<span class="sr-only">{t('header.openUserMenu')}</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-56" align="end">
						<DropdownMenu.Label class="font-normal">
							<div class="flex flex-col space-y-1">
								<p class="text-sm leading-none font-medium">{$currentUser.name}</p>
								<p class="text-xs leading-none text-muted-foreground">
									@{$currentUser.username || $currentUser.email?.split('@')[0] || 'user'}
								</p>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Item>
								<User class="mr-2 h-4 w-4" aria-hidden="true" />
								<a href="/profile" class="flex-1">{t('header.profile')}</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item onSelect={openSettings}>
								<Settings class="mr-2 h-4 w-4" aria-hidden="true" />
								<span>{t('header.settings')}</span>
							</DropdownMenu.Item>
							{#if $currentUser.isAdmin}
								<DropdownMenu.Item>
									<Shield class="mr-2 h-4 w-4" aria-hidden="true" />
									<a href="/admin" class="flex-1">{t('header.adminDashboard')}</a>
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
									<span class="flex-1">{t('header.signOut')}</span>
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
				<Button variant="ghost" size="sm" href="/auth/login">{t('header.signIn')}</Button>
				<Button size="sm" href="/auth/register">{t('header.signUp')}</Button>
			{/if}
		</nav>
	</div>
</header>

{#if $currentUser}
	<SettingsModal bind:open={settingsOpen} />
{/if}
