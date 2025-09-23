<script>
  export let data;
  let { space, memberCount, membershipRole, member, posts } = data;
  let joining = false;
  async function join(e) {
    e.preventDefault();
    joining = true;
    const fd = new FormData();
    const res = await fetch('?/' + 'join', { method: 'POST', body: fd });
    if (res.ok) location.reload();
    joining = false;
  }
  async function leave(e) {
    e.preventDefault();
    joining = true;
    const fd = new FormData();
    const res = await fetch('?/' + 'leave', { method: 'POST', body: fd });
    if (res.ok) location.reload();
    joining = false;
  }
</script>

<div class="flex items-start gap-6 mb-6">
  <div>
    <h1 class="text-2xl font-bold">{space.name}</h1>
    <div class="text-gray-600">{space.description}</div>
    <div class="text-sm mt-1">Members: {memberCount}</div>
    <div class="mt-3 flex gap-2">
      {#if member}
        <form on:submit|preventDefault={leave}>
          <button class="bg-gray-300 px-3 py-1 rounded" disabled={joining}>Leave</button>
        </form>
      {:else}
        <form on:submit|preventDefault={join}>
          <button class="bg-blue-600 text-white px-3 py-1 rounded" disabled={joining}>Join</button>
        </form>
      {/if}
      {#if membershipRole === 'owner' || membershipRole === 'moderator'}
        <a href={`/spaces/${space.id}/manage`} class="bg-indigo-600 text-white px-3 py-1 rounded">Manage</a>
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
