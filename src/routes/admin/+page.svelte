<script lang="ts">
import { formatDistanceToNowStrict } from 'date-fns'
import * as Card from '$lib/components/ui/card/index.js'
import { t } from '$lib/i18n'
import type { PageData } from './$types'

type AnalyticsSummary = PageData['analytics']

let { data }: { data: PageData } = $props()
let { admin, analytics, recentEvents, metrics, recentReports, recentModeration } = data

const numberFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 0
})

const floatFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric'
})

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium',
	timeStyle: 'short'
})

const chartWidth = 260
const chartHeight = 88

function sparklinePath(summary: AnalyticsSummary, key: 'pageViews' | 'events') {
	if (!summary?.timeSeries?.length) return ''
	const points = summary.timeSeries
	const maxValue = Math.max(...points.map((point) => point[key]), 1)
	if (maxValue === 0) return ''

	return points
		.map((point, index) => {
			const x = points.length === 1 ? chartWidth : (index / (points.length - 1)) * chartWidth
			const y = chartHeight - (point[key] / maxValue) * chartHeight
			return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
		})
		.join(' ')
}

function vitalStatus(name: 'lcp' | 'cls' | 'fid', value: number | null) {
	if (value == null) return { label: t('adminDashboard.noData'), tone: 'text-muted-foreground' }
	const thresholds = {
		lcp: { good: 2.5, needs: 4 },
		cls: { good: 0.1, needs: 0.25 },
		fid: { good: 100, needs: 300 }
	} as const

	const { good, needs } = thresholds[name]
	const goodLabel = name === 'cls' ? value <= good : value <= good
	const needsLabel = name === 'cls' ? value <= needs : value <= needs
	if (goodLabel)
		return {
			label: t('adminDashboard.vitalsGood'),
			tone: 'text-emerald-600 dark:text-emerald-400'
		}
	if (needsLabel)
		return {
			label: t('adminDashboard.vitalsNeedsAttention'),
			tone: 'text-amber-600 dark:text-amber-400'
		}
	return { label: t('adminDashboard.vitalsPoor'), tone: 'text-destructive' }
}

function eventTone(type: string) {
	switch (type) {
		case 'page':
			return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
		case 'vital':
			return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
		default:
			return 'bg-muted text-muted-foreground'
	}
}
</script>

<svelte:head>
	<title>Admin Dashboard | Campus</title>
</svelte:head>

