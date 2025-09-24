<script>
  export let data;
  let { group, memberCount, membershipRole, member, posts } = data;
  let working = false;
  /** @param {string} name */
  async function action(name) {
    working = true;
    const fd = new FormData();
    const res = await fetch('?/' + name, { method: 'POST', body: fd });
    if (res.ok) location.reload();
    working = false;
  }
</script>

<div class="flex items-start gap-6 mb-6">
  <div>
    <h1 class="text-2xl font-bold">{group.name}</h1>
    <div class="text-gray-600">{group.description}</div>
    <div class="text-sm mt-1">Members: {memberCount}</div>
    <div class="mt-3 flex gap-2">
      {#if member}
        <button class="bg-gray-300 px-3 py-1 rounded" disabled={working} on:click={() => action('leave')}>Leave</button>
      {:else}
        <button class="bg-blue-600 text-white px-3 py-1 rounded" disabled={working} on:click={() => action('join')}>Join</button>
      {/if}
    </div>
  </div>
</div>

<section>
  <h2 class="text-xl font-semibold mb-3">Posts</h2>
  <ul class="space-y-3">
    {#each posts.items as post}
      <li class="border p-3 rounded">
        <div class="text-sm text-gray-500">{new Date(post.created).toLocaleString()}</div>
        <div>{post.content}</div>
      </li>
    {/each}
  </ul>
</section>
