<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { User, MapPin, Calendar, Edit } from '@lucide/svelte';
	import { pb } from '$lib/pocketbase.js';

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
		<div class="mb-4 flex justify-center">
			{#if user.avatar}
				<img
					src={pb.files.getURL(user, user.avatar, { thumb: '80x80' })}
					alt="{user.name}'s avatar"
					class="h-20 w-20 rounded-full border-2 border-border object-cover"
				/>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-muted"
				>
					<User class="h-8 w-8 text-muted-foreground" />
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
			<p class="text-sm leading-relaxed text-muted-foreground">
				{user.bio}
			</p>
		</Card.Content>
	{/if}

	<Card.Footer class="flex flex-col space-y-3">
		<div class="flex items-center justify-center text-xs text-muted-foreground">
			<Calendar class="mr-1 h-3 w-3" />
			Joined {formatDate(user.created)}
		</div>

		{#if isOwnProfile}
			<Button variant="outline" size="sm" href="/profile/edit" class="w-full">
				<Edit class="mr-2 h-4 w-4" />
				Edit Profile
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
