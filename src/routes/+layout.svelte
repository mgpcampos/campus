<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { currentUser, hydrateClientAuth } from '$lib/pocketbase.js';
	import { onMount } from 'svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import SkipLinks from '$lib/components/ui/SkipLinks.svelte';
	import LiveRegion from '$lib/components/ui/LiveRegion.svelte';
	import ConnectionStatus from '$lib/components/ui/ConnectionStatus.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { online, initConnectionListeners } from '$lib/stores/connection';
	import { initAnalytics } from '$lib/services/analytics';

	let { children, data } = $props();

	function syncAuthState() {
		currentUser.set(data.user);
		hydrateClientAuth(data.sessionToken, data.user);
	}

	// Reflect server-provided user data immediately for SSR and CSR hydration
	syncAuthState();

	// Keep currentUser aligned with layout data on prop changes
	$effect(() => {
		syncAuthState();
	});

	// Initialize PocketBase auth state on mount
	onMount(() => {
		// Initialize online/offline listeners
		const disposeConnection = initConnectionListeners();
		const teardownAnalytics = initAnalytics();

		return () => {
			disposeConnection?.();
			teardownAnalytics?.();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Campus - Academic Social Network</title>
	<meta name="description" content="A lightweight social network for the education community" />
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<!-- Skip links for accessibility -->
	<SkipLinks />

	<!-- Header -->
	<Header id="navigation" />

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

	<!-- Main Layout with Sidebar -->
	<div class="flex">
		<!-- Sidebar for authenticated users -->
		{#if $currentUser}
			<Sidebar class="w-64 flex-shrink-0" />
		{/if}

		<!-- Main Content (single unique <main>, aria-label unnecessary) -->
		<main id="main-content" class="container mx-auto max-w-6xl flex-1 px-4 py-6">
			{@render children?.()}
		</main>
	</div>

	<Footer id="footer" class="mt-12" />
</div>

<!-- Toast Notifications -->
<Toaster position="bottom-right" richColors closeButton expand={true} duration={4000} />

<!-- Connection Status -->
<ConnectionStatus />

<!-- Live Region for Screen Reader Announcements -->
<LiveRegion />
