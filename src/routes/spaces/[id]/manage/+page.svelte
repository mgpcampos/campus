<svelte:options runes />

<script lang="ts">
	import { ArrowLeft, ImagePlus, Loader2, Save, Settings, Users } from 'lucide-svelte'
	import { enhance } from '$app/forms'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Switch } from '$lib/components/ui/switch/index.js'
	import * as Tabs from '$lib/components/ui/tabs/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { t } from '$lib/i18n'
	import { pbFileUrl } from '$lib/utils/images.js'
	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()
	let { space, role } = data

	let name = $state(space.name || '')
	let description = $state(space.description || '')
	let isPublic = $state(space.isPublic ?? true)
	let avatarFile = $state<File | null>(null)
	let avatarPreview = $state<string | null>(null)
	let isSubmitting = $state(false)

	// Show current avatar if exists
	$effect(() => {
		if (space.avatar) {
			avatarPreview = pbFileUrl('spaces', space.id, space.avatar)
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
	<title>{t('spacesManage.pageTitle', { name: space.name })}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">{t('spacesManage.heading')}</h1>
			<p class="text-muted-foreground">{space.name}</p>
		</div>
		<Button variant="outline" href="/spaces/{space.slug || space.id}">
			<ArrowLeft class="mr-2 h-4 w-4" />
			{t('spacesManage.backToSpace')}
		</Button>
	</div>

	{#if form?.error}
		<Card.Root class="mb-6 border-destructive">
			<Card.Content class="pt-6">
				<p class="text-sm text-destructive">{form.error}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if form?.success}
		<Card.Root class="mb-6 border-green-500">
			<Card.Content class="pt-6">
				<p class="text-sm text-green-600">{t('spacesManage.changesSaved')}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<Tabs.Root value="general" class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="general" class="flex items-center gap-2">
				<Settings class="h-4 w-4" />
				{t('spacesManage.tabGeneral')}
			</Tabs.Trigger>
			<Tabs.Trigger value="members" class="flex items-center gap-2" disabled>
				<Users class="h-4 w-4" />
				{t('spacesManage.tabMembers')}
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="general">
			<Card.Root>
				<Card.Header>
					<Card.Title>{t('spacesManage.settingsTitle')}</Card.Title>
					<Card.Description>{t('spacesManage.settingsDescription')}</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/update"
						enctype="multipart/form-data"
						class="space-y-6"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ result, update }) => {
								await update();
								isSubmitting = false;

								// Reset avatar file after successful submission
								if (result.type === 'success') {
									avatarFile = null;
								}
							};
						}}
					>
						<div class="space-y-2">
							<Label for="name">{t('spacesManage.nameLabel')}</Label>
							<Input
								id="name"
								name="name"
								bind:value={name}
								placeholder={t('spacesManage.namePlaceholder')}
								disabled={role !== 'owner' || isSubmitting}
							/>
							{#if role !== 'owner'}
								<p class="text-xs text-muted-foreground">{t('spacesManage.nameOwnerOnly')}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="description">{t('spacesManage.descriptionLabel')}</Label>
							<Textarea
								id="description"
								name="description"
								bind:value={description}
								rows={5}
								placeholder={t('spacesManage.descriptionPlaceholder')}
								disabled={isSubmitting}
							/>
							<p class="text-xs text-muted-foreground">
								{t('spacesManage.characterCount', { count: description.length })}
							</p>
						</div>

						<div class="space-y-4">
							<Label>{t('spacesManage.avatarLabel')}</Label>

							{#if avatarPreview}
								<div class="flex items-center gap-4">
									<img
										src={avatarPreview}
										alt={t('spacesManage.avatarAlt')}
										class="h-20 w-20 rounded-full object-cover"
									/>
									<div class="flex flex-col gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onclick={clearAvatar}
											disabled={isSubmitting}
										>
											{t('spacesManage.changeAvatar')}
										</Button>
										{#if avatarFile}
											<p class="text-xs text-muted-foreground">{t('spacesManage.newImageSelected')}</p>
										{/if}
									</div>
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
										<p class="mt-1 text-xs text-muted-foreground">{t('spacesManage.avatarFileInfo')}</p>
									</div>
								</div>
							{/if}
						</div>

						{#if role === 'owner'}
							<div class="flex items-center justify-between rounded-lg border p-4">
								<div class="space-y-0.5">
									<Label for="isPublic" class="text-base">{t('spacesManage.publicLabel')}</Label>
									<p class="text-sm text-muted-foreground">
										{t('spacesManage.publicDescription')}
									</p>
								</div>
								<Switch
									id="isPublic"
									name="isPublic"
									bind:checked={isPublic}
									disabled={isSubmitting}
								/>
							</div>
						{/if}

						<div class="flex gap-3 pt-4">
							<Button type="submit" disabled={isSubmitting}>
								{#if isSubmitting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{t('spacesManage.saving')}
								{:else}
									<Save class="mr-2 h-4 w-4" />
									{t('spacesManage.saveButton')}
								{/if}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="members">
			<Card.Root>
				<Card.Header>
					<Card.Title>{t('spacesManage.membersTitle')}</Card.Title>
					<Card.Description>{t('spacesManage.membersDescription')}</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						{t('spacesManage.membersComingSoon')}
					</p>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
