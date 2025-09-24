<script>
  /** @type {{ spaces: { items: Array<any> }, search: string }} */
  export let data;
  // Cast items to include expected properties for template assistance
  const spaces = /** @type {{ items: Array<{ id:string; name?:string; description?:string; memberCount?:number }>}} */ (data.spaces);
  const search = data.search;
</script>

<h1 class="text-2xl font-bold mb-4">Spaces</h1>
<form method="GET" class="mb-4 flex gap-2">
  <input type="text" name="q" placeholder="Search" value={search} class="border px-2 py-1 rounded" />
  <button class="bg-blue-600 text-white px-3 py-1 rounded" type="submit">Search</button>
  <a href="/spaces/create" class="ml-auto bg-green-600 text-white px-3 py-1 rounded">Create Space</a>
</form>

<ul class="space-y-3">
  {#each spaces.items as space}
    <li class="border p-3 rounded">
      <a class="font-semibold" href={`/spaces/${space.id}`}>{space.name}</a>
      <div class="text-sm text-gray-600">{space.description}</div>
      <div class="text-xs mt-1">Members: {space.memberCount}</div>
    </li>
  {/each}
</ul>
