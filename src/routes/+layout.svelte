<script lang="ts">
import '../app.css'
import { ModeWatcher, setMode } from 'mode-watcher'
import { onMount } from 'svelte'
import { SvelteURL } from 'svelte/reactivity'
import { dev } from '$app/environment'
import { page } from '$app/stores'
import Header from '$lib/components/layout/Header.svelte'
import Sidebar from '$lib/components/layout/Sidebar.svelte'
import ConnectionStatus from '$lib/components/ui/ConnectionStatus.svelte'
import LiveRegion from '$lib/components/ui/LiveRegion.svelte'
import SkipLinks from '$lib/components/ui/SkipLinks.svelte'
import { Toaster } from '$lib/components/ui/sonner/index.js'
import { config } from '$lib/config.js'
import { initLocale, setLocale } from '$lib/i18n/index.js'
import { currentUser, hydrateClientAuth } from '$lib/pocketbase.js'
import { initAnalytics } from '$lib/services/analytics'
import { initConnectionListeners, online } from '$lib/stores/connection'

let { children, data } = $props()

const themeColor = '#0f172a'

const siteOrigin = dev ? undefined : config.app.origin

const defaultMeta = {
	title: 'Campus | Academic Collaboration Hub',
	description:
		'Campus unites research updates, shared resources, and academic event planning in a single collaborative workspace.',
	ogTitle: 'Campus | Academic Collaboration Hub',
	ogDescription:
		'Collaborate across labs, courses, and cohorts with Campus: share updates, resources, and events in one place.',
	ogType: 'website',
	ogImage: '/og-default.png',
	ogUrl: siteOrigin ?? 'http://localhost:4173/',
	twitterCard: 'summary_large_image',
	twitterTitle: 'Campus | Academic Collaboration Hub',
	twitterDescription:
		'Join Campus to publish research updates, manage course materials, and coordinate events with your academic community.',
	twitterImage: '/og-default.png'
}

const profiledMeta = $derived.by(() => {
	const dataMeta = $page.data?.meta ?? {}

	const mergeImage = (value?: string) => {
		if (!value) return defaultMeta.ogImage
		return value.startsWith('http')
			? value
			: `${siteOrigin ?? ''}${value.startsWith('/') ? value : `/${value}`}`
	}

	const ogImage = mergeImage(dataMeta.ogImage)
	const twitterImage = mergeImage(dataMeta.twitterImage ?? dataMeta.ogImage)

	return {
		...defaultMeta,
		...dataMeta,
		title: dataMeta.title ?? defaultMeta.title,
		description: dataMeta.description ?? defaultMeta.description,
		ogTitle: dataMeta.ogTitle ?? dataMeta.title ?? defaultMeta.ogTitle,
		ogDescription: dataMeta.ogDescription ?? dataMeta.description ?? defaultMeta.ogDescription,
		ogType: dataMeta.ogType ?? defaultMeta.ogType,
		ogImage,
		ogUrl: dataMeta.ogUrl ?? defaultMeta.ogUrl,
		twitterCard: dataMeta.twitterCard ?? defaultMeta.twitterCard,
		twitterTitle: dataMeta.twitterTitle ?? dataMeta.title ?? defaultMeta.twitterTitle,
		twitterDescription:
			dataMeta.twitterDescription ?? dataMeta.description ?? defaultMeta.twitterDescription,
		twitterImage
	}
})

const canonicalHref = $derived.by(() => {
	const { url } = $page

	if (!siteOrigin) {
		return dev ? '' : (url?.href ?? '')
	}

	try {
		const canonical = new SvelteURL(url.pathname, siteOrigin)
		canonical.search = ''
		canonical.hash = ''
		return canonical.toString()
	} catch (error) {
		console.error('Failed to compute canonical URL', error)
		return ''
	}
})

function syncAuthState() {
	currentUser.set(data.user)
	hydrateClientAuth(data.sessionToken, data.user)
}

// Reflect server-provided user data immediately for SSR and CSR hydration
syncAuthState()

// Keep currentUser aligned with layout data on prop changes
$effect(() => {
	syncAuthState()
})

