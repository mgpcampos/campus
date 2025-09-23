<script>
  export let form;
</script>

<h1 class="text-2xl font-bold mb-4">Create Space</h1>
{#if form?.error}
  <div class="bg-red-100 text-red-700 p-2 mb-4 rounded">{form.error}</div>
{/if}
<form method="POST" enctype="multipart/form-data" class="space-y-3">
  <div>
    <label class="block text-sm font-medium">Name</label>
    <input name="name" required class="border px-2 py-1 rounded w-full" />
  </div>
  <div>
    <label class="block text-sm font-medium">Slug</label>
    <input name="slug" required class="border px-2 py-1 rounded w-full" />
  </div>
  <div>
    <label class="block text-sm font-medium">Description</label>
    <textarea name="description" class="border px-2 py-1 rounded w-full" rows="3"></textarea>
  </div>
  <div class="flex items-center gap-2">
    <input id="isPublic" name="isPublic" type="checkbox" checked />
    <label for="isPublic">Public</label>
  </div>
  <div>
    <label class="block text-sm font-medium">Avatar</label>
    <input type="file" name="avatar" accept="image/*" />
  </div>
  <button class="bg-blue-600 text-white px-4 py-2 rounded" type="submit">Create</button>
</form>
