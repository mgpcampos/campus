<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { EventRecord, EventLocation, EventWithParticipants } from '../../types/events';
	import type { PageData } from './$types';

	export let data: PageData;

	let showCreateModal = false;
	let showConflictWarning = false;
	let conflicts: EventRecord[] = [];
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

	// Parse location from event
	function parseLocation(event: EventRecord): EventLocation | null {
		if (!event.location) return null;
		try {
			return typeof event.location === 'string' ? JSON.parse(event.location) : event.location;
		} catch {
			return null;
		}
	}

	// Format location for display
	function formatLocation(event: EventRecord): string {
		const loc = parseLocation(event);
		if (!loc) return 'No location';
		return loc.type === 'physical' ? loc.value : `Virtual: ${loc.value}`;
	}

	// Check if user is event creator
	function isCreator(event: EventRecord): boolean {
		return event.createdBy === data.user?.id;
	}

	// Get user's RSVP status for an event
	function getUserRSVP(event: EventRecord | EventWithParticipants): string | null {
		const expandedEvent = event as EventWithParticipants;
		if (!expandedEvent.expand?.event_participants_via_event) return null;
		const participants = Array.isArray(expandedEvent.expand.event_participants_via_event)
			? expandedEvent.expand.event_participants_via_event
			: [expandedEvent.expand.event_participants_via_event];

		const userParticipant = participants.find((p: any) => p.user === data.user?.id);
		return userParticipant?.status || null;
	}

	// Handle form submission with conflict detection
	function handleCreateSubmit() {
		return async ({ result }: any) => {
			if (result.type === 'failure' && result.data?.conflicts) {
				conflicts = result.data.conflicts;
				showConflictWarning = true;
				liveRegionMessage = `Conflict detected with ${result.data.conflicts.length} existing event${result.data.conflicts.length > 1 ? 's' : ''}. Please choose a different time.`;
				isSubmitting = false;
				return;
			}

			if (result.type === 'success') {
				showCreateModal = false;
				showConflictWarning = false;
				liveRegionMessage = 'Event created successfully';
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

	function handleRSVPSubmit(eventTitle: string) {
		return async ({ result }: any) => {
			if (result.type === 'success') {
				liveRegionMessage = `RSVP updated for ${eventTitle}`;
				await invalidateAll();
			}
			isSubmitting = false;
		};
	}

	function handleDeleteSubmit(eventTitle: string) {
		return async ({ result }: any) => {
			if (result.type === 'success') {
				selectedEvent = null;
				liveRegionMessage = `${eventTitle} deleted successfully`;
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
		showConflictWarning = false;
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
	<title>Calendar | Campus</title>
</svelte:head>

<!-- Accessible live region for dynamic updates -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
	{liveRegionMessage}
</div>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Calendar</h1>
		<button
			onclick={openCreateModal}
			class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			aria-label="Create new event"
		>
			Create Event
		</button>
	</div>

	{#if data.events.length === 0}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
			<p class="text-gray-600">No events scheduled. Create your first event to get started!</p>
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
										<div class="mt-2 flex items-center gap-4 text-sm text-gray-600">
											<span
												><span aria-hidden="true">📍</span>
												<span class="sr-only">Location:</span>
												{formatLocation(event)}</span
											>
											<span
												><span aria-hidden="true">🔔</span>
												<span class="sr-only">Reminder:</span>
												{event.reminderLeadMinutes || 0} min before</span
											>
											<span class="capitalize">
												<span class="sr-only">Scope:</span>
												{event.scopeType}
												{#if event.scopeId}
													- {event.scopeId}{/if}
											</span>
										</div>
									</div>

									<div class="ml-4 flex flex-col gap-2">
										{#if isCreator(event)}
											<span
												class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
												role="status"
											>
												Creator
											</span>
										{/if}

										<a
											href="/api/events/{event.id}/ics"
											download
											class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
											aria-label="Download ICS file for {event.title}"
										>
											<span aria-hidden="true">📅</span> Export
										</a>

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
													class="w-full rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50"
													aria-label="Delete {event.title}"
												>
													Delete
												</button>
											</form>
										{/if}
									</div>
								</div>

								<!-- RSVP Section -->
								<div class="mt-4 border-t border-gray-200 pt-4">
									<form
										method="POST"
										action="?/rsvp"
										use:enhance={() => handleRSVPSubmit(event.title)}
									>
										<input type="hidden" name="eventId" value={event.id} />
										<fieldset>
											<legend class="text-sm text-gray-700">Your RSVP:</legend>
											<div
												class="mt-1 flex gap-2"
												role="radiogroup"
												aria-label="RSVP status for {event.title}"
											>
												{#each ['going', 'maybe', 'declined'] as status}
													<button
														type="submit"
														name="status"
														value={status}
														disabled={isSubmitting}
														class="rounded px-3 py-1 text-sm capitalize disabled:opacity-50 {getUserRSVP(
															event
														) === status
															? 'bg-blue-600 text-white'
															: 'border border-gray-300 text-gray-700 hover:bg-gray-50'}"
														role="radio"
														aria-checked={getUserRSVP(event) === status}
													>
														{status === 'going'
															? '✓ Going'
															: status === 'maybe'
																? '? Maybe'
																: '✗ Declined'}
													</button>
												{/each}
											</div>
										</fieldset>
									</form>
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

			{#if showConflictWarning}
				<div
					class="mb-4 rounded-lg border border-red-300 bg-red-50 p-4"
					role="alert"
					aria-live="assertive"
				>
					<p class="font-semibold text-red-800">
						<span aria-hidden="true">⚠️</span> Event Conflict Detected
					</p>
					<p class="text-sm text-red-700">
						This event overlaps with {conflicts.length} existing event{conflicts.length > 1
							? 's'
							: ''}:
					</p>
					<ul class="mt-2 list-inside list-disc text-sm text-red-700">
						{#each conflicts as conflict}
							<li>{conflict.title} ({formatEventRange(conflict.start, conflict.end)})</li>
						{/each}
					</ul>
					<p class="mt-2 text-sm text-red-700">Please choose a different time.</p>
				</div>
			{/if}

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

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="start" class="block text-sm font-medium text-gray-700">Start *</label>
						<input
							type="datetime-local"
							id="start"
							name="start"
							required
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
					</div>

					<div>
						<label for="end" class="block text-sm font-medium text-gray-700">End *</label>
						<input
							type="datetime-local"
							id="end"
							name="end"
							required
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="scopeType" class="block text-sm font-medium text-gray-700">Scope *</label>
						<select
							id="scopeType"
							name="scopeType"
							required
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						>
							<option value="global">Global</option>
							<option value="space">Space</option>
							<option value="group">Group</option>
							<option value="course">Course</option>
						</select>
					</div>

					<div>
						<label for="scopeId" class="block text-sm font-medium text-gray-700">Scope ID</label>
						<input
							type="text"
							id="scopeId"
							name="scopeId"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="locationType" class="block text-sm font-medium text-gray-700"
							>Location Type</label
						>
						<select
							id="locationType"
							name="locationType"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						>
							<option value="">None</option>
							<option value="physical">Physical</option>
							<option value="virtual">Virtual</option>
						</select>
					</div>

					<div>
						<label for="locationValue" class="block text-sm font-medium text-gray-700"
							>Location</label
						>
						<input
							type="text"
							id="locationValue"
							name="locationValue"
							placeholder="Room 101 or https://meet.example.com"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
					</div>
				</div>

				<div>
					<label for="reminderLeadMinutes" class="block text-sm font-medium text-gray-700"
						>Reminder (minutes before)</label
					>
					<input
						type="number"
						id="reminderLeadMinutes"
						name="reminderLeadMinutes"
						min="0"
						value="30"
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
