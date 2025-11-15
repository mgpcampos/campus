<script lang="ts">
	import { LoaderCircle, Save, User } from '@lucide/svelte'
	import { toast } from 'svelte-sonner'
	import type { SuperValidated } from 'sveltekit-superforms'
	import { superForm } from 'sveltekit-superforms'
	import { z } from 'zod'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { fileLikeSchema } from '$lib/schemas/helpers.js'
	import { notifyError } from '$lib/utils/errors.ts'
	import { createClientFormOptions } from '$lib/validation'

	// Profile form schema
	const profileSchema = z.object({
		name: z
			.string()
			.min(1, 'Name is required')
			.max(100, 'Name must be less than 100 characters'),
		username: z
			.string()
			.min(3, 'Username must be at least 3 characters')
			.max(30, 'Username must be less than 30 characters')
			.regex(
				/^[a-zA-Z0-9_]+$/,
				'Username can only contain letters, numbers, and underscores'
			),
		bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
		avatar: fileLikeSchema.optional()
	})

	let {
		data,
		class: className = ''
	}: {
		data: SuperValidated<z.infer<typeof profileSchema>>
		class?: string
	} = $props()

	const { form, errors, enhance, submitting } = superForm(data, {
		...createClientFormOptions(profileSchema),
		onUpdated: ({ form }) => {
			if (form.valid) {
				toast.success('Profile updated successfully!')
			} else {
				toast.error('Please fix the errors below')
			}
		},
		onError: ({ result }) => {
			notifyError(result, { context: 'profile.update' })
		}
	})

	let avatarInput: HTMLInputElement
	let previewUrl: string | null = $state(null)

	function handleAvatarChange(event: Event) {
		const target = event.target as HTMLInputElement
		const file = target.files?.[0]

		if (file) {
			// Validate file type and size
			if (!file.type.startsWith('image/')) {
				toast.error('Please select an image file')
				target.value = ''
				return
			}

			if (file.size > 5 * 1024 * 1024) {
				// 5MB limit
				toast.error('Image must be less than 5MB')
				target.value = ''
				return
			}

			// Create preview URL
			previewUrl = URL.createObjectURL(file)
			$form.avatar = file
		} else {
			previewUrl = null
			$form.avatar = undefined
		}
	}
</script>

<Card.Root class="w-full max-w-2xl {className}">
	<Card.Header>
		<Card.Title>Edit Profile</Card.Title>
		<Card.Description>Update your profile information and avatar</Card.Description>
	</Card.Header>

	<form method="POST" enctype="multipart/form-data" use:enhance>
		<Card.Content class="space-y-6">
			<!-- Avatar Upload -->
			<div class="flex flex-col items-center space-y-4">
				<div class="relative">
					{#if previewUrl}
						<img
							src={previewUrl}
							alt="Avatar preview"
							class="h-24 w-24 rounded-full border-2 border-border object-cover"
						/>
					{:else}
						<div
							class="flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-muted"
						>
							<User class="h-8 w-8 text-muted-foreground" />
						</div>
					{/if}
				</div>

				<div class="flex flex-col items-center space-y-2">
					<Button type="button" variant="outline" size="sm" onclick={() => avatarInput.click()}>
						Choose Avatar
					</Button>
					<input
						bind:this={avatarInput}
						type="file"
						name="avatar"
						accept="image/*"
						class="hidden"
						onchange={handleAvatarChange}
					/>
					<p class="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
				</div>
			</div>

			<!-- Name Field -->
			<div class="space-y-2">
				<Label for="name">Display Name</Label>
				<Input
					id="name"
					name="name"
					type="text"
					bind:value={$form.name}
					placeholder="Your display name"
					aria-describedby={$errors.name ? 'name-error' : undefined}
					class={$errors.name ? 'border-destructive' : ''}
				/>
				{#if $errors.name}
					<p id="name-error" class="text-sm text-destructive" role="alert">
						{$errors.name[0]}
					</p>
				{/if}
			</div>

			<!-- Username Field -->
			<div class="space-y-2">
				<Label for="username">Username</Label>
				<Input
					id="username"
					name="username"
					type="text"
					bind:value={$form.username}
					placeholder="your_username"
					aria-describedby={$errors.username ? 'username-error' : undefined}
					class={$errors.username ? 'border-destructive' : ''}
				/>
				{#if $errors.username}
					<p id="username-error" class="text-sm text-destructive" role="alert">
						{$errors.username[0]}
					</p>
				{/if}
			</div>

			<!-- Bio Field -->
			<div class="space-y-2">
				<Label for="bio">Bio</Label>
				<Textarea
					id="bio"
					name="bio"
					bind:value={$form.bio}
					placeholder="Tell us about yourself..."
					rows={4}
					aria-describedby={$errors.bio ? 'bio-error' : undefined}
					class={$errors.bio ? 'border-destructive' : ''}
				/>
				{#if $errors.bio}
					<p id="bio-error" class="text-sm text-destructive" role="alert">
						{$errors.bio[0]}
					</p>
				{/if}
				<p class="text-xs text-muted-foreground">
					{$form.bio?.length || 0}/500 characters
				</p>
			</div>
		</Card.Content>

		<Card.Footer class="flex justify-between">
			<Button variant="outline" href="/profile">Cancel</Button>
			<Button type="submit" disabled={$submitting}>
				{#if $submitting}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					<Save class="mr-2 h-4 w-4" />
					Save Changes
				{/if}
			</Button>
		</Card.Footer>
	</form>
</Card.Root>
