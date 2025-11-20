<svelte:options runes />

<script lang="ts">
	import { FileVideo, ImagePlus, Loader2, MessageSquare, Video, X } from '@lucide/svelte'
	import { createEventDispatcher, onDestroy } from 'svelte'
	import { writable } from 'svelte/store'
	import { toast } from 'svelte-sonner'
	import type { SuperValidated } from 'sveltekit-superforms'
	import { superForm } from 'sveltekit-superforms/client'
	import type { z } from 'zod'
	import { ariaValidity } from '$lib/actions/ariaValidity'
	import type { FeedPost } from '$lib/components/feed/types'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { t } from '$lib/i18n'
	import { createPostSchema } from '$lib/schemas/post.js'
	import { MAX_ATTACHMENTS, validateImages, validateVideo } from '$lib/utils/media.js'
	import { createClientFormOptions } from '$lib/validation'

	type PostFormMessage = {
		type: 'success' | 'error'
		text: string
		post?: FeedPost
	}
	type PostFormData = SuperValidated<z.infer<typeof createPostSchema>, PostFormMessage>
	type AttachmentPreview = { file: File; url: string }
	type UserSpace = { id: string; name: string; avatar?: string }

	let {
		formData,
		disabled = false,
		userSpaces = []
	} = $props<{ formData: PostFormData; disabled?: boolean; userSpaces?: UserSpace[] }>()

	// Media type constants for auto-detection
	const ALLOWED_IMAGE_MIME = [
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/gif',
		'image/heic',
		'image/heif'
	]
	const ALLOWED_VIDEO_MIME = ['video/mp4']

	const dispatch = createEventDispatcher<{ postCreated: FeedPost }>()

	const attachments = writable<AttachmentPreview[]>([])
	const uploadError = writable<string | null>(null)
	const generalError = writable<string | null>(null)
	const videoDurationDisplay = writable<number | null>(null)

	// Derived states for media type detection
	const hasImageAttachments = $derived.by(() => {
		return $attachments.some((preview) => ALLOWED_IMAGE_MIME.includes(preview.file.type))
	})

	const hasVideoAttachment = $derived.by(() => {
		return $attachments.some((preview) => ALLOWED_VIDEO_MIME.includes(preview.file.type))
	})

	const { form, errors, enhance, submitting, message } = superForm(formData, {
		...createClientFormOptions(createPostSchema),
		applyAction: true,
		resetForm: false,
		delayMs: 120,
		onSubmit: () => {
			$uploadError = null
			$generalError = null
		},
		onResult: ({ result }) => {
			if (result.type === 'success') {
				const actionForm = /** @type {PostFormData | undefined} */ (result.data?.form)
				const actionMessage = actionForm?.message
				if (actionMessage?.type === 'success') {
					toast.success(actionMessage.text)
					if (actionMessage.post) {
						dispatch('postCreated', actionMessage.post)
					}
					$form.content = ''
					clearMediaState()
				} else if (actionMessage?.type === 'error') {
					$uploadError = actionMessage.text
					toast.error(actionMessage.text)
				}
			} else if (result.type === 'failure') {
				const failureMessage =
					(typeof result.data?.error === 'string' && result.data.error) ||
					result.data?.form?.message?.text ||
					undefined
				if (failureMessage) {
					$generalError = failureMessage
					toast.error(failureMessage)
				}
			}
		}
	})

	const errorIds = {
		content: 'post-content-error'
	} as const

	const nativeInvalid = $state({
		content: false
	})

	const contentInvalid = $derived.by(
		() =>
			(Array.isArray($errors.content) && $errors.content.length > 0) || nativeInvalid.content
	)

	let contentField = $state<HTMLTextAreaElement | null>(null)
	let selectedDestination = $state<'global' | string>('global')

	$effect(() => {
		if (!contentField) return
		const action = ariaValidity(contentField, {
			invalid: contentInvalid,
			errorId: errorIds.content
		})
		return () => action.destroy()
	})

	$effect(() => {
		if (selectedDestination === 'global') {
			$form.scope = 'global'
			$form.space = undefined
		} else {
			$form.scope = 'space'
			$form.space = selectedDestination
		}
	})

	function handleNativeInvalid(field: 'content') {
		nativeInvalid[field] = true
	}

	function handleNativeInput(field: 'content') {
		if (nativeInvalid[field]) {
			nativeInvalid[field] = false
		}
	}

	let imageInput = $state<HTMLInputElement | null>(null)
	let videoInput = $state<HTMLInputElement | null>(null)

	$effect(() => {
		if ($message?.type === 'error') {
			$generalError = $message.text
		} else if ($message?.type === 'success') {
			$generalError = null
		}
	})

	onDestroy(() => {
		clearPreviews($attachments)
	})

	function revokePreview(preview: AttachmentPreview | null) {
		if (!preview) return
		URL.revokeObjectURL(preview.url)
	}

	function clearPreviews(list: AttachmentPreview[]) {
		for (const preview of list) revokePreview(preview)
	}

	function syncFileInput(input: HTMLInputElement | null, files: File[]) {
		if (!input) return
		const dt = new DataTransfer()
		for (const file of files) dt.items.add(file)
		input.files = dt.files
	}

	function resetAttachments() {
		clearPreviews($attachments)
		$attachments = []
		$form.attachments = []
		syncFileInput(imageInput, [])
		syncFileInput(videoInput, [])
	}

	function resetVideoMetadata() {
		$form.videoPoster = undefined
		$form.videoDuration = undefined
		$videoDurationDisplay = null
	}

	function clearMediaState() {
		resetAttachments()
		resetVideoMetadata()
		$form.mediaAltText = ''
		$form.mediaType = undefined
		$uploadError = null
	}

	function handleImageSelect(event: Event) {
		const target = event.target as HTMLInputElement
		const selectedFiles = Array.from(target.files ?? [])
		if (selectedFiles.length === 0) {
			target.value = ''
			return
		}

		// Block if video already attached
		if (hasVideoAttachment) {
			$uploadError =
				t('postForm.videoBlocksImages') || 'Please remove video before adding images'
			toast.error(
				t('postForm.videoBlocksImages') || 'Please remove video before adding images'
			)
			target.value = ''
			return
		}

		const existingFiles = $attachments.map((preview: AttachmentPreview) => preview.file)
		const merged = [...existingFiles, ...selectedFiles]
		const { valid, errors: validationErrors } = validateImages(merged)
		if (!valid) {
			$uploadError = validationErrors[0] ?? 'Unable to add images'
			validationErrors.slice(0, 3).forEach((message) => {
				toast.error(message)
			})
			target.value = ''
			return
		}

		const currentPreviews: AttachmentPreview[] = $attachments
		const nextPreviews = merged.map((file) => {
			const existing = currentPreviews.find(
				(preview: AttachmentPreview) => preview.file === file
			)
			return existing ?? { file, url: URL.createObjectURL(file) }
		})
		currentPreviews
			.filter((preview: AttachmentPreview) => !merged.includes(preview.file))
			.forEach(revokePreview)
		$attachments = nextPreviews
		$form.attachments = nextPreviews.map((preview: AttachmentPreview) => preview.file)

		// Auto-set mediaType to 'images'
		$form.mediaType = 'images'

		target.value = ''
		syncFileInput(imageInput, $form.attachments as File[])
		$uploadError = null
	}

	async function extractVideoDuration(file: File) {
		return await new Promise<number | null>((resolve) => {
			const el = document.createElement('video')
			el.preload = 'metadata'
			el.onloadedmetadata = () => {
				const duration = Number.isFinite(el.duration) ? Math.round(el.duration) : null
				URL.revokeObjectURL(el.src)
				resolve(duration)
			}
			el.onerror = () => {
				URL.revokeObjectURL(el.src)
				resolve(null)
			}
			el.src = URL.createObjectURL(file)
		})
	}

	async function handleVideoSelect(event: Event) {
		const target = event.target as HTMLInputElement
		const [file] = Array.from(target.files ?? [])
		if (!file) {
			target.value = ''
			return
		}

		// Block if images already attached
		if (hasImageAttachments) {
			$uploadError =
				t('postForm.imagesBlockVideo') || 'Please remove images before adding video'
			toast.error(
				t('postForm.imagesBlockVideo') || 'Please remove images before adding video'
			)
			target.value = ''
			return
		}

		const duration = await extractVideoDuration(file)
		const { valid, errors: validationErrors } = validateVideo(file, duration ?? undefined)
		if (!valid) {
			$uploadError = validationErrors[0] ?? 'Video upload failed'
			validationErrors.slice(0, 3).forEach((message) => {
				toast.error(message)
			})
			target.value = ''
			return
		}

		resetAttachments()
		const preview: AttachmentPreview = { file, url: URL.createObjectURL(file) }
		$attachments = [preview]
		$form.attachments = [file]
		target.value = ''
		syncFileInput(videoInput, [file])

		// Auto-set mediaType to 'video'
		$form.mediaType = 'video'

		$form.videoDuration = duration ?? undefined
		$videoDurationDisplay = duration ?? null
		$uploadError = null
		$generalError = null
	}

	function removeAttachment(index: number) {
		const current = $attachments.slice()
		const [removed] = current.splice(index, 1)
		if (removed) revokePreview(removed)
		$attachments = current
		const currentFiles = current.map((preview: AttachmentPreview) => preview.file)
		$form.attachments = currentFiles

		// Auto-detect mediaType based on remaining files
		if (currentFiles.length === 0) {
			// No attachments left → revert to undefined (will be inferred as 'text')
			$form.mediaType = undefined
			resetVideoMetadata()
		} else {
			// Infer from first remaining file
			const firstFile = currentFiles[0]
			if (!firstFile) {
				$form.mediaType = undefined
				resetVideoMetadata()
				return
			}
			if (ALLOWED_IMAGE_MIME.includes(firstFile.type)) {
				$form.mediaType = 'images'
			} else if (ALLOWED_VIDEO_MIME.includes(firstFile.type)) {
				$form.mediaType = 'video'
			}
		}

		const targetInput = hasVideoAttachment ? videoInput : imageInput
		syncFileInput(targetInput, currentFiles)
	}

	const canSubmit = $derived.by(
		() => $form.content.trim().length > 0 && !disabled && !$submitting
	)

	const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif'
