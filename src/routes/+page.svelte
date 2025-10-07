<script lang="ts">
	import { currentUser } from '$lib/pocketbase.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { CheckCircle2, PlaySquare, Users, BookOpen } from '@lucide/svelte';

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
</script>

<svelte:head>
	<title>Campus &mdash; Academic collaboration</title>
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
</section>
