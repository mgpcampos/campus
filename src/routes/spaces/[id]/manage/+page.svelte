<script>
  export let data;
  let { space, role } = data;
  let description = space.description || '';
</script>

<h1 class="text-2xl font-bold mb-4">Manage Space: {space.name}</h1>
<form method="POST" action="?/update" class="space-y-3">
  <div>
    <label class="block text-sm font-medium">Description</label>
    <textarea name="description" bind:value={description} rows="4" class="border px-2 py-1 rounded w-full" />
  </div>
  <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
  <a href={`/spaces/${space.id}`} class="ml-2 text-sm underline">Back</a>
</form>
