<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { pb, currentUser } from '$lib/pocketbase.js';
	import { onMount } from 'svelte';

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

<div class="min-h-screen bg-gray-50">
	<!-- Navigation Header -->
	<nav class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<a href="/" class="text-xl font-bold text-blue-600">Campus</a>
				</div>
				
				<div class="flex items-center space-x-4">
					{#if $currentUser}
						<span class="text-gray-700">Welcome, {$currentUser.name}</span>
						<a 
							href="/profile" 
							class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
						>
							Profile
						</a>
						<a 
							href="/auth/logout" 
							class="bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
						>
							Sign Out
						</a>
					{:else}
						<a 
							href="/auth/login" 
							class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
						>
							Sign In
						</a>
						<a 
							href="/auth/register" 
							class="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
						>
							Sign Up
						</a>
					{/if}
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main>
		{@render children?.()}
	</main>
</div>
