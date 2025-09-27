<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { createPostSchema } from '$lib/schemas/post.js';
	import { createPost } from '$lib/services/posts.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { ImagePlus, X, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { validateImages, MAX_ATTACHMENTS } from '$lib/utils/media.js';
	import { withErrorToast, notifyError } from '$lib/utils/errors.js';

	export let initialData = { content: '', scope: 'global' };
	export let spaceId: string | null = null; // if provided, posts go to that space
	export let disabled = false;

	const dispatch = createEventDispatcher();

	let files: File[] = [];
	let fileInput: HTMLInputElement;
	let isSubmitting = false;

	const { form, errors, enhance, submitting } = superForm(initialData, {
		SPA: true,
		validators: zod(createPostSchema),
		onSubmit: async ({ formData, cancel }) => {
			cancel();
			isSubmitting = true;

			const postData: any = {
				content: $form.content,
				scope: spaceId ? 'space' : ($form.scope as 'global' | 'space' | 'group'),
				attachments: files
			};
			if (spaceId) postData.space = spaceId;

			await withErrorToast(
				async () => {
					const newPost = await createPost(postData);
					// Reset form only on success
					$form.content = '';
					files = [];
					if (fileInput) fileInput.value = '';
					dispatch('postCreated', newPost);
					toast.success('Post created successfully!');
				},
				{ context: 'createPost' }
			);

			isSubmitting = false;
		}
	});

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const selectedFiles = Array.from(target.files || []);

		const prospective = [...files, ...selectedFiles];
		const { valid, errors } = validateImages(prospective);
		if (!valid) {
			target.value = '';
			errors
				.slice(0, 3)
				.forEach(async (e) => await notifyError(new Error(e), { context: 'fileValidation' }));
			return;
		}
		files = prospective.slice(0, MAX_ATTACHMENTS);
		target.value = '';
		if (files.length >= MAX_ATTACHMENTS) {
			toast.info(`Maximum ${MAX_ATTACHMENTS} images allowed per post`);
		}
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
		if (fileInput) fileInput.value = '';
	}

	$: canSubmit = $form.content.trim().length > 0 && !isSubmitting && !disabled;
</script>

<form method="POST" use:enhance class="space-y-4">
	{#if spaceId}
		<input type="hidden" name="space" value={spaceId} />
	{/if}
	<div class="space-y-2">
		<Label for="content">What's on your mind?</Label>
		<Textarea
			id="content"
			name="content"
			bind:value={$form.content}
			placeholder="Share your thoughts..."
			rows={3}
			class="resize-none"
			disabled={disabled || isSubmitting}
		/>
		{#if $errors.content}
			<p class="text-sm text-red-600">{$errors.content[0]}</p>
		{/if}
		<div class="text-right text-sm text-gray-500">
			{$form.content.length}/2000
		</div>
	</div>

	<!-- File attachments -->
	{#if files.length > 0}
		<div class="grid grid-cols-2 gap-2">
			{#each files as file, index}
				<div class="group relative">
					<img
						src={URL.createObjectURL(file)}
						alt="Preview"
						class="h-24 w-full rounded-md border object-cover"
					/>
					<button
						type="button"
						onclick={() => removeFile(index)}
						class="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
					>
						<X size={12} />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-2">
			<input
				type="file"
				bind:this={fileInput}
				onchange={handleFileSelect}
				accept="image/jpeg,image/png,image/webp,image/gif"
				multiple
				class="hidden"
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				on:click={() => fileInput?.click()}
				disabled={disabled || isSubmitting || files.length >= 4}
			>
				<ImagePlus size={16} class="mr-1" />
				Add Images
			</Button>
			{#if files.length > 0}
				<span class="text-sm text-gray-500">{files.length}/4</span>
			{/if}
		</div>

		<Button type="submit" disabled={!canSubmit}>
			{#if isSubmitting}
				<Loader2 size={16} class="mr-2 animate-spin" />
			{/if}
			Post
		</Button>
	</div>
</form>
