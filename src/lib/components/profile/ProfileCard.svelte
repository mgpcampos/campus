<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { User, MapPin, Calendar, Edit } from 'lucide-svelte';

	interface UserProfile {
		id: string;
		username: string;
		name: string;
		email?: string;
		avatar?: string;
		bio?: string;
		created: string;
		updated: string;
	}

	let { 
		user, 
		isOwnProfile = false,
		class: className = '' 
	}: { 
		user: UserProfile; 
		isOwnProfile?: boolean;
		class?: string;
	} = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long'
		});
	}
</script>

<Card.Root class="w-full max-w-md {className}">
	<Card.Header class="text-center">
		<div class="flex justify-center mb-4">
			{#if user.avatar}
				<img 
					src={user.avatar} 
					alt="{user.name}'s avatar"
					class="w-20 h-20 rounded-full object-cover border-2 border-border"
				/>
			{:else}
				<div class="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
					<User class="w-8 h-8 text-muted-foreground" />
				</div>
			{/if}
		</div>
		<Card.Title class="text-xl">{user.name}</Card.Title>
		<Card.Description class="text-muted-foreground">
			@{user.username}
		</Card.Description>
	</Card.Header>

	{#if user.bio}
		<Card.Content class="text-center">
			<p class="text-sm text-muted-foreground leading-relaxed">
				{user.bio}
			</p>
		</Card.Content>
	{/if}

	<Card.Footer class="flex flex-col space-y-3">
		<div class="flex items-center justify-center text-xs text-muted-foreground">
			<Calendar class="w-3 h-3 mr-1" />
			Joined {formatDate(user.created)}
		</div>
		
		{#if isOwnProfile}
			<Button variant="outline" size="sm" href="/profile/edit" class="w-full">
				<Edit class="w-4 h-4 mr-2" />
				Edit Profile
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>