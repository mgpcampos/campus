<script>
	import { t } from '$lib/i18n';
	export let data;
	export let form;
	let { space, role } = data;
	let description = space.description || '';
</script>

<svelte:head>
	<title>Manage {space.name} | Campus</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Manage Space: {space.name}</h1>

<form method="POST" class="space-y-4">
	<div>
		<label for="description" class="block font-medium">{t('spacesManage.descriptionLabel')}</label>
		<textarea
			id="description"
			name="description"
			class="w-full rounded border px-2 py-1"
			rows="4"
			value={data.space.description}
		></textarea>
	</div>
	{#if form?.error}
		<p class="text-red-600">{form.error}</p>
	{:else if form?.success}
		<p class="text-green-600">{form.success}</p>
	{/if}
	<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white"
		>{t('spacesManage.saveButton')}</button
	>
	<a href="/spaces/{data.space.id}" class="inline-block rounded border px-4 py-2"
		>{t('spacesManage.backButton')}</a
	>
</form>
