<script>
	export let form;
</script>

<svelte:head>
	<title>Create Space – Campus</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Create Space</h1>
{#if form?.error}
	<div class="mb-4 rounded bg-red-100 p-2 text-red-700">{form.error}</div>
{/if}
<form method="POST" enctype="multipart/form-data" class="space-y-3">
	<div>
		<label for="name" class="block text-sm font-medium">Name</label>
		<input id="name" name="name" required class="w-full rounded border px-2 py-1" />
	</div>
	<div>
		<label for="slug" class="block text-sm font-medium">Slug</label>
		<input id="slug" name="slug" required class="w-full rounded border px-2 py-1" />
		<p class="mt-1 text-xs text-gray-500">
			Choose a short, unique slug. It becomes the URL, like <code>/spaces/your-slug</code>.
		</p>
	</div>
	<div>
		<label for="description" class="block text-sm font-medium">Description</label>
		<textarea id="description" name="description" class="w-full rounded border px-2 py-1" rows="3"
		></textarea>
	</div>
	<div class="flex items-center gap-2">
		<input id="isPublic" name="isPublic" type="checkbox" checked />
		<label for="isPublic">Public</label>
	</div>
	<div>
		<label for="avatar" class="block text-sm font-medium">Avatar</label>
		<input id="avatar" type="file" name="avatar" accept="image/*" />
	</div>
	<button class="rounded bg-blue-600 px-4 py-2 text-white" type="submit">Create</button>
</form>
