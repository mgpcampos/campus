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

	export let initialData = { content: '', scope: 'global' };
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
			
			try {
				const postData = {
					content: $form.content,
					scope: $form.scope as 'global' | 'space' | 'group',
					attachments: files
				};
				
				const newPost = await createPost(postData);
				
				// Reset form
				$form.content = '';
				files = [];
				if (fileInput) fileInput.value = '';
				
				dispatch('postCreated', newPost);
				toast.success('Post created successfully!');
			} catch (error) {
				console.error('Error creating post:', error);
				toast.error('Failed to create post. Please try again.');
			} finally {
				isSubmitting = false;
			}
		}
	});

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const selectedFiles = Array.from(target.files || []);
		
		// Validate file types
		const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
		const invalidFiles = selectedFiles.filter(file => !validTypes.includes(file.type));
		
		if (invalidFiles.length > 0) {
			toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
			return;
		}
		
		// Validate file sizes (10MB max)
		const maxSize = 10 * 1024 * 1024;
		const oversizedFiles = selectedFiles.filter(file => file.size > maxSize);
		
		if (oversizedFiles.length > 0) {
			toast.error('Files must be smaller than 10MB');
			return;
		}
		
		// Add to existing files, max 4 total
		const newFiles = [...files, ...selectedFiles].slice(0, 4);
		files = newFiles;
		
		if (files.length >= 4) {
			toast.info('Maximum 4 images allowed per post');
		}
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
		if (fileInput) fileInput.value = '';
	}

	$: canSubmit = $form.content.trim().length > 0 && !isSubmitting && !disabled;
</script>

<form method="POST" use:enhance class="space-y-4">
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
		<div class="text-sm text-gray-500 text-right">
			{$form.content.length}/2000
		</div>
	</div>

	<!-- File attachments -->
	{#if files.length > 0}
		<div class="grid grid-cols-2 gap-2">
			{#each files as file, index}
				<div class="relative group">
					<img
						src={URL.createObjectURL(file)}
						alt="Preview"
						class="w-full h-24 object-cover rounded-md border"
					/>
					<button
						type="button"
						on:click={() => removeFile(index)}
						class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
				on:change={handleFileSelect}
				accept="image/jpeg,image/png,image/webp,image/gif"
				multiple
				class="hidden"
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => fileInput?.click()}
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