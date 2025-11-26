<svelte:options runes />

<script lang="ts">
	import { ImagePlus, Loader2 } from 'lucide-svelte'
	import { enhance } from '$app/forms'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { t } from '$lib/i18n'
	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()

	let name = $state('')
	let slug = $state('')
	let description = $state('')
	let avatarFile = $state<File | null>(null)
	let avatarPreview = $state<string | null>(null)
	let isSubmitting = $state(false)

	// Auto-generate slug from name (only if slug is empty)
	let autoSlug = $derived(
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	)

	// Update slug if it's empty and we have an auto-generated one
	$effect(() => {
		if (!slug && autoSlug) {
			slug = autoSlug
		}
	})

	function handleAvatarChange(event: Event) {
		const target = event.target as HTMLInputElement
		const file = target.files?.[0]

		if (file) {
			avatarFile = file
			const reader = new FileReader()
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string
			}
			reader.readAsDataURL(file)
		}
	}

	function clearAvatar() {
		avatarFile = null
		avatarPreview = null
	}
</script>

<svelte:head>
	<title>{t('spacesCreate.pageTitle')}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
	<h1 class="mb-6 text-3xl font-bold">{t('spacesCreate.heading')}</h1>

	{#if form?.error}
		<Card.Root class="mb-6 border-destructive">
			<Card.Content class="pt-6">
				<p class="text-sm text-destructive">{form.error}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Content class="pt-6">
			<form
				method="POST"
				enctype="multipart/form-data"
				class="space-y-6"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
			>
				<div class="space-y-2">
					<Label for="name">{t('spacesCreate.nameLabel')} *</Label>
					<Input
						id="name"
						name="name"
						bind:value={name}
						required
						placeholder="Instituto Federal de São Paulo"
						disabled={isSubmitting}
					/>
				</div>

				<div class="space-y-2">
					<Label for="slug">{t('spacesCreate.slugLabel')} *</Label>
					<Input
						id="slug"
						name="slug"
						bind:value={slug}
						required
						placeholder="ifsp"
						pattern="[a-z0-9\-]+"
						disabled={isSubmitting}
					/>
					<p class="text-xs text-muted-foreground">
						{t('spacesCreate.slugHelper')}
						<code class="rounded bg-muted px-1 py-0.5">/spaces/{slug || ''}</code>
					</p>
				</div>

				<div class="space-y-2">
					<Label for="description">{t('spacesCreate.descriptionLabel')}</Label>
					<Textarea
						id="description"
						name="description"
						bind:value={description}
						rows={4}
						placeholder={t('spacesCreate.descriptionPlaceholder')}
						disabled={isSubmitting}
					/>
					<p class="text-xs text-muted-foreground">
						{description.length} / 1000 characters
					</p>
				</div>

				<div class="space-y-4">
					<Label>{t('spacesCreate.avatarLabel')}</Label>

					{#if avatarPreview}
						<div class="flex items-center gap-4">
							<img
								src={avatarPreview}
								alt="Avatar preview"
								class="h-20 w-20 rounded-full object-cover"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onclick={clearAvatar}
								disabled={isSubmitting}
							>
								Remove
							</Button>
						</div>
					{:else}
						<div class="flex items-center gap-4">
							<div class="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
								<ImagePlus class="h-8 w-8 text-muted-foreground" />
							</div>
							<div class="flex-1">
								<Input
									id="avatar"
									type="file"
									name="avatar"
									accept="image/*"
									onchange={handleAvatarChange}
									disabled={isSubmitting}
									class="cursor-pointer"
								/>
								<p class="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
							</div>
						</div>
					{/if}
				</div>

				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						id="isPublic"
						name="isPublic"
						checked
						disabled={isSubmitting}
						class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
					/>
					<Label for="isPublic" class="cursor-pointer font-normal">
						{t('spacesCreate.publicLabel')}
					</Label>
				</div>

				<div class="flex gap-3">
					<Button type="submit" disabled={isSubmitting} class="flex-1">
						{#if isSubmitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Creating...
						{:else}
							{t('spacesCreate.createButton')}
						{/if}
					</Button>
					<Button type="button" variant="outline" href="/spaces" disabled={isSubmitting}>
						Cancel
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