function focusHashTarget(hash: string) {
	if (typeof document === 'undefined' || !hash) return

	const id = hash.startsWith('#') ? hash.slice(1) : hash
	if (!id) return

	const target = document.getElementById(id)
	if (!target || !(target instanceof HTMLElement)) return

	const hasExplicitTabIndex = target.hasAttribute('tabindex')
	if (!hasExplicitTabIndex) {
		target.setAttribute('tabindex', '-1')
	}

	target.focus({ preventScroll: true })
	target.scrollIntoView({ block: 'start' })

	if (!hasExplicitTabIndex) {
		const removeTabIndex = () => {
			target.removeAttribute('tabindex')
		}
		target.addEventListener('blur', removeTabIndex, { once: true })
	}
}

// Initialize PocketBase auth state on mount
onMount(() => {
	// Initialize i18n locale from storage/user preference
	const locale = initLocale()

	// If user has a saved locale preference, apply it
	const user = data.user
	if (user?.locale && user.locale !== locale) {
		setLocale(user.locale)
	}

	if (typeof user?.prefersDarkMode === 'boolean') {
		setMode(user.prefersDarkMode ? 'dark' : 'light')
	}

	// Initialize online/offline listeners
	const disposeConnection = initConnectionListeners()
	const teardownAnalytics = initAnalytics()

	const handleHashChange = () => {
		focusHashTarget(window.location.hash)
	}

	const handleSkipLinkActivation = (event: Event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return

		const anchor = target.closest('a[data-skip-link]')
		if (!(anchor instanceof HTMLAnchorElement)) return

		const href = anchor.getAttribute('href')
		if (!href || !href.startsWith('#')) return

		requestAnimationFrame(() => focusHashTarget(href))
	}

	window.addEventListener('hashchange', handleHashChange)
	document.addEventListener('click', handleSkipLinkActivation, true)

	// If the page loads with a hash, ensure focus is applied
	focusHashTarget(window.location.hash)

	return () => {
		disposeConnection?.()
		teardownAnalytics?.()
		window.removeEventListener('hashchange', handleHashChange)
		document.removeEventListener('click', handleSkipLinkActivation, true)
	}
})
</script>

<svelte:head>
	<title>{profiledMeta.title}</title>
	<meta name="description" content={profiledMeta.description} />
	<meta name="theme-color" content={themeColor} />
	<meta name="robots" content={$page.data?.robots ?? config.app.robots} />
	<link rel="icon" href="/favicon.svg" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	{#if canonicalHref}
		<link rel="canonical" href={canonicalHref} />
	{/if}
	<meta property="og:title" content={profiledMeta.ogTitle} />
	<meta property="og:description" content={profiledMeta.ogDescription} />
	<meta property="og:type" content={profiledMeta.ogType} />
	<meta property="og:image" content={profiledMeta.ogImage} />
	<meta property="og:url" content={canonicalHref || profiledMeta.ogUrl} />
	<meta name="twitter:card" content={profiledMeta.twitterCard} />
	<meta name="twitter:title" content={profiledMeta.twitterTitle} />
	<meta name="twitter:description" content={profiledMeta.twitterDescription} />
	<meta name="twitter:image" content={profiledMeta.twitterImage} />
</svelte:head>

<ModeWatcher defaultMode="light" />

<div class="min-h-screen bg-background text-foreground">
	<!-- Skip links for accessibility -->
	<SkipLinks />

	<!-- Header -->
	<Header id="navigation" tabindex="-1" />

	<!-- Offline status banner -->
	{#if !$online}
		<div
			class="flex w-full items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm text-black"
			role="status"
			aria-live="polite"
		>
			<span>Offline. Some actions may fail until connection is restored.</span>
		</div>
	{/if}

	<!-- Mastodon-style Multi-Column Layout -->
	<div class="flex min-h-[calc(100vh-3.5rem)]">
		<!-- Left Sidebar (Navigation) -->
		{#if $currentUser}
			<Sidebar class="flex-shrink-0 border-r border-border/40 bg-background/95" />
		{/if}

		<!-- Main Content Area -->
		<main id="main-content" class="mx-auto w-full max-w-2xl flex-1" tabindex="-1">
			{@render children?.()}
		</main>
	</div>
</div>

<!-- Toast Notifications -->
<Toaster position="bottom-right" richColors closeButton expand={true} duration={4000} />

<!-- Connection Status -->
<ConnectionStatus />

<!-- Live Region for Screen Reader Announcements -->
<LiveRegion />
