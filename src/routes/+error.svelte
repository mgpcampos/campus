<script lang="ts">
import { config } from '$lib/config.js'
import { t } from '$lib/i18n'

let { data } = $props<{
	data: {
		error: Error & { status?: number; message?: string }
		status?: number
	}
}>()

function clampStatus(value: number | undefined, fallback: number): number {
	const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
	return Math.min(599, Math.max(400, numericValue))
}

function generateErrorId(): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 9)
	return `ERR-${timestamp}-${random}`.toUpperCase()
}

const error = data?.error
const status = clampStatus(data?.status ?? error?.status, 500)
const errorId = generateErrorId()
const timestamp = new Date().toISOString()

const isNotFound = status === 404
const title = isNotFound ? t('errors.pageNotFoundTitle') : t('errors.unexpectedErrorTitle')
const description = isNotFound
	? t('errors.pageNotFoundDescription')
	: t('errors.unexpectedErrorDescription')

// Log error details for debugging (only on client)
if (typeof window !== 'undefined' && !isNotFound) {
	console.error('Error Details:', {
		errorId,
		status,
		timestamp,
		message: error?.message,
		error
	})
}
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="robots" content={status === 404 ? 'noindex,follow' : 'noindex'} />
	<meta name="description" content={description} />
</svelte:head>

<section
	class="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center"
>
	<div
		class="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1 text-sm text-muted-foreground"
	>
		<span>{status}</span>
		<span aria-hidden="true">•</span>
		<span>{isNotFound ? t('errors.pageNotFound') : t('errors.error')}</span>
	</div>

	<h1 class="text-3xl font-semibold text-foreground sm:text-4xl">
		{isNotFound ? t('errors.pageNotFoundHeading') : t('errors.errorHeading')}
	</h1>

	<p class="max-w-xl text-base text-muted-foreground">
		{description}
		{#if !isNotFound && error?.message}
			<br />
			<span class="text-sm italic">{error.message}</span>
		{/if}
	</p>

	{#if !isNotFound}
		<div class="rounded-md bg-muted/50 px-4 py-3 text-sm">
			<p class="mb-1 font-medium text-foreground">{t('errors.errorReference')}</p>
			<p class="font-mono text-muted-foreground">{errorId}</p>
			<p class="mt-1 text-xs text-muted-foreground">
				{t('errors.contactSupport')}
			</p>
		</div>
	{/if}

	<div class="flex flex-wrap items-center justify-center gap-3">
		<a
			href="/"
			class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			{t('errors.returnHome')}
		</a>
		{#if isNotFound}
			<a
				href="/feed"
				class="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
			>
				{t('errors.browseFeed')}
			</a>
		{:else}
			<button
				type="button"
				onclick={() => window.location.reload()}
				class="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
			>
				{t('errors.tryAgain')}
			</button>
		{/if}
	</div>

	{#if !isNotFound}
		<p class="text-xs text-muted-foreground">
			{t('errors.needHelp')}
			<a class="font-medium text-primary underline" href="mailto:{config.support.email}">
				{config.support.email}
			</a>
			.
		</p>
	{/if}
</section>