</script>

<form method="POST" use:enhance class="space-y-6" enctype="multipart/form-data">
	<input type="hidden" name="scope" value={$form.scope} />
	{#if $form.space}
		<input type="hidden" name="space" value={$form.space} />
	{/if}
	{#if $form.mediaType}
		<input type="hidden" name="mediaType" value={$form.mediaType} />
	{/if}
	<input type="hidden" name="videoDuration" value={$form.videoDuration ?? ''} />

	{#if $generalError}
		<div
			class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
			role="alert"
		>
			{$generalError}
		</div>
	{/if}

	{#if $message?.type === 'success'}
		<div
			class="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
			role="status"
			aria-live="polite"
		>
			{$message.text}
		</div>
	{/if}

	<div class="space-y-2">
		<Label for="post-content">{t('postForm.label')}</Label>
		<Textarea
			id="post-content"
			name="content"
			ref={contentField}
			bind:value={$form.content}
			placeholder={t('postForm.placeholder')}
			rows={4}
			disabled={disabled || $submitting}
			class="resize-none"
			aria-invalid={contentInvalid ? 'true' : undefined}
			aria-describedby={contentInvalid ? errorIds.content : undefined}
			oninvalid={() => handleNativeInvalid('content')}
			oninput={() => handleNativeInput('content')}
		/>
		{#if $errors.content}
			<p class="text-sm text-red-600" id={errorIds.content} role="alert">
				{$errors.content[0]}
			</p>
		{/if}
		<div class="text-right text-xs text-muted-foreground">
			{$form.content.length}/2000
		</div>
	</div>

	<!-- Destination Selector -->
	<div class="space-y-2">
		<Label for="post-destination" class="text-sm font-medium">
			{t('postForm.postTo')}
		</Label>

		<div class="relative">
			<select
				id="post-destination"
				bind:value={selectedDestination}
				disabled={disabled || $submitting}
				class="w-full appearance-none rounded-lg border border-input bg-background px-4 py-2.5 pr-10 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				aria-describedby="destination-help"
			>
				<!-- Global Network (Default) -->
				<option value="global">
					🌍 {t('postForm.globalNetwork')}
				</option>

				<!-- User's Joined Spaces -->
				{#if userSpaces.length > 0}
					<optgroup label={t('postForm.yourSpaces')}>
						{#each userSpaces as space (space.id)}
							<option value={space.id}>
								📚 {space.name}
							</option>
						{/each}
					</optgroup>
				{:else}
					<optgroup label={t('postForm.yourSpaces')}>
						<option disabled value="">
							{t('postForm.noSpacesJoined')}
						</option>
					</optgroup>
				{/if}
			</select>

			<!-- Dropdown Arrow Icon -->
			<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
				<svg
					class="h-4 w-4 text-muted-foreground"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</div>
		</div>

		<!-- Helper Text (Dynamic) -->
		<p id="destination-help" class="text-xs text-muted-foreground">
			{#if selectedDestination === 'global'}
				{t('postForm.globalHelp')}
			{:else}
				{@const selectedSpace = userSpaces.find(
					(space: (typeof userSpaces)[number]) => space.id === selectedDestination
				)}
				{#if selectedSpace}
					{t('postForm.spaceHelp', { name: selectedSpace.name })}
				{/if}
			{/if}
		</p>
	</div>

	<!-- Hidden file inputs -->
	<input
		type="file"
		name="attachments"
		accept={ACCEPT_IMAGES}
		multiple
		class="hidden"
		bind:this={imageInput}
		onchange={handleImageSelect}
		disabled={disabled || $submitting || hasVideoAttachment}
	/>
	<input
		type="file"
		name="attachments"
		accept="video/mp4"
		class="hidden"
		bind:this={videoInput}
		onchange={handleVideoSelect}
		disabled={disabled || $submitting || hasImageAttachments}
	/>

	<!-- Image Previews -->
	{#if hasImageAttachments && $attachments.length > 0}
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-muted-foreground">
					{t('postForm.attachedImages') || 'Attached images'} ({$attachments.length})
				</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => {
						resetAttachments()
						$form.mediaType = undefined
					}}
				>
					<X class="mr-2 h-4 w-4" />
					{t('postForm.removeAll') || 'Remove all'}
				</Button>
			</div>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each $attachments as preview, index (preview.url)}
					<div class="group relative overflow-hidden rounded-md border border-border/60">
						<img
							src={preview.url}
							alt={`Selected image ${index + 1}`}
							class="h-28 w-full object-cover"
						/>
						<button
							type="button"
							onclick={() => removeAttachment(index)}
							class="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
							disabled={disabled || $submitting}
						>
							<X class="h-4 w-4" aria-hidden="true" />
							<span class="sr-only">Remove image {index + 1}</span>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Video Preview -->
	{#if hasVideoAttachment && $attachments.length === 1}
		{@const firstAttachment = $attachments[0]}
		{#if firstAttachment}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-muted-foreground">
						{t('postForm.attachedVideo') || 'Attached video'}
					</p>
				</div>
				<div
					class="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-card/60 px-4 py-3"
				>
					<div class="space-y-1">
						<p class="text-sm font-medium text-foreground">{firstAttachment.file.name}</p>
						<p class="text-xs text-muted-foreground">
							{(firstAttachment.file.size / (1024 * 1024)).toFixed(1)} MB
							{#if $videoDurationDisplay}
								· {$videoDurationDisplay}s
							{/if}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={() => removeAttachment(0)}
						disabled={disabled || $submitting}
					>
						<X class="mr-1 h-4 w-4" aria-hidden="true" />
						Remove
					</Button>
				</div>
			</div>
		{/if}
	{/if}

	{#if $errors.videoDuration}
		<p class="text-sm text-red-600">{$errors.videoDuration[0]}</p>
	{/if}

	{#if $uploadError}
		<p class="text-sm text-red-600">{$uploadError}</p>
	{/if}
	{#if $errors.attachments}
		<p class="text-sm text-red-600">{$errors.attachments[0]}</p>
	{/if}

	<!-- Always-visible Attachment Controls Toolbar -->
	<div class="flex items-center justify-between border-t border-border/40 pt-4">
		<div class="flex items-center gap-2">
			<!-- Image Upload Button -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => imageInput?.click()}
				disabled={disabled || $submitting || hasVideoAttachment}
				title={hasVideoAttachment
					? t('postForm.videoBlocksImages') || 'Remove video to add images'
					: `Add images (up to ${MAX_ATTACHMENTS})`}
			>
				<ImagePlus class="mr-2 h-4 w-4" aria-hidden="true" />
				{t('postForm.addImages') || 'Images'}
			</Button>

			<!-- Video Upload Button -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => videoInput?.click()}
				disabled={disabled || $submitting || hasImageAttachments}
				title={hasImageAttachments
					? t('postForm.imagesBlockVideo') || 'Remove images to add video'
					: 'Add video (up to 5 minutes)'}
			>
				<FileVideo class="mr-2 h-4 w-4" aria-hidden="true" />
				{t('postForm.addVideo') || 'Video'}
			</Button>
		</div>

		<Button type="submit" disabled={!canSubmit}>
			{#if $submitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
			{/if}
			{t('postForm.publish')}
		</Button>
	</div>
</form>
