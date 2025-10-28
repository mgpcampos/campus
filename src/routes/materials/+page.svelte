<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import { materialCreateSchema, materialSearchSchema } from '$lib/schemas/material.js';
	import { withZodClient } from '$lib/validation/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { FileText, Link as LinkIcon, Search, Filter } from '@lucide/svelte';
	import type { MaterialWithUploader } from '$lib/types/materials';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	// Search form
	const searchFormObj = superForm(data.searchForm, {
		validators: withZodClient(materialSearchSchema),
		dataType: 'json',
		resetForm: false
	});
	const { form: searchForm, enhance: searchEnhance } = searchFormObj;

	// Upload form
	const uploadFormObj = superForm(data.uploadForm, {
		validators: false,
		dataType: 'form',
		resetForm: true,
		onUpdated({ form }) {
			if (form.valid) {
				uploadOpen = false;
				window.location.reload();
			}
		}
	});
	const { form: uploadForm, enhance: uploadEnhance, errors, delayed } = uploadFormObj;

	let uploadOpen = $state(false);

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getFormatIcon(format: string) {
		return format === 'link' ? LinkIcon : FileText;
	}

	function buildPageUrl(page: number): string {
		const query = $searchForm.q ? `&q=${encodeURIComponent($searchForm.q as string)}` : '';
		return `?page=${page}${query}`;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">{t('materials.myMaterials')}</h1>
			<p class="text-muted-foreground">{t('materials.subtitle')}</p>
		</div>

		<Dialog.Root bind:open={uploadOpen}>
			<Dialog.Trigger>
				<Button>{t('materials.uploadMaterial')}</Button>
			</Dialog.Trigger>
			<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
				<Dialog.Header>
					<Dialog.Title>{t('materials.uploadNew')}</Dialog.Title>
					<Dialog.Description>{t('materials.uploadDescription')}</Dialog.Description>
				</Dialog.Header>

				<form method="POST" action="?/upload" enctype="multipart/form-data" use:uploadEnhance>
					<div class="space-y-4">
						<div>
							<Label for="title">{t('materials.titleLabel')}</Label>
							<Input
								id="title"
								name="title"
								bind:value={$uploadForm.title}
								placeholder={t('materials.titlePlaceholder')}
							/>
							{#if $errors.title}
								<p class="text-sm text-destructive">{$errors.title}</p>
							{/if}
						</div>

						<div>
							<Label for="description">{t('materials.descriptionLabel')}</Label>
							<textarea
								id="description"
								name="description"
								bind:value={$uploadForm.description}
								placeholder={t('materials.descriptionPlaceholder')}
								class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								rows="3"
							></textarea>
						</div>

						<div>
							<Label for="file">{t('materials.fileLabel')}</Label>
							<Input id="file" name="file" type="file" accept="*/*" />
							{#if $errors.file}
								<p class="text-sm text-destructive">{$errors.file}</p>
							{/if}
						</div>
					</div>

					<Dialog.Footer class="mt-6">
						<Button type="button" variant="outline" onclick={() => (uploadOpen = false)}>
							{t('materials.cancel')}
						</Button>
						<Button type="submit" disabled={$delayed}>
							{$delayed ? t('materials.uploading') : t('materials.upload')}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<form method="GET" use:searchEnhance class="mb-6" role="search" aria-label="Search materials">
		<div class="flex gap-2">
			<div class="relative flex-1">
				<Search class="absolute top-3 left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
				<Input
					name="q"
					bind:value={$searchForm.q}
					placeholder={t('materials.searchPlaceholder')}
					class="pl-9"
					aria-label="Search materials by keyword"
				/>
			</div>
			<Button type="submit">{t('materials.searchButton')}</Button>
		</div>
	</form>

	<div class="mb-4 text-sm text-muted-foreground" role="status" aria-live="polite">
		{t('materials.showing', { count: data.materials.length, total: data.total })}
	</div>

	{#if data.materials.length === 0}
		<Card.Root class="text-center">
			<Card.Content class="py-12">
				<FileText class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 text-lg font-semibold">{t('materials.noMaterialsFound')}</h3>
				<p class="text-muted-foreground">
					{t('materials.noMaterialsHint')}
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div
			class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
			role="feed"
			aria-label="Materials repository"
		>
			{#each data.materials as material (material.id)}
				{@const FormatIcon = getFormatIcon(material.format)}
				{@const uploader = material.expand?.uploader}
				<Card.Root role="article" aria-labelledby="material-title-{material.id}">
					<Card.Header>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<Card.Title class="line-clamp-2 text-lg" id="material-title-{material.id}"
									>{material.title}</Card.Title
								>
								<Card.Description class="mt-1">
									{#if uploader}
										{t('materials.by', { name: uploader.name || uploader.username })}
									{:else}
										{t('materials.unknownUploader')}
									{/if}
								</Card.Description>
							</div>
							<FormatIcon class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						</div>
					</Card.Header>

					<Card.Content>
						{#if material.description}
							<p class="mb-3 line-clamp-2 text-sm text-muted-foreground">
								{material.description}
							</p>
						{/if}

						{#if material.tags && material.tags.length > 0}
							<div class="mb-3 flex flex-wrap gap-1">
								{#each material.tags.slice(0, 3) as tag (tag)}
									<span class="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
										{tag}
									</span>
								{/each}
								{#if material.tags.length > 3}
									<span class="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
										+{material.tags.length - 3} more
									</span>
								{/if}
							</div>
						{/if}

						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<span>{formatDate(material.created)}</span>
						</div>
					</Card.Content>

					<Card.Footer class="flex gap-2">
						<Button
							href="/api/materials/{material.id}"
							variant="outline"
							class="flex-1"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="View details for {material.title}"
						>
							{t('materials.view')}
						</Button>
						<Button
							href="/api/materials/{material.id}/download"
							variant="default"
							class="flex-1"
							aria-label="Download {material.title}"
						>
							{t('materials.download')}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>

		{#if data.totalPages > 1}
			<div class="mt-6 flex items-center justify-center gap-2">
				{#if data.page > 1}
					<Button href={buildPageUrl(data.page - 1)} variant="outline"
						>{t('materials.previous')}</Button
					>
				{/if}

				<span class="text-sm text-muted-foreground">
					{t('materials.pageOf', { page: data.page, total: data.totalPages })}
				</span>

				{#if data.page < data.totalPages}
					<Button href={buildPageUrl(data.page + 1)} variant="outline">{t('materials.next')}</Button
					>
				{/if}
			</div>
		{/if}
	{/if}
</div>
