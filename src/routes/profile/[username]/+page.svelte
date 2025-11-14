<script>
import { t } from '$lib/i18n'
export let data
const { profile, posts, memberships } = data
</script>

<svelte:head>
	<title>{profile.name} (@{profile.username}) | Campus</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-4">
	<section aria-labelledby="profile-heading" class="rounded-lg bg-white p-6 shadow">
		<h1 id="profile-heading" class="mb-2 text-2xl font-bold">{profile.name}</h1>
		<p class="mb-4 text-gray-600">@{profile.username}</p>
		{#if profile.bio}
			<p class="whitespace-pre-line text-gray-800">{profile.bio}</p>
		{/if}
		<div class="mt-4 flex gap-4 text-sm text-gray-600">
			<div><strong>{memberships.spaces.length}</strong> Spaces</div>
			<div><strong>{memberships.groups.length}</strong> Groups</div>
			<div><strong>{posts.totalItems}</strong> Posts</div>
		</div>
	</section>

	<section aria-labelledby="memberships-heading" class="rounded-lg bg-white p-6 shadow">
		<h2 id="memberships-heading" class="mb-4 text-lg font-semibold">
			{t('profileDetail.membershipsHeading')}
		</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<h3 class="mb-2 font-medium">{t('profileDetail.spacesSubheading')}</h3>
				{#if memberships.spaces.length === 0}
					<p class="text-sm text-gray-500">No spaces joined.</p>
				{:else}
					<ul class="space-y-1">
						{#each memberships.spaces as s}
							<li>
								<a class="text-blue-600 hover:underline" href={'/spaces/' + s.slug}>{s.name}</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<div>
				<h3 class="mb-2 font-medium">{t('profileDetail.groupsSubheading')}</h3>
				{#if memberships.groups.length === 0}
					<p class="text-sm text-gray-500">No groups joined.</p>
				{:else}
					<ul class="space-y-1">
						{#each memberships.groups as g}
							<li>
								<a
									class="text-blue-600 hover:underline"
									href={'/spaces/' + g.space + '/groups/' + g.id}>{g.name}</a
								>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</section>

	<section aria-labelledby="posts-heading" class="rounded-lg bg-white p-6 shadow">
		<h2 id="posts-heading" class="mb-4 text-lg font-semibold">
			{t('profileDetail.recentPostsHeading')}
		</h2>
		{#if posts.items.length === 0}
			<p class="text-sm text-gray-500">No posts yet.</p>
		{:else}
			<ul class="divide-y">
				{#each posts.items as p}
					<li class="py-4">
						<article aria-labelledby={'post-' + p.id}>
							<header class="mb-1 flex items-center gap-2 text-xs text-gray-500">
								<time datetime={p.created}>{new Date(p.created).toLocaleString()}</time>
								{#if p.scope !== 'global'}
									<span class="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{p.scope}</span>
								{/if}
							</header>
							<p id={'post-' + p.id} class="whitespace-pre-line text-gray-800">{p.content}</p>
						</article>
					</li>
				{/each}
			</ul>

			{#if posts.page < posts.totalPages}
				<div class="mt-4">
					<a
						class="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
						href={`?page=${posts.page + 1}`}>Load more</a
					>
				</div>
			{/if}
		{/if}
	</section>
</div>
