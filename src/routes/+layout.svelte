<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { pb, currentUser } from '$lib/pocketbase.js';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Initialize PocketBase auth state on mount
	onMount(() => {
		// Sync auth state with server on client-side hydration
		currentUser.set(pb.authStore.model);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Campus - Academic Social Network</title>
	<meta name="description" content="A lightweight social network for the education community" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{@render children?.()}
</div>