<div class="space-y-6">
	<header class="space-y-2">
		<h1 class="text-3xl font-semibold tracking-tight">
			{t('adminDashboard.welcomeBack', { name: admin.name })}
		</h1>
		<p class="text-muted-foreground">
			{t('adminDashboard.overview')}
		</p>
	</header>

	<section aria-label="Key metrics" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.totalMembers')}</Card.Title>
				<Card.Description>{t('adminDashboard.registeredAccounts')}</Card.Description>
			</Card.Header>
			<Card.Content class="flex items-end justify-between">
				<span class="text-3xl font-semibold">{numberFormatter.format(metrics.usersTotal)}</span>
				<span class="text-sm text-muted-foreground"
					>{t('adminDashboard.includesAdminsModerators')}</span
				>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.spaces')}</Card.Title>
				<Card.Description>{t('adminDashboard.activeCommunities')}</Card.Description>
			</Card.Header>
			<Card.Content class="text-3xl font-semibold">
				{numberFormatter.format(metrics.spacesTotal)}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.groups')}</Card.Title>
				<Card.Description>{t('adminDashboard.organizedCohorts')}</Card.Description>
			</Card.Header>
			<Card.Content class="text-3xl font-semibold">
				{numberFormatter.format(metrics.groupsTotal)}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.openReportsCard')}</Card.Title>
				<Card.Description>{t('adminDashboard.moderationRequests')}</Card.Description>
			</Card.Header>
			<Card.Content class="flex items-center justify-between">
				<span class="text-3xl font-semibold">{numberFormatter.format(metrics.openReports)}</span>
				<span class="text-sm text-muted-foreground">{t('adminDashboard.needsReview')}</span>
			</Card.Content>
		</Card.Root>
	</section>

	<section class="grid gap-4 lg:grid-cols-[2fr_1fr]">
		<Card.Root>
			<Card.Header
				class="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"
			>
				<div>
					<Card.Title>{t('adminDashboard.engagement')}</Card.Title>
					<Card.Description
						>{t('adminDashboard.lastDays', { days: analytics.rangeDays })}</Card.Description
					>
				</div>
				<div class="flex gap-6 text-sm text-muted-foreground">
					<div>
						<span class="block text-xs tracking-wide uppercase"
							>{t('adminDashboard.pageViews')}</span
						>
						<span class="text-base font-medium text-foreground">
							{numberFormatter.format(analytics.pageViews)}
						</span>
					</div>
					<div>
						<span class="block text-xs tracking-wide uppercase"
							>{t('adminDashboard.uniqueSessions')}</span
						>
						<span class="text-base font-medium text-foreground">
							{numberFormatter.format(analytics.uniqueSessions)}
						</span>
					</div>
					<div>
						<span class="block text-xs tracking-wide uppercase"
							>{t('adminDashboard.activeUsers')}</span
						>
						<span class="text-base font-medium text-foreground">
							{numberFormatter.format(analytics.uniqueUsers)}
						</span>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				{#if analytics.timeSeries.length > 0}
					<div class="relative">
						<svg
							viewBox={`0 0 ${chartWidth} ${chartHeight}`}
							class="h-[140px] w-full text-primary/70"
						>
							<path
								d={sparklinePath(analytics, 'pageViews')}
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
							/>
						</svg>
						<div class="mt-2 flex justify-between text-xs text-muted-foreground">
							{#each analytics.timeSeries as point}
								<span>{dateFormatter.format(new Date(point.date))}</span>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">{t('adminDashboard.noAnalyticsData')}</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.topPages')}</Card.Title>
				<Card.Description>{t('adminDashboard.mostVisited')}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if analytics.topPages.length === 0}
					<p class="text-sm text-muted-foreground">{t('adminDashboard.notEnoughEvents')}</p>
				{:else}
					<ul class="space-y-3 text-sm">
						{#each analytics.topPages as page}
							<li class="flex items-center justify-between gap-2">
								<span class="truncate font-medium text-foreground">{page.page || 'Unknown'}</span>
								<span class="text-muted-foreground">{numberFormatter.format(page.count)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</section>

	<section class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.coreWebVitals')}</Card.Title>
				<Card.Description>{t('adminDashboard.performanceMeasurements')}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#each Object.entries(analytics.vitals) as [key, value]}
					{@const metric = key as 'lcp' | 'cls' | 'fid'}
					{@const status = vitalStatus(metric, value as number | null)}
					<div
						class="flex items-center justify-between border-b border-border/80 pb-3 last:border-none last:pb-0"
					>
						<div class="space-y-1">
							<p class="text-sm font-medium tracking-wide text-muted-foreground uppercase">
								{metric.toUpperCase()}
							</p>
							<p class="text-lg font-semibold text-foreground">
								{value == null ? '—' : floatFormatter.format(value)}
							</p>
						</div>
						<span class={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>
							{status.label}
						</span>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.recentTelemetry')}</Card.Title>
				<Card.Description>{t('adminDashboard.latestAnalyticsEvents')}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if recentEvents.length === 0}
					<p class="text-sm text-muted-foreground">{t('adminDashboard.noTelemetry')}</p>
				{:else}
					<ul class="space-y-3">
						{#each recentEvents as event (event.id)}
							<li
								class="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-card px-4 py-3"
							>
								<div class="space-y-1">
									<p class="text-sm font-semibold text-foreground">{event.name}</p>
									<p class="text-xs text-muted-foreground">
										{event.page || '—'}
									</p>
								</div>
								<div class="text-right text-xs text-muted-foreground">
									<p
										class={`mb-1 inline-flex items-center rounded-full px-2 py-0.5 font-medium ${eventTone(event.type)}`}
									>
										{event.type}
									</p>
									<p>{formatDistanceToNowStrict(new Date(event.created), { addSuffix: true })}</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</section>

	<section class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.openReportsSection')}</Card.Title>
				<Card.Description>{t('adminDashboard.contentAwaitingModeration')}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if recentReports.length === 0}
					<p class="text-sm text-muted-foreground">{t('adminDashboard.noOpenReports')}</p>
				{:else}
					<ul class="space-y-4 text-sm">
						{#each recentReports as report (report.id)}
							<li class="rounded-lg border border-border/70 bg-card p-4">
								<div
									class="flex items-center justify-between text-xs tracking-wide text-muted-foreground uppercase"
								>
									<span>{report.targetType} · {report.status}</span>
									<span
										>{formatDistanceToNowStrict(new Date(report.created), {
											addSuffix: true
										})}</span
									>
								</div>
								<p class="mt-2 text-sm text-foreground">{report.reason}</p>
								<p class="mt-2 text-xs text-muted-foreground">
									Reported by {report.expand?.reporter?.name ||
										report.expand?.reporter?.username ||
										'User'}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t('adminDashboard.moderationLog')}</Card.Title>
				<Card.Description>{t('adminDashboard.recentModerationActions')}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if recentModeration.length === 0}
					<p class="text-sm text-muted-foreground">{t('adminDashboard.noModerationActions')}</p>
				{:else}
					<ul class="space-y-3 text-sm">
						{#each recentModeration as entry (entry.id)}
							<li
								class="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-card px-4 py-3"
							>
								<div class="space-y-1">
									<p class="font-medium text-foreground">{entry.action.replace('_', ' ')}</p>
									<p class="text-xs text-muted-foreground">
										by {entry.expand?.actor?.name || entry.expand?.actor?.username || 'Moderator'}
									</p>
								</div>
								<p class="text-xs text-muted-foreground">
									{dateTimeFormatter.format(new Date(entry.created))}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</section>
</div>
