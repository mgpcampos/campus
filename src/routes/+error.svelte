<script lang="ts">
	let { data } = $props<{
		data: {
			error: Error & { status?: number; message?: string };
			status?: number;
		};
	}>();

	function clampStatus(value: number | undefined, fallback: number): number {
		const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
		return Math.min(599, Math.max(400, numericValue));
	}

	const error = data?.error;
	const status = clampStatus(data?.status ?? error?.status, 500);

	const isNotFound = status === 404;
	const title = isNotFound ? '404 – Page not found | Campus' : 'Unexpected error | Campus';
	const description = isNotFound
		? 'We looked everywhere but could not find the page you requested.'
		: 'Something went wrong on our side. Please try again or contact support.';
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
		<span>{isNotFound ? 'Page not found' : 'Error'}</span>
	</div>

	<h1 class="text-3xl font-semibold text-foreground sm:text-4xl">
		{isNotFound ? 'We can’t find that page' : 'We hit a snag'}
	</h1>

	<p class="max-w-xl text-base text-muted-foreground">
		{description}
		{#if !isNotFound}
			({error?.message || 'Unknown error'})
		{/if}
	</p>

	<div class="flex flex-wrap items-center justify-center gap-3">
		<a
			href="/"
			class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			Return home
		</a>
		{#if isNotFound}
			<a
				href="/feed"
				class="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
			>
				Browse the feed
			</a>
		{:else}
			<button
				type="button"
				onclick={() => window.location.reload()}
				class="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
			>
				Try again
			</button>
		{/if}
	</div>

	{#if status === 500}
		<p class="text-xs text-muted-foreground">
			Need more help? Contact
			<a class="font-medium text-primary underline" href="mailto:support@campus.local">
				support@campus.local
			</a>
			.
		</p>
	{/if}
</section>
