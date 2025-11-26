<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte'
	import type { Snippet } from 'svelte'
	import { t } from '$lib/i18n'

	type EventItem = {
		id: string
		title: string
		start: string
		end: string
	}

	let {
		events = [],
		selectedDate = $bindable(new Date()),
		onDateSelect = (_date: Date) => {},
		onEventClick = (_event: EventItem) => {},
		class: className = ''
	}: {
		events?: EventItem[]
		selectedDate?: Date
		onDateSelect?: (date: Date) => void
		onEventClick?: (event: EventItem) => void
		class?: string
	} = $props()

	// Calendar state
	let currentMonth = $state(new Date(selectedDate))

	// Constants
	const DAYS_IN_WEEK = 7
	const WEEKS_TO_SHOW = 6

	// Computed values
	const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
	const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

	// Get weekday names
	function getWeekdayNames(): string[] {
		const days: string[] = []
		const date = new Date(2024, 0, 7) // A known Sunday
		for (let i = 0; i < 7; i++) {
			days.push(dayFormatter.format(date))
			date.setDate(date.getDate() + 1)
		}
		return days
	}

	const weekdays = getWeekdayNames()

	// Get calendar days for current month view
	function getCalendarDays(
		month: Date
	): { date: Date; isCurrentMonth: boolean; isToday: boolean }[] {
		const year = month.getFullYear()
		const monthIndex = month.getMonth()

		// Get first day of month
		const firstDay = new Date(year, monthIndex, 1)
		const startingDayOfWeek = firstDay.getDay() // 0 = Sunday

		// Get days to show from previous month
		const daysFromPrevMonth = startingDayOfWeek

		// Start from the first visible day
		const startDate = new Date(year, monthIndex, 1 - daysFromPrevMonth)

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = []

		for (let i = 0; i < DAYS_IN_WEEK * WEEKS_TO_SHOW; i++) {
			const date = new Date(startDate)
			date.setDate(startDate.getDate() + i)
			days.push({
				date,
				isCurrentMonth: date.getMonth() === monthIndex,
				isToday: date.getTime() === today.getTime()
			})
		}

		return days
	}

	// Get events for a specific date
	function getEventsForDate(date: Date): EventItem[] {
		const dateStr = date.toDateString()
		return events.filter((event) => {
			const eventDate = new Date(event.start)
			return eventDate.toDateString() === dateStr
		})
	}

	// Check if date is selected
	function isSelected(date: Date): boolean {
		return date.toDateString() === selectedDate.toDateString()
	}

	// Navigation functions
	function previousMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
	}

	function goToToday() {
		const today = new Date()
		currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
		selectedDate = today
		onDateSelect(today)
	}

	// Handle date selection
	function selectDate(date: Date) {
		selectedDate = date
		onDateSelect(date)
	}

	// Derived state
	let calendarDays = $derived(getCalendarDays(currentMonth))
	let monthTitle = $derived(monthFormatter.format(currentMonth))
</script>

<div class="rounded-lg border border-border bg-card shadow-sm {className}">
	<!-- Calendar header with navigation -->
	<div class="flex items-center justify-between border-b border-border p-4">
		<button
			type="button"
			onclick={previousMonth}
			class="rounded-md p-2 hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none"
			aria-label={t('calendar.previousMonth')}
		>
			<ChevronLeft class="h-5 w-5" />
		</button>

		<div class="flex items-center gap-4">
			<h2 class="text-lg font-semibold capitalize">
				{monthTitle}
			</h2>
			<button
				type="button"
				onclick={goToToday}
				class="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none"
			>
				{t('calendar.today')}
			</button>
		</div>

		<button
			type="button"
			onclick={nextMonth}
			class="rounded-md p-2 hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none"
			aria-label={t('calendar.nextMonth')}
		>
			<ChevronRight class="h-5 w-5" />
		</button>
	</div>

	<!-- Weekday headers -->
	<div class="grid grid-cols-7 border-b border-border">
		{#each weekdays as day}
			<div class="p-2 text-center text-sm font-medium text-muted-foreground">
				{day}
			</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="grid grid-cols-7" role="grid" aria-label={t('calendar.heading')}>
		{#each calendarDays as { date, isCurrentMonth, isToday }}
			{@const dayEvents = getEventsForDate(date)}
			{@const selected = isSelected(date)}
			<div
				role="gridcell"
				tabindex="0"
				onclick={() => selectDate(date)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault()
						selectDate(date)
					}
				}}
				class="relative min-h-24 cursor-pointer border-b border-r border-border/50 p-1 text-left transition-colors hover:bg-accent focus:z-10 focus:ring-2 focus:ring-inset focus:ring-ring focus:outline-none
					{isCurrentMonth ? 'bg-card' : 'bg-muted/50'}
					{selected ? 'ring-2 ring-inset ring-ring' : ''}"
				aria-label="{date.toLocaleDateString()}{dayEvents.length > 0 ? `, ${dayEvents.length} ${t('calendar.eventsCount')}` : ''}"
				aria-selected={selected}
			>
				<span
					class="flex h-7 w-7 items-center justify-center rounded-full text-sm
						{isToday ? 'bg-primary font-semibold text-primary-foreground' : ''}
						{!isToday && isCurrentMonth ? 'text-foreground' : ''}
						{!isToday && !isCurrentMonth ? 'text-muted-foreground' : ''}"
				>
					{date.getDate()}
				</span>

				<!-- Event indicators -->
				{#if dayEvents.length > 0}
					<div class="mt-1 space-y-1">
						{#each dayEvents.slice(0, 2) as event}
							<div
								role="button"
								tabindex="0"
								onclick={(e) => {
									e.stopPropagation()
									onEventClick(event)
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.stopPropagation()
										onEventClick(event)
									}
								}}
								class="block w-full cursor-pointer truncate rounded bg-primary/10 px-1 py-0.5 text-left text-xs text-primary hover:bg-primary/20"
							>
								{event.title}
							</div>
						{/each}
						{#if dayEvents.length > 2}
							<span class="text-xs text-muted-foreground">
								+{dayEvents.length - 2} {t('calendar.more')}
							</span>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
