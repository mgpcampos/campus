<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { currentUser } from '$lib/pocketbase.js';
	import { onMount } from 'svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import SkipLinks from '$lib/components/ui/SkipLinks.svelte';
	import LiveRegion from '$lib/components/ui/LiveRegion.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children, data } = $props();

	// Initialize PocketBase auth state on mount
	onMount(() => {
		// Sync auth state with server on client-side hydration
		currentUser.set(data.user);
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

	<!-- Main Layout with Sidebar -->
	<div class="flex">
		<!-- Sidebar for authenticated users -->
		{#if $currentUser}
			<Sidebar class="w-64 flex-shrink-0" />
		{/if}

		<!-- Main Content (single unique <main>, aria-label unnecessary) -->
			<main 
				id="main-content"
				class="flex-1 container mx-auto px-4 py-6 max-w-6xl"
			>
				{@render children?.()}
			</main>
	</div>

	<!-- Footer -->
	<Footer id="footer" />
</div>

<!-- Toast Notifications -->
<Toaster 
	position="bottom-right"
	richColors
	closeButton
	expand={true}
	duration={4000}
/>

<!-- Live Region for Screen Reader Announcements -->
<LiveRegion />
