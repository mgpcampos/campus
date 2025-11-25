<script lang="ts">
	import { BookOpen } from '@lucide/svelte'
	import { goto } from '$app/navigation'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { t } from '$lib/i18n'

	interface Profile {
		id: string
		displayName: string
		role?: string
		department?: string
		biography?: string
		publicationCount?: number
		expand?: {
			user?: {
				email?: string
			}
		}
	}

	interface PageData {
		profiles: Profile[]
	}

	let { data }: { data: PageData } = $props()

	function handleProfileClick(profileId: string) {
		goto(`/profiles/${profileId}`)
	}
</script>

<svelte:head>
	<title>{t('profiles.pageTitle')}</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 py-6 sm:py-10">
	<header>
		<h1 class="text-3xl font-semibold tracking-tight text-foreground">{t('profiles.heading')}</h1>
		<p class="mt-2 text-base text-muted-foreground">
			{t('profiles.subtitle')}
		</p>
	</header>

	<!-- Profiles Grid -->
	{#if data.profiles.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
				<h3 class="mb-2 text-lg font-semibold">{t('profiles.noProfilesFound')}</h3>
				<p class="text-muted-foreground">{t('profiles.noProfilesMessage')}</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.profiles as profile (profile.id)}
				<Card.Root
					class="cursor-pointer transition-shadow hover:shadow-lg"
					onclick={() => handleProfileClick(profile.id)}
					role="article"
					tabindex={0}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleProfileClick(profile.id);
						}
					}}
				>
					<Card.Header>
						<Card.Title class="line-clamp-1">{profile.displayName}</Card.Title>
						<Card.Description>
							<div class="space-y-1">
								{#if profile.role}
									<p class="capitalize">{profile.role}</p>
								{/if}
								{#if profile.department}
									<p class="text-xs">{profile.department}</p>
								{/if}
							</div>
						</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if profile.biography}
							<p class="line-clamp-2 text-sm text-muted-foreground">
								{profile.biography.replace(/<[^>]*>/g, '')}
							</p>
						{/if}

						<div class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
							<BookOpen class="h-4 w-4" aria-hidden="true" />
							<span>{t('profiles.publications', { count: profile.publicationCount || 0 })}</span>
						</div>
					</Card.Content>
					<Card.Footer>
						<Button variant="outline" class="w-full">{t('profiles.viewProfile')}</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
