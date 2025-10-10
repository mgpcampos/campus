<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { CheckCircle2, PlaySquare, Users, BookOpen, Calendar, ArrowRight } from '@lucide/svelte';

	interface Material {
		id: string;
		title: string;
		description?: string;
		format: string;
		created: string;
		expand?: {
			uploader?: {
				name?: string;
				username?: string;
			};
		};
	}

	interface Event {
		id: string;
		title: string;
		start: string;
		end: string;
	}

	interface PageData {
		recentMaterials?: Material[];
		upcomingEvents?: Event[];
	}

	let { data }: { data: PageData } = $props();

	const highlights = [
		{
			title: 'Multimedia feed',
			description:
				'Share research updates with text, image galleries, or short video highlights — complete with accessibility metadata.'
		},
		{
			title: 'Organise course resources',
			description:
				'Upload lecture materials and collaborative notes to the shared repository with powerful search built in.'
		},
		{
			title: 'Coordinate events',
			description:
				'Plan study sessions and lab meetings on the shared calendar with automatic conflict detection.'
		}
	];

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Campus | Academic Collaboration Hub</title>
</svelte:head>

<section class="mx-auto flex max-w-5xl flex-col gap-10 py-10 sm:py-16">
	<div class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
		<div class="space-y-6">
			<h1 class="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
				Collaborate across labs, courses, and cohorts
			</h1>
			<p class="text-lg text-muted-foreground sm:text-xl">
				Campus brings together multimedia updates, resource sharing, and schedule planning so
				academic teams can stay aligned without leaving the platform.
			</p>
			<div class="flex flex-wrap gap-3">
				<Button href="/feed" size="lg">
					<PlaySquare class="mr-2 h-5 w-5" aria-hidden="true" />
					Explore the feed
				</Button>

				{#if $currentUser}
					<Button href="/materials" variant="outline" size="lg">
						<BookOpen class="mr-2 h-5 w-5" aria-hidden="true" />
						Browse materials
					</Button>
				{:else}
					<Button href="/auth/register" variant="outline" size="lg">
						<Users class="mr-2 h-5 w-5" aria-hidden="true" />
						Create an account
					</Button>
				{/if}
			</div>
		</div>
		<div class="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xl">
			<h2 class="text-lg font-semibold text-foreground">What’s new in Campus</h2>
			<ul class="mt-5 space-y-4 text-sm text-muted-foreground">
				<li class="flex items-start gap-3">
					<CheckCircle2 class="mt-1 h-4 w-4 text-emerald-500" aria-hidden="true" />
					<span
						>Rich media feed with video poster support and accessibility-first publishing flow.</span
					>
				</li>
				<li class="flex items-start gap-3">
					<CheckCircle2 class="mt-1 h-4 w-4 text-emerald-500" aria-hidden="true" />
					<span>Analytics instrumentation to keep timeline performance under 2 seconds.</span>
				</li>
				<li class="flex items-start gap-3">
					<CheckCircle2 class="mt-1 h-4 w-4 text-emerald-500" aria-hidden="true" />
					<span
						>Moderation groundwork for upcoming messaging features and cross-surface reports.</span
					>
				</li>
			</ul>
		</div>
	</div>

	<div
		class="grid gap-6 rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm sm:grid-cols-3"
	>
		{#each highlights as item}
			<div class="space-y-2">
				<h3 class="text-lg font-semibold text-foreground">{item.title}</h3>
				<p class="text-sm text-muted-foreground">{item.description}</p>
			</div>
		{/each}
	</div>

	<!-- Featured Materials Section -->
	{#if $currentUser && data.recentMaterials && data.recentMaterials.length > 0}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold tracking-tight text-foreground">Recent Materials</h2>
				<Button href="/materials" variant="ghost">
					View all
					<ArrowRight class="ml-2 h-4 w-4" aria-hidden="true" />
				</Button>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.recentMaterials as material}
					<Card.Root>
						<Card.Header>
							<div class="flex items-start justify-between">
								<Card.Title class="line-clamp-2 text-base">{material.title}</Card.Title>
								<BookOpen class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							</div>
							{#if material.expand?.uploader}
								<Card.Description>
									by {material.expand.uploader.name || material.expand.uploader.username}
								</Card.Description>
							{/if}
						</Card.Header>
						<Card.Content>
							{#if material.description}
								<p class="line-clamp-2 text-sm text-muted-foreground">{material.description}</p>
							{/if}
							<div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
								<span class="capitalize">{material.format}</span>
								<span>{formatDate(material.created)}</span>
							</div>
						</Card.Content>
						<Card.Footer>
							<Button href="/materials" variant="outline" class="w-full">Browse Materials</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Upcoming Events Section -->
	{#if $currentUser && data.upcomingEvents && data.upcomingEvents.length > 0}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold tracking-tight text-foreground">Upcoming Events</h2>
				<Button href="/calendar" variant="ghost">
					View calendar
					<ArrowRight class="ml-2 h-4 w-4" aria-hidden="true" />
				</Button>
			</div>

			<div class="space-y-3">
				{#each data.upcomingEvents as event}
					<Card.Root>
						<Card.Header class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<Card.Title class="text-base">{event.title}</Card.Title>
									<Card.Description class="mt-1">
										{new Date(event.start).toLocaleDateString('en-US', {
											weekday: 'short',
											month: 'short',
											day: 'numeric',
											hour: 'numeric',
											minute: '2-digit'
										})}
									</Card.Description>
								</div>
								<Calendar class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							</div>
						</Card.Header>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</section>
