<script>
	export let data;
	let { space, role } = data;
	let description = space.description || '';
</script>

<svelte:head>
	<title>Manage {space.name} | Campus</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Manage Space: {space.name}</h1>
<form method="POST" action="?/update" class="space-y-3">
	<div>
		<label for="description" class="block text-sm font-medium">Description</label>
		<textarea
			id="description"
			name="description"
			bind:value={description}
			rows="4"
			class="w-full rounded border px-2 py-1"
		></textarea>
	</div>
	<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Save</button>
	<a href={`/spaces/${space.id}`} class="ml-2 text-sm underline">Back</a>
</form>
