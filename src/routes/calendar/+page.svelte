<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit'
	import { onMount } from 'svelte'
	import { enhance } from '$app/forms'
	import { invalidateAll } from '$app/navigation'
	import CalendarGrid from '$lib/components/ui/CalendarGrid.svelte'
	import { t } from '$lib/i18n'
	import type { EventRecord } from '../../types/events'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let showCreateModal = $state(false)
	let selectedEvent: EventRecord | null = $state(null)
	let selectedDate = $state(new Date())
	let isSubmitting = $state(false)
	let modalElement: HTMLElement | null = $state(null)
	let previousFocus: HTMLElement | null = $state(null)
	let liveRegionMessage = $state('')
	const headingFormatter = new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	})

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})

	const timeFormatter = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	})

	function formatDateHeading(date: string): string {
		return headingFormatter.format(new Date(date))
	}

	function formatEventRange(start: string, end: string): string {
		const startDate = new Date(start)
		const endDate = new Date(end)
		const sameDay = startDate.toDateString() === endDate.toDateString()
		const startDateText = dateFormatter.format(startDate)
		const startTimeText = timeFormatter.format(startDate)
		const endDateText = dateFormatter.format(endDate)
		const endTimeText = timeFormatter.format(endDate)

		if (sameDay) {
			return `${startDateText} ${startTimeText} – ${endTimeText}`
		}
		return `${startDateText} ${startTimeText} – ${endDateText} ${endTimeText}`
	}

	// Check if user is event creator
	function isCreator(event: EventRecord): boolean {
		return event.createdBy === data.user?.id
	}

	// Handle form submission
	const handleCreateSubmit: SubmitFunction = () => {
		isSubmitting = true
		return async ({ result }) => {
			if (result.type === 'success') {
				showCreateModal = false
				liveRegionMessage = t('calendar.eventCreated')
				await invalidateAll()
				// Restore focus to create button
				if (previousFocus) {
					previousFocus.focus()
					previousFocus = null
				}
			}
			isSubmitting = false
		}
	}

	function handleDeleteSubmit(eventTitle: string): SubmitFunction {
		return () => {
			isSubmitting = true
			return async ({ result }) => {
				if (result.type === 'success') {
					selectedEvent = null
					liveRegionMessage = t('calendar.eventDeleted', { title: eventTitle })
					await invalidateAll()
				}
				isSubmitting = false
			}
		}
	}

	// Open modal with focus management
	function openCreateModal() {
		previousFocus = document.activeElement as HTMLElement
		showCreateModal = true
		// Focus will be set after modal renders
		setTimeout(() => {
			const firstInput = modalElement?.querySelector('input, textarea, select') as HTMLElement
			firstInput?.focus()
		}, 0)
	}

	// Close modal with focus restoration
	function closeCreateModal() {
		showCreateModal = false
		if (previousFocus) {
			previousFocus.focus()
			previousFocus = null
		}
	}

	// Handle modal keyboard events
	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeCreateModal()
		} else if (e.key === 'Tab') {
			// Trap focus within modal
			const focusableElements = modalElement?.querySelectorAll(
				'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
			)
			if (!focusableElements || focusableElements.length === 0) return

			const firstElement = focusableElements[0] as HTMLElement
			const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

			if (e.shiftKey && document.activeElement === firstElement) {
				e.preventDefault()
				lastElement.focus()
			} else if (!e.shiftKey && document.activeElement === lastElement) {
				e.preventDefault()
				firstElement.focus()
			}
		}
	}

	// Mount lifecycle for modal setup
	onMount(() => {
		return () => {
			// Cleanup on unmount
			if (previousFocus) {
				previousFocus.focus()
			}
		}
	})

	// Group events by date
	function groupEventsByDate(events: EventRecord[]): [string, EventRecord[]][] {
		const grouped: Record<string, EventRecord[]> = {}

		events.forEach((event) => {
			const date = new Date(event.start).toDateString()
			if (!grouped[date]) {
				grouped[date] = []
			}
			grouped[date].push(event)
		})

		return Object.entries(grouped).sort(
			([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()
		)
	}

	// Get events for the selected date
	function getEventsForSelectedDate(events: EventRecord[], date: Date): EventRecord[] {
		const dateStr = date.toDateString()
		return events.filter((event) => {
			const eventDate = new Date(event.start)
			return eventDate.toDateString() === dateStr
		})
	}

	// Handle date selection from calendar
	function handleDateSelect(date: Date) {
		selectedDate = date
	}

	// Handle event click from calendar
	function handleEventClick(event: { id: string; title: string; start: string; end: string }) {
		const foundEvent = data.events.find((e) => e.id === event.id)
		if (foundEvent) {
			selectedEvent = foundEvent
		}
	}

	let groupedEvents = $derived(groupEventsByDate(data.events))
	let selectedDateEvents = $derived(getEventsForSelectedDate(data.events, selectedDate))
</script>

<svelte:head>
	<title>{t('calendar.pageTitle')}</title>
</svelte:head>

<!-- Accessible live region for dynamic updates -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
	{liveRegionMessage}
</div>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">{t('calendar.heading')}</h1>
		<button
			onclick={openCreateModal}
			class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			aria-label={t('calendar.createEvent')}
		>
			{t('calendar.createEvent')}
		</button>
	</div>

	<!-- Calendar Grid and Events Panel -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Calendar Grid - takes 2 columns on large screens -->
		<div class="lg:col-span-2">
			<CalendarGrid
				events={data.events.map((e) => ({
					id: e.id,
					title: e.title,
					start: e.start,
					end: e.end
				}))}
				bind:selectedDate
				onDateSelect={handleDateSelect}
				onEventClick={handleEventClick}
			/>
		</div>

		<!-- Selected Date Events Panel -->
		<div class="lg:col-span-1">
			<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
				<h2 class="mb-4 text-lg font-semibold">
					{t('calendar.selectedDateEvents')}
				</h2>
				<p class="mb-4 text-sm text-muted-foreground">
					{formatDateHeading(selectedDate.toDateString())}
				</p>

				{#if selectedDateEvents.length === 0}
					<p class="text-muted-foreground">{t('calendar.noEvents')}</p>
				{:else}
					<div class="space-y-3">
						{#each selectedDateEvents as event}
							<article
								class="rounded-lg border border-border bg-muted p-3"
								aria-labelledby="event-title-{event.id}"
							>
								<h3 id="event-title-{event.id}" class="font-semibold text-foreground">
									{event.title}
								</h3>
								<p class="text-sm text-muted-foreground">
									{formatEventRange(event.start, event.end)}
								</p>
								{#if event.description}
									<p class="mt-2 text-sm text-foreground/80">{event.description}</p>
								{/if}

								{#if isCreator(event)}
									<form
										method="POST"
										action="?/deleteEvent"
										use:enhance={handleDeleteSubmit(event.title)}
										class="mt-2"
									>
										<input type="hidden" name="eventId" value={event.id} />
										<button
											type="submit"
											disabled={isSubmitting}
											class="rounded border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 focus:ring-2 focus:ring-destructive focus:outline-none disabled:opacity-50"
											aria-label="Delete {event.title}"
										>
											{t('common.delete')}
										</button>
									</form>
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Create Event Modal -->
{#if showCreateModal}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		tabindex="-1"
		aria-labelledby="modal-title"
		aria-modal="true"
		onkeydown={handleModalKeydown}
	>
		<div
			bind:this={modalElement}
			class="max-h-screen w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
		>
			<h2 id="modal-title" class="mb-4 text-2xl font-bold">{t('calendarCreate.heading')}</h2>

			<form method="POST" action="?/createEvent" use:enhance={handleCreateSubmit} class="space-y-4">
				<div>
					<label for="title" class="block text-sm font-medium text-gray-700"
						>{t('calendarCreate.titleLabel')}</label
					>
					<input
						type="text"
						id="title"
						name="title"
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="description" class="block text-sm font-medium text-gray-700"
						>{t('calendarCreate.descriptionLabel')}</label
					>
					<textarea
						id="description"
						name="description"
						rows="3"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					></textarea>
				</div>

				<div>
					<label for="date" class="block text-sm font-medium text-gray-700"
						>{t('calendarCreate.dateLabel')}</label
					>
					<input
						type="datetime-local"
						id="date"
						name="date"
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={closeCreateModal}
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:outline-none"
					>
						{t('calendarCreate.cancelButton')}
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
						aria-live="polite"
						aria-busy={isSubmitting}
					>
						{isSubmitting ? t('calendarCreate.creatingButton') : t('calendarCreate.createButton')}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
