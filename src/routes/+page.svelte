<script>
	import { currentUser } from '$lib/pocketbase.js';
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-2xl mx-auto text-center">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">Welcome to Campus</h1>
		<p class="text-lg text-gray-600 mb-8">
			A lightweight social network for the education community
		</p>
		
		{#if $currentUser}
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-2">Welcome back, {$currentUser.name}!</h2>
				<p class="text-gray-600">You are successfully authenticated with PocketBase.</p>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-2">Get Started</h2>
				<p class="text-gray-600 mb-4">Join the Campus community to connect with peers and share updates.</p>
				<div class="space-x-4">
					<a href="/auth/login" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
						Sign In
					</a>
					<a href="/auth/register" class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
						Sign Up
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
