<script>
	import { t } from '$lib/i18n'
</script>

<svelte:head>
	<title>Groups Removed | Campus</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="space-y-4 py-10 text-center">
	<h1 class="text-2xl font-semibold">{t('groupDetail.groupsUnavailable')}</h1>
	<p class="text-muted-foreground">
		This space no longer supports groups. Please connect through spaces directly instead.
	</p>
	<a
		class="inline-flex items-center justify-center rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
		href="/spaces"
	>
		Go to Spaces
	</a>
</div>
