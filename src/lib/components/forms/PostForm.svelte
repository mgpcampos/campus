<svelte:options runes />

<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { z } from 'zod';
	import { createPostSchema } from '$lib/schemas/post.js';
	import { createClientFormOptions } from '$lib/validation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		ImagePlus,
		UploadCloud,
		FileVideo,
		Loader2,
		X,
		MessageSquare,
		Video
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { validateImages, validateVideo, MAX_ATTACHMENTS } from '$lib/utils/media.js';
	import { writable } from 'svelte/store';
	import { ariaValidity } from '$lib/actions/ariaValidity';
	import { t } from '$lib/i18n';

	type PostFormMessage = {
		type: 'success' | 'error';
		text: string;
		post?: Record<string, unknown>;
	};
	type PostFormData = SuperValidated<z.infer<typeof createPostSchema>, PostFormMessage>;
	type AttachmentPreview = { file: File; url: string };

	const MEDIA_OPTIONS = [
		{
			value: /** @type {'text'} */ ('text'),
			label: t('postForm.text'),
			helper: t('postForm.textHelper'),
			icon: MessageSquare
		},
		{
			value: /** @type {'images'} */ ('images'),
			label: t('postForm.images'),
			helper: t('postForm.imagesHelper', { count: MAX_ATTACHMENTS }),
			icon: ImagePlus
		},
		{
			value: /** @type {'video'} */ ('video'),
			label: t('postForm.video'),
			helper: t('postForm.videoHelper'),
			icon: Video
		}
	] as const;

	let { formData, disabled = false } = $props<{ formData: PostFormData; disabled?: boolean }>();

	const dispatch = createEventDispatcher<{ postCreated: any }>();

	const attachments = writable<AttachmentPreview[]>([]);
	const poster = writable<AttachmentPreview | null>(null);
	const uploadError = writable<string | null>(null);
	const generalError = writable<string | null>(null);
	const videoDurationDisplay = writable<number | null>(null);

	const { form, errors, enhance, submitting, message } = superForm(formData, {
		...createClientFormOptions(createPostSchema),
		applyAction: true,
		resetForm: false,
		delayMs: 120,
		onSubmit: () => {
			$uploadError = null;
			$generalError = null;
		},
		onResult: ({ result }) => {
			if (result.type === 'success') {
				const actionForm = /** @type {PostFormData | undefined} */ (result.data?.form);
				const actionMessage = actionForm?.message;
				if (actionMessage?.type === 'success') {
					toast.success(actionMessage.text);
					if (actionMessage.post) {
						dispatch('postCreated', actionMessage.post);
					}
					$form.content = '';
					clearMediaState();
				} else if (actionMessage?.type === 'error') {
					$uploadError = actionMessage.text;
					toast.error(actionMessage.text);
				}
			} else if (result.type === 'failure') {
				const failureMessage =
					(typeof result.data?.error === 'string' && result.data.error) ||
					(result.data?.form?.message && result.data.form.message.text) ||
					undefined;
				if (failureMessage) {
					$generalError = failureMessage;
					toast.error(failureMessage);
				}
			}
		}
	});

	const errorIds = {
		content: 'post-content-error',
		mediaAltText: 'post-media-alt-text-error'
	} as const;

	const nativeInvalid = $state({
		content: false,
		mediaAltText: false
	});

	const contentInvalid = $derived.by(
		() => (Array.isArray($errors.content) && $errors.content.length > 0) || nativeInvalid.content
	);
	const mediaAltInvalid = $derived.by(
		() =>
			(Array.isArray($errors.mediaAltText) && $errors.mediaAltText.length > 0) ||
			nativeInvalid.mediaAltText
	);

	let contentField = $state<HTMLTextAreaElement | null>(null);
	let mediaAltField = $state<HTMLTextAreaElement | null>(null);

	$effect(() => {
		if (!contentField) return;
		const action = ariaValidity(contentField, {
			invalid: contentInvalid,
			errorId: errorIds.content
		});
		return () => action.destroy();
	});

	$effect(() => {
		if (!mediaAltField) return;
		const action = ariaValidity(mediaAltField, {
			invalid: mediaAltInvalid,
			errorId: errorIds.mediaAltText
		});
		return () => action.destroy();
	});

	function handleNativeInvalid(field: 'content' | 'mediaAltText') {
		nativeInvalid[field] = true;
	}

	function handleNativeInput(field: 'content' | 'mediaAltText') {
		if (nativeInvalid[field]) {
			nativeInvalid[field] = false;
		}
	}

	let imageInput = $state<HTMLInputElement | null>(null);
	let videoInput = $state<HTMLInputElement | null>(null);
	let posterInput = $state<HTMLInputElement | null>(null);

	const altLength = $derived.by(() => ($form.mediaAltText ?? '').length);
	$effect(() => {
		if ($message?.type === 'error') {
			$generalError = $message.text;
		} else if ($message?.type === 'success') {
			$generalError = null;
		}
	});

	onDestroy(() => {
		clearPreviews($attachments);
		if ($poster) revokePreview($poster);
	});

	function revokePreview(preview: AttachmentPreview | null) {
		if (!preview) return;
		URL.revokeObjectURL(preview.url);
	}

	function clearPreviews(list: AttachmentPreview[]) {
		for (const preview of list) revokePreview(preview);
	}

	function syncFileInput(input: HTMLInputElement | null, files: File[]) {
		if (!input) return;
		const dt = new DataTransfer();
		for (const file of files) dt.items.add(file);
		input.files = dt.files;
	}

	function resetAttachments() {
		clearPreviews($attachments);
		$attachments = [];
		$form.attachments = [];
		syncFileInput(imageInput, []);
		syncFileInput(videoInput, []);
	}

	function resetVideoMetadata() {
		if ($poster) revokePreview($poster);
		$poster = null;
		$form.videoPoster = undefined;
		$form.videoDuration = undefined;
		$videoDurationDisplay = null;
		syncFileInput(posterInput, []);
	}

	function clearMediaState() {
		resetAttachments();
		resetVideoMetadata();
		$form.mediaAltText = '';
		$form.mediaType = 'text';
		$uploadError = null;
	}

	function selectMediaType(type: 'text' | 'images' | 'video') {
		if ($form.mediaType === type) return;
		if (type === 'text') {
			clearMediaState();
		} else if (type === 'images') {
			resetVideoMetadata();
			resetAttachments();
		} else if (type === 'video') {
			resetAttachments();
			resetVideoMetadata();
		}
		$form.mediaType = type;
		$uploadError = null;
	}

	function handleImageSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const selectedFiles = Array.from(target.files ?? []);
		if (selectedFiles.length === 0) {
			target.value = '';
			return;
		}

		const existingFiles = $attachments.map((preview: AttachmentPreview) => preview.file);
		const merged = [...existingFiles, ...selectedFiles];
		const { valid, errors: validationErrors } = validateImages(merged);
		if (!valid) {
			$uploadError = validationErrors[0] ?? 'Unable to add images';
			validationErrors.slice(0, 3).forEach((message) => toast.error(message));
			target.value = '';
			return;
		}

		const currentPreviews: AttachmentPreview[] = $attachments;
		const nextPreviews = merged.map((file) => {
			const existing = currentPreviews.find((preview: AttachmentPreview) => preview.file === file);
			return existing ?? { file, url: URL.createObjectURL(file) };
		});
		currentPreviews
			.filter((preview: AttachmentPreview) => !merged.includes(preview.file))
			.forEach(revokePreview);
		$attachments = nextPreviews;
		$form.attachments = nextPreviews.map((preview: AttachmentPreview) => preview.file);
		syncFileInput(imageInput, $form.attachments as File[]);
		target.value = '';
		$uploadError = null;
	}

	async function extractVideoDuration(file: File) {
		return await new Promise<number | null>((resolve) => {
			const el = document.createElement('video');
			el.preload = 'metadata';
			el.onloadedmetadata = () => {
				const duration = Number.isFinite(el.duration) ? Math.round(el.duration) : null;
				URL.revokeObjectURL(el.src);
				resolve(duration);
			};
			el.onerror = () => {
				URL.revokeObjectURL(el.src);
				resolve(null);
			};
			el.src = URL.createObjectURL(file);
		});
	}

	async function handleVideoSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const [file] = Array.from(target.files ?? []);
		if (!file) {
			target.value = '';
			return;
		}

		const duration = await extractVideoDuration(file);
		const { valid, errors: validationErrors } = validateVideo(file, duration ?? undefined);
		if (!valid) {
			$uploadError = validationErrors[0] ?? 'Video upload failed';
			validationErrors.slice(0, 3).forEach((message) => toast.error(message));
			target.value = '';
			return;
		}

		resetAttachments();
		const preview: AttachmentPreview = { file, url: URL.createObjectURL(file) };
		$attachments = [preview];
		$form.attachments = [file];
		syncFileInput(videoInput, [file]);
		$form.mediaType = 'video';
		$form.videoDuration = duration ?? undefined;
		$videoDurationDisplay = duration ?? null;
		$uploadError = null;
		$generalError = null;
		target.value = '';
	}

	function handlePosterSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const [file] = Array.from(target.files ?? []);
		if (!file) {
			target.value = '';
			return;
		}
		const { valid, errors: validationErrors } = validateImages([file]);
		if (!valid) {
			$uploadError = validationErrors[0] ?? 'Poster image not supported';
			validationErrors.slice(0, 3).forEach((message) => toast.error(message));
			target.value = '';
			return;
		}
		if ($poster) revokePreview($poster);
		const preview: AttachmentPreview = { file, url: URL.createObjectURL(file) };
		$poster = preview;
		$form.videoPoster = file;
		syncFileInput(posterInput, [file]);
		$uploadError = null;
		target.value = '';
	}

	function removeAttachment(index: number) {
		const current = $attachments.slice();
		const [removed] = current.splice(index, 1);
		if (removed) revokePreview(removed);
		$attachments = current;
		const currentFiles = current.map((preview: AttachmentPreview) => preview.file);
		$form.attachments = currentFiles;
		const targetInput = $form.mediaType === 'video' ? videoInput : imageInput;
		syncFileInput(targetInput, currentFiles);
		if ($form.mediaType === 'video') {
			resetVideoMetadata();
			$form.mediaType = 'text';
		}
	}

	function removePoster() {
		if ($poster) revokePreview($poster);
		$poster = null;
		$form.videoPoster = undefined;
		syncFileInput(posterInput, []);
	}

	function currentMediaHelper() {
		const current = MEDIA_OPTIONS.find((option) => option.value === $form.mediaType);
		return current?.helper ?? '';
	}

	const canSubmit = $derived.by(
		() =>
			$form.content.trim().length > 0 &&
			!disabled &&
			!$submitting &&
			($form.mediaType !== 'video' || ($attachments.length === 1 && $poster))
	);

	const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';
