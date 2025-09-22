<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { MessageSquare, Users, Plus } from 'lucide-svelte';
</script>

<div class="max-w-4xl mx-auto py-8">
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-4" style="color: #1e293b;">Welcome to Campus</h1>
		<p class="text-xl" style="color: #64748b;">
			A lightweight social network designed for the education community
		</p>
	</div>
	
	{#if $currentUser}
		<div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
			<h2 class="text-2xl font-semibold mb-2">Welcome back, {$currentUser.name}!</h2>
			<p class="text-gray-600 mb-4">You're successfully connected to Campus.</p>
			<div class="space-x-4">
				<Button>View Feed</Button>
				<Button variant="outline">Browse Spaces</Button>
			</div>
		</div>
	{:else}
		<Card.Root class="max-w-2xl mx-auto">
			<Card.Header class="text-center">
				<Card.Title class="text-2xl">Get Started</Card.Title>
				<Card.Description class="text-lg">
					Join the Campus community to connect with peers and share updates.
				</Card.Description>
			</Card.Header>
			<Card.Footer class="flex justify-center space-x-4">
				<Button href="/auth/register" size="lg">
					Sign Up
				</Button>
				<Button href="/auth/login" variant="outline" size="lg">
					Sign In
				</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
