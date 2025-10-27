<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { EventRecord } from '../../types/events';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	export let data: PageData;

	let showCreateModal = false;
	let selectedEvent: EventRecord | null = null;
	let isSubmitting = false;
	let modalElement: HTMLElement | null = null;
	let previousFocus: HTMLElement | null = null;
	let liveRegionMessage = '';
	const headingFormatter = new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	const timeFormatter = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});

	function formatDateHeading(date: string): string {
		return headingFormatter.format(new Date(date));
	}

	function formatEventRange(start: string, end: string): string {
		const startDate = new Date(start);
		const endDate = new Date(end);
		const sameDay = startDate.toDateString() === endDate.toDateString();
		const startDateText = dateFormatter.format(startDate);
		const startTimeText = timeFormatter.format(startDate);
		const endDateText = dateFormatter.format(endDate);
		const endTimeText = timeFormatter.format(endDate);

		if (sameDay) {
			return `${startDateText} ${startTimeText} – ${endTimeText}`;
		}
		return `${startDateText} ${startTimeText} – ${endDateText} ${endTimeText}`;
	}

	// Check if user is event creator
	function isCreator(event: EventRecord): boolean {
		return event.createdBy === data.user?.id;
	}

	// Handle form submission
	function handleCreateSubmit() {
		return async ({ result }: any) => {
			if (result.type === 'success') {
				showCreateModal = false;
				liveRegionMessage = t('calendar.eventCreated');
				await invalidateAll();
				// Restore focus to create button
				if (previousFocus) {
					previousFocus.focus();
					previousFocus = null;
				}
			}
			isSubmitting = false;
		};
	}

	function handleDeleteSubmit(eventTitle: string) {
		return async ({ result }: any) => {
			if (result.type === 'success') {
				selectedEvent = null;
				liveRegionMessage = t('calendar.eventDeleted', { title: eventTitle });
				await invalidateAll();
			}
			isSubmitting = false;
		};
	}

	// Open modal with focus management
	function openCreateModal() {
		previousFocus = document.activeElement as HTMLElement;
		showCreateModal = true;
		// Focus will be set after modal renders
		setTimeout(() => {
			const firstInput = modalElement?.querySelector('input, textarea, select') as HTMLElement;
			firstInput?.focus();
		}, 0);
	}

	// Close modal with focus restoration
	function closeCreateModal() {
		showCreateModal = false;
		if (previousFocus) {
			previousFocus.focus();
			previousFocus = null;
		}
	}

	// Handle modal keyboard events
	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeCreateModal();
		} else if (e.key === 'Tab') {
			// Trap focus within modal
			const focusableElements = modalElement?.querySelectorAll(
				'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
			);
			if (!focusableElements || focusableElements.length === 0) return;

			const firstElement = focusableElements[0] as HTMLElement;
			const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

			if (e.shiftKey && document.activeElement === firstElement) {
				e.preventDefault();
				lastElement.focus();
			} else if (!e.shiftKey && document.activeElement === lastElement) {
				e.preventDefault();
				firstElement.focus();
			}
		}
	}

	// Mount lifecycle for modal setup
	onMount(() => {
		return () => {
			// Cleanup on unmount
			if (previousFocus) {
				previousFocus.focus();
			}
		};
	});

	// Group events by date
	function groupEventsByDate(events: EventRecord[]): [string, EventRecord[]][] {
		const grouped: Record<string, EventRecord[]> = {};

		events.forEach((event) => {
			const date = new Date(event.start).toDateString();
			if (!grouped[date]) {
				grouped[date] = [];
			}
			grouped[date].push(event);
		});

		return Object.entries(grouped).sort(
			([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()
		);
	}

	$: groupedEvents = groupEventsByDate(data.events);
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
			aria-label="Create new event"
		>
			{t('calendar.createEvent')}
		</button>
	</div>

	{#if data.events.length === 0}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
			<p class="text-gray-600">{t('calendar.noEvents')}</p>
		</div>
	{:else}
		<div class="space-y-6" role="feed" aria-label="Calendar events">
			{#each groupedEvents as [date, events], groupIndex}
				<section aria-labelledby="date-heading-{groupIndex}">
					<h2 id="date-heading-{groupIndex}" class="mb-3 text-xl font-semibold text-gray-900">
						{formatDateHeading(date)}
					</h2>
					<div class="space-y-3">
						{#each events as event}
							<article
								class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
								aria-labelledby="event-title-{event.id}"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<h3 id="event-title-{event.id}" class="text-lg font-semibold text-gray-900">
											{event.title}
										</h3>
										<p class="text-sm text-gray-600">
											{formatEventRange(event.start, event.end)}
										</p>
										{#if event.description}
											<p class="mt-2 text-gray-700">{event.description}</p>
										{/if}
									</div>

									<div class="ml-4 flex flex-col gap-2">
										{#if isCreator(event)}
											<form
												method="POST"
												action="?/deleteEvent"
												use:enhance={() => handleDeleteSubmit(event.title)}
											>
												<input type="hidden" name="eventId" value={event.id} />
												<button
													type="submit"
													disabled={isSubmitting}
													class="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50"
													aria-label="Delete {event.title}"
												>
													Delete
												</button>
											</form>
										{/if}
									</div>
								</div>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
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
			<h2 id="modal-title" class="mb-4 text-2xl font-bold">Create Event</h2>

			<form method="POST" action="?/createEvent" use:enhance={handleCreateSubmit} class="space-y-4">
				<div>
					<label for="title" class="block text-sm font-medium text-gray-700">Title *</label>
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
						>Description</label
					>
					<textarea
						id="description"
						name="description"
						rows="3"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					></textarea>
				</div>

				<div>
					<label for="date" class="block text-sm font-medium text-gray-700">Date & Time *</label>
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
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
						aria-live="polite"
						aria-busy={isSubmitting}
					>
						{isSubmitting ? 'Creating...' : 'Create Event'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
