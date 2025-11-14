<script lang="ts">
import { Calendar, Clock, MapPin, Users } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button/index.js'
import * as Card from '$lib/components/ui/card/index.js'
import * as Tabs from '$lib/components/ui/tabs/index.js'
import { t } from '$lib/i18n'

let { data }: { data: any } = $props()

function formatDate(dateString: string) {
	const date = new Date(dateString)
	return date.toLocaleDateString('pt-BR', {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	})
}

function formatTime(dateString: string) {
	const date = new Date(dateString)
	return date.toLocaleTimeString('pt-BR', {
		hour: 'numeric',
		minute: '2-digit'
	})
}

function getEventDuration(start: string, end: string) {
	const startDate = new Date(start)
	const endDate = new Date(end)
	const diffMs = endDate.getTime() - startDate.getTime()
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
	const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

	if (diffHours > 0) {
		return `${diffHours}h ${diffMins}m`
	}
	return `${diffMins}m`
}

function getScopeLabel(event: any): string {
	switch (event.scopeType) {
		case 'global':
			return t('events.campusWide')
		case 'space':
			return t('events.spaceEvent')
		case 'group':
			return t('events.groupEvent')
		case 'course':
			return t('events.courseEvent')
		default:
			return t('events.event')
	}
}
</script>

<svelte:head>
	<title>{t('events.title')} | Campus</title>
	<meta name="description" content="Browse upcoming and past events" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold">{t('events.title')}</h1>
			<p class="text-muted-foreground">{t('events.subtitle')}</p>
		</div>
		<Button href="/calendar">
			<Calendar class="mr-2 h-4 w-4" />
			{t('events.viewCalendar')}
		</Button>
	</div>

	<Tabs.Root value="upcoming" class="w-full">
		<Tabs.List class="mb-6 grid w-full grid-cols-2">
			<Tabs.Trigger value="upcoming">{t('events.upcoming')}</Tabs.Trigger>
			<Tabs.Trigger value="past">{t('events.past')}</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="upcoming">
			{#if data.upcomingEvents.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<Calendar class="mb-4 h-16 w-16 text-muted-foreground" />
					<h2 class="mb-2 text-xl font-semibold">{t('events.noUpcomingEvents')}</h2>
					<p class="mb-4 text-muted-foreground">{t('events.noUpcomingEventsDescription')}</p>
					<Button href="/calendar">{t('events.createEvent')}</Button>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.upcomingEvents as event}
						<Card.Root class="transition-shadow hover:shadow-md">
							<Card.Header>
								<Card.Title class="mb-2">{event.title}</Card.Title>
								<Card.Description>
									<span class="inline-flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{formatDate(event.start)}
										{t('events.at')}
										{formatTime(event.start)}
									</span>
								</Card.Description>
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

		<Tabs.Content value="past">
			{#if data.pastEvents.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<Calendar class="mb-4 h-16 w-16 text-muted-foreground" />
					<h2 class="mb-2 text-xl font-semibold">{t('events.noPastEvents')}</h2>
					<p class="text-muted-foreground">{t('events.noPastEventsDescription')}</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.pastEvents as event}
						<Card.Root class="opacity-75">
							<Card.Header>
								<Card.Title class="mb-2">{event.title}</Card.Title>
								<Card.Description>
									<span class="inline-flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{formatDate(event.start)}
										{t('events.at')}
										{formatTime(event.start)}
									</span>
								</Card.Description>
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