</script>

<form method="POST" use:enhance class="space-y-6" enctype="multipart/form-data">
	<input type="hidden" name="scope" value={$form.scope} />
	<input type="hidden" name="mediaType" value={$form.mediaType} />
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

	<div class="space-y-2">
		<Label class="text-sm font-medium text-muted-foreground">{t('postForm.mediaTypeLabel')}</Label>
		<div class="inline-flex flex-wrap gap-2">
			{#each MEDIA_OPTIONS as option (option.value)}
				{@const Icon = option.icon}
				<Button
					type="button"
					variant={$form.mediaType === option.value ? 'default' : 'outline'}
					size="sm"
					aria-pressed={$form.mediaType === option.value}
					onclick={() => selectMediaType(option.value)}
					disabled={disabled || $submitting}
				>
					<Icon class="mr-2 h-4 w-4" aria-hidden="true" />
					{option.label}
				</Button>
			{/each}
		</div>
		<p class="text-xs text-muted-foreground">{currentMediaHelper()}</p>
	</div>

	{#if $form.mediaType === 'images'}
		<div class="space-y-3">
			<input
				type="file"
				name="attachments"
				accept={ACCEPT_IMAGES}
				multiple
				class="hidden"
				bind:this={imageInput}
				onchange={handleImageSelect}
				disabled={disabled || $submitting}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => imageInput?.click()}
				disabled={disabled || $submitting}
			>
				<ImagePlus class="mr-2 h-4 w-4" aria-hidden="true" />
				{t('postForm.addImages')}
			</Button>
			<p class="text-xs text-muted-foreground">
				{t('postForm.imageFormats', { count: MAX_ATTACHMENTS })}
			</p>
			{#if $attachments.length > 0}
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
			{/if}
		</div>
	{/if}

	{#if $form.mediaType === 'video'}
		<div class="space-y-4">
			<input
				type="file"
				name="attachments"
				accept="video/mp4"
				class="hidden"
				bind:this={videoInput}
				onchange={handleVideoSelect}
				disabled={disabled || $submitting}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => videoInput?.click()}
				disabled={disabled || $submitting}
			>
				<FileVideo class="mr-2 h-4 w-4" aria-hidden="true" />
				Select video
			</Button>
			{#if $attachments.length === 1}
				<div
					class="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-card/60 px-4 py-3"
				>
					<div class="space-y-1">
						<p class="text-sm font-medium text-foreground">{$attachments[0].file.name}</p>
						<p class="text-xs text-muted-foreground">
							{($attachments[0].file.size / (1024 * 1024)).toFixed(1)} MB
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
			{/if}

			<div class="space-y-2">
				<input
					type="file"
					name="videoPoster"
					accept={ACCEPT_IMAGES}
					class="hidden"
					bind:this={posterInput}
					onchange={handlePosterSelect}
					disabled={disabled || $submitting}
				/>
				<div class="flex flex-wrap items-center gap-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => posterInput?.click()}
						disabled={disabled || $submitting}
					>
						<UploadCloud class="mr-2 h-4 w-4" aria-hidden="true" />
						Add poster image
					</Button>
					{#if $poster}
						<div class="relative h-20 w-32 overflow-hidden rounded-md border border-border/60">
							<img
								src={$poster.url}
								alt="Video poster preview"
								class="h-full w-full object-cover"
							/>
							<button
								type="button"
								onclick={removePoster}
								class="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-foreground shadow"
								disabled={disabled || $submitting}
							>
								<X class="h-4 w-4" aria-hidden="true" />
								<span class="sr-only">Remove poster</span>
							</button>
						</div>
					{/if}
				</div>
				{#if $errors.videoPoster}
					<p class="text-sm text-red-600">{$errors.videoPoster[0]}</p>
				{/if}
				{#if $errors.videoDuration}
					<p class="text-sm text-red-600">{$errors.videoDuration[0]}</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if $uploadError}
		<p class="text-sm text-red-600">{$uploadError}</p>
	{/if}
	{#if $errors.attachments}
		<p class="text-sm text-red-600">{$errors.attachments[0]}</p>
	{/if}

	{#if $form.mediaType !== 'text'}
		<div class="space-y-2">
			<Label for="media-alt-text">Media alt text</Label>
			<Textarea
				id="media-alt-text"
				name="mediaAltText"
				rows={2}
				ref={mediaAltField}
				bind:value={$form.mediaAltText}
				disabled={disabled || $submitting}
				aria-invalid={mediaAltInvalid ? 'true' : undefined}
				aria-describedby={mediaAltInvalid ? errorIds.mediaAltText : undefined}
				oninvalid={() => handleNativeInvalid('mediaAltText')}
				oninput={() => handleNativeInput('mediaAltText')}
			/>
			<div class="flex items-center justify-between text-xs text-muted-foreground">
				<span>Describe the media for screen readers.</span>
				<span>{altLength}/2000</span>
			</div>
			{#if $errors.mediaAltText}
				<p class="text-sm text-red-600" id={errorIds.mediaAltText} role="alert">
					{$errors.mediaAltText[0]}
				</p>
			{/if}
		</div>
	{/if}

	<div class="flex items-center justify-end gap-3">
		<Button type="submit" disabled={!canSubmit}>
			{#if $submitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
			{/if}
			Publish post
		</Button>
	</div>
</form>
