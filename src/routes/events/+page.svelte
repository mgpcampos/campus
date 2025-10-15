<script lang="ts">
	import { Calendar, MapPin, Users, Clock } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	let { data }: { data: any } = $props();

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatTime(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getEventDuration(start: string, end: string) {
		const startDate = new Date(start);
		const endDate = new Date(end);
		const diffMs = endDate.getTime() - startDate.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		if (diffHours > 0) {
			return `${diffHours}h ${diffMins}m`;
		}
		return `${diffMins}m`;
	}

	function getScopeLabel(event: any): string {
		switch (event.scopeType) {
			case 'global':
				return 'Campus-wide';
			case 'space':
				return 'Space Event';
			case 'group':
				return 'Group Event';
			case 'course':
				return 'Course Event';
			default:
				return 'Event';
		}
	}
</script>

<svelte:head>
	<title>Events | Campus</title>
	<meta name="description" content="Browse upcoming and past events" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold">Events</h1>
			<p class="text-muted-foreground">Stay updated with campus activities</p>
		</div>
		<Button href="/calendar">
			<Calendar class="mr-2 h-4 w-4" />
			View Calendar
		</Button>
	</div>

	<Tabs.Root value="upcoming" class="w-full">
		<Tabs.List class="mb-6 grid w-full grid-cols-2">
			<Tabs.Trigger value="upcoming">Upcoming</Tabs.Trigger>
			<Tabs.Trigger value="past">Past</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="upcoming">
			{#if data.upcomingEvents.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<Calendar class="mb-4 h-16 w-16 text-muted-foreground" />
					<h2 class="mb-2 text-xl font-semibold">No upcoming events</h2>
					<p class="mb-4 text-muted-foreground">Check back later or create your own event</p>
					<Button href="/calendar">Create Event</Button>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.upcomingEvents as event}
						<Card.Root class="transition-shadow hover:shadow-md">
							<Card.Header>
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1">
										<Card.Title class="mb-1">{event.title}</Card.Title>
										<Card.Description>
											<span class="inline-flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatDate(event.start)} at {formatTime(event.start)}
											</span>
										</Card.Description>
									</div>
									<span
										class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
									>
										{getScopeLabel(event)}
									</span>
								</div>
							</Card.Header>
							<Card.Content class="space-y-2">
								{#if event.description}
									<p class="text-sm text-muted-foreground">{event.description}</p>
								{/if}
								<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
									<span class="inline-flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{getEventDuration(event.start, event.end)}
									</span>
									{#if event.locationValue}
										<span class="inline-flex items-center gap-1">
											<MapPin class="h-3 w-3" />
											{event.locationValue}
										</span>
									{/if}
									{#if event.expand?.createdBy}
										<span class="inline-flex items-center gap-1">
											<Users class="h-3 w-3" />
											By {event.expand.createdBy.name}
										</span>
									{/if}
								</div>
							</Card.Content>
							<Card.Footer>
								<Button href="/calendar" variant="outline" size="sm">View in Calendar</Button>
							</Card.Footer>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="past">
			{#if data.pastEvents.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<Calendar class="mb-4 h-16 w-16 text-muted-foreground" />
					<h2 class="mb-2 text-xl font-semibold">No past events</h2>
					<p class="text-muted-foreground">Past events will appear here</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.pastEvents as event}
						<Card.Root class="opacity-75">
							<Card.Header>
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1">
										<Card.Title class="mb-1">{event.title}</Card.Title>
										<Card.Description>
											<span class="inline-flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatDate(event.start)} at {formatTime(event.start)}
											</span>
										</Card.Description>
									</div>
									<span
										class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
									>
										{getScopeLabel(event)}
									</span>
								</div>
							</Card.Header>
							{#if event.description}
								<Card.Content>
									<p class="text-sm text-muted-foreground">{event.description}</p>
								</Card.Content>
							{/if}
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
