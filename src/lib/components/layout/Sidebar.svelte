<svelte:options runes />

<script lang="ts">
import {
	BookOpen,
	Calendar,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	MessageSquare,
	Plus,
	Shield,
	User,
	UserCircle,
	Users
} from '@lucide/svelte'
import { page } from '$app/stores'
import { Button } from '$lib/components/ui/button/index.js'
import { t } from '$lib/i18n/index.js'
import { currentUser } from '$lib/pocketbase.js'

let { class: className = '' } = $props()
let expanded = $state(true)

// Navigation items - using derived getter to make them reactive to locale changes
const getNavigationItems = () => [
	{ href: '/feed', label: t('sidebar.feed'), icon: MessageSquare, requiresAuth: false },
	{ href: '/spaces', label: t('sidebar.spaces'), icon: Users, requiresAuth: true },
	{ href: '/events', label: t('sidebar.events'), icon: CalendarDays, requiresAuth: true },
	{ href: '/calendar', label: t('sidebar.calendar'), icon: Calendar, requiresAuth: true },
	{ href: '/materials', label: t('sidebar.materials'), icon: BookOpen, requiresAuth: true },
	{ href: '/profiles', label: t('sidebar.profiles'), icon: UserCircle, requiresAuth: true },
	{ href: '/profile', label: t('sidebar.profile'), icon: User, requiresAuth: true }
]

const getAdminNavItems = () => [
	{ href: '/admin', label: t('sidebar.adminDashboard'), icon: Shield, requiresAuth: true },
	{ href: '/admin/moderation', label: t('sidebar.moderation'), icon: Shield, requiresAuth: true }
]

function isActive(href: string): boolean {
	if (href === '/') {
		return $page.url.pathname === '/'
	}
	return (
		$page.url.pathname === href ||
		$page.url.pathname.startsWith(href.endsWith('/') ? href : `${href}/`)
	)
}

function toggleSidebar() {
	expanded = !expanded
}
</script>

{#if $currentUser}
	<aside
		class={`hidden flex-shrink-0 flex-col bg-background/95 transition-[width] duration-200 md:flex ${expanded ? 'w-64' : 'w-16'} ${className}`}
		aria-label={t('sidebar.navigation')}
	>
		<div class="sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden">
			<nav class="flex h-full flex-col">
				<div
					class={`flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-2'} pt-3 pb-4`}
				>
					{#if expanded}
						<p class="text-xs font-semibold text-muted-foreground uppercase">
							{t('sidebar.menuHeading')}
						</p>
					{:else}
						<span class="sr-only">{t('sidebar.menuCollapsedLabel')}</span>
					{/if}
					<button
						type="button"
						onclick={toggleSidebar}
						class="flex h-8 w-8 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-colors hover:bg-muted focus:ring-2 focus:ring-primary/50 focus:outline-none"
						aria-label={expanded ? t('sidebar.collapseSidebar') : t('sidebar.expandSidebar')}
						aria-expanded={expanded}
					>
						{#if expanded}
							<ChevronLeft class="h-4 w-4" aria-hidden="true" />
						{:else}
							<ChevronRight class="h-4 w-4" aria-hidden="true" />
						{/if}
					</button>
				</div>
				<div class="flex-1 overflow-y-auto px-2 pb-4">
					<div class="space-y-1" role="navigation">
						{#each getNavigationItems() as item}
							{#if !item.requiresAuth || $currentUser}
								{@const IconComponent = item.icon}
								<a
									href={item.href}
									class={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/50 focus:outline-none ${expanded ? 'justify-start' : 'justify-center'} ${
										isActive(item.href)
											? 'bg-primary/10 text-primary'
											: 'text-muted-foreground hover:text-foreground'
									}`}
									aria-label={expanded ? undefined : item.label}
									aria-current={isActive(item.href) ? 'page' : undefined}
								>
									<IconComponent class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
									<span class={expanded ? 'ml-3 inline' : 'sr-only'}>{item.label}</span>
								</a>
							{/if}
						{/each}
					</div>

					{#if $currentUser?.isAdmin}
						<div class="pt-4" aria-labelledby="sidebar-admin-heading">
							<p
								id="sidebar-admin-heading"
								class={expanded
									? 'px-3 text-xs font-semibold text-muted-foreground uppercase'
									: 'sr-only'}
							>
								{t('sidebar.adminSection')}
							</p>
							<div class="mt-1 space-y-1" role="group" aria-labelledby="sidebar-admin-heading">
								{#each getAdminNavItems() as item}
									{@const IconComponent = item.icon}
									<a
										href={item.href}
										class={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/50 focus:outline-none ${expanded ? 'justify-start' : 'justify-center'} ${
											isActive(item.href)
												? 'bg-primary/10 text-primary'
												: 'text-muted-foreground hover:text-foreground'
										}`}
										aria-label={expanded ? undefined : item.label}
										aria-current={isActive(item.href) ? 'page' : undefined}
									>
										<IconComponent class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
										<span class={expanded ? 'ml-3 inline' : 'sr-only'}>{item.label}</span>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</nav>
		</div>
	</aside>
{/if}
