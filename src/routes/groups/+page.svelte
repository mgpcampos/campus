<script lang="ts">
	import { t } from '$lib/i18n';
</script>

<svelte:head>
	<title>{t('groups.pageTitle')}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-16 text-center">
	<h1 class="mb-4 text-3xl font-semibold">{t('groups.title')}</h1>
	<p class="text-muted-foreground">
		{t('groups.description')}
	</p>
	<div class="mt-6">
		<a class="rounded bg-primary px-4 py-2 text-primary-foreground" href="/spaces">
			{t('groups.browseSpaces')}
		</a>
	</div>
</div>
