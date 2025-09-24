<script>
  export let data;
  let { space, groups, search } = data;
  let creating = false;

  /** @param {SubmitEvent} e */
  async function createGroupAction(e) {
    e.preventDefault();
    creating = true;
    const formEl = e.target instanceof HTMLFormElement ? e.target : undefined;
    const fd = new FormData(formEl);
    const res = await fetch('?/' + 'create', { method: 'POST', body: fd });
    if (res.ok) location.reload();
    creating = false;
  }
</script>

<h1 class="text-2xl font-bold mb-4">Groups in {space.name}</h1>

<!-- Search groups -->
<form method="GET" class="flex gap-2 mb-6 items-center">
  <input
    type="text"
    name="q"
    placeholder="Search groups..."
    value={search}
    class="border rounded px-2 py-1 text-sm flex-1"
  />
  <button class="bg-gray-200 px-3 py-1 rounded text-sm" type="submit">Search</button>
  {#if search}
    <a href="." class="text-xs text-blue-600 underline">Clear</a>
  {/if}
</form>

<form on:submit|preventDefault={createGroupAction} class="space-y-2 mb-6 border p-4 rounded">
  <div>
    <label class="block text-sm font-medium" for="group_name">Name</label>
    <input id="group_name" name="name" class="border rounded w-full px-2 py-1" required />
  </div>
  <div>
    <label class="block text-sm font-medium" for="group_description">Description</label>
    <textarea id="group_description" name="description" class="border rounded w-full px-2 py-1" rows="2"></textarea>
  </div>
  <label class="inline-flex items-center gap-2 text-sm">
    <input type="checkbox" name="isPublic" checked /> Public
  </label>
  <div>
    <button class="bg-blue-600 text-white px-3 py-1 rounded" disabled={creating}>Create Group</button>
  </div>
</form>

<ul class="space-y-3">
  {#each groups.items as group}
    <li class="border p-3 rounded flex justify-between items-center">
      <div>
        <div class="font-medium">{group.name}</div>
        <div class="text-sm text-gray-600">{group.description}</div>
      </div>
      <a class="text-blue-600 text-sm" href={`/spaces/${space.id}/groups/${group.id}`}>View</a>
    </li>
  {/each}
</ul>
