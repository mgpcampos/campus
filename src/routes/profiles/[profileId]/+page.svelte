<script lang="ts">
	import { Calendar, ChevronLeft, Link as LinkIcon, Mail, MapPin } from '@lucide/svelte'
	import { page } from '$app/stores'
	import { t } from '$lib/i18n'
	import type { PageData } from './$types'

	const { data } = $props<{ data: PageData }>()

	const profile = $derived(data.profile)
	const publications = $derived(data.publications || [])
	const user = $derived(profile?.expand?.user)

	function formatYear(year: number | null | undefined): string {
		return year ? String(year) : 'N/A'
	}

	function formatAuthors(authors: Array<{ name: string }> | undefined): string {
		if (!authors || authors.length === 0) return ''
		return authors.map((a) => a.name).join(', ')
	}
</script>

<svelte:head>
	<title>{profile?.displayName || 'Profile'} | Campus</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
		<a
			href="/profiles"
			class="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
		>
			<ChevronLeft size={16} class="mr-1" />
			{t('profiles.return')}
		</a>

		<!-- Profile Header -->
		<div class="mb-8 rounded-lg bg-white shadow">
			<div class="px-6 py-8">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h1 class="text-3xl font-bold text-gray-900">{profile.displayName}</h1>
						<p class="mt-2 text-lg text-gray-600">
							{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}, {profile.department}
						</p>

						{#if profile.pronouns}
							<p class="mt-1 text-sm text-gray-500">({profile.pronouns})</p>
						{/if}

						{#if user?.email}
							<div class="mt-3 flex items-center text-sm text-gray-600">
								<Mail size={16} class="mr-2" />
								<a href="mailto:{user.email}" class="hover:text-gray-900">{user.email}</a>
							</div>
						{/if}
					</div>

					{#if profile.user === $page.data.user?.id}
						<a
							href="/profile"
							class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						>
							{t('profiles.editProfileButton')}
						</a>
					{/if}
				</div>

				{#if profile.biography}
					<div class="mt-6 border-t border-gray-200 pt-6">
						<h2 class="text-sm font-semibold text-gray-900">{t('profiles.aboutHeading')}</h2>
						<p class="mt-2 text-gray-700">{@html profile.biography}</p>
					</div>
				{/if}

				{#if profile.links && profile.links.length > 0}
					<div class="mt-6 border-t border-gray-200 pt-6">
						<h2 class="mb-3 text-sm font-semibold text-gray-900">{t('profiles.linksHeading')}</h2>
						<div class="flex flex-wrap gap-3">
							{#each profile.links as link}
								<a
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
								>
									<LinkIcon size={14} class="mr-2" />
									{link.label}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Publications Section -->
		<div class="rounded-lg bg-white shadow">
			<div class="px-6 py-6">
				<h2 class="mb-6 text-2xl font-bold text-gray-900">{t('profiles.publicationsHeading')}</h2>

				{#if publications.length === 0}
					<p class="text-gray-600">{t('profiles.noPublications')}</p>
				{:else}
					<div class="space-y-6">
						{#each publications as pub}
							<div class="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<h3 class="text-lg font-semibold text-gray-900">{pub.title}</h3>

										{#if pub.authors && pub.authors.length > 0}
											<p class="mt-1 text-sm text-gray-600">
												{formatAuthors(pub.authors)}
											</p>
										{/if}
										<div class="mt-2 flex items-center gap-4 text-sm text-gray-500">
											{#if pub.year}
												<span class="flex items-center">
													<Calendar size={14} class="mr-1" />
													{formatYear(pub.year)}
												</span>
											{/if}

											{#if pub.venue}
												<span>{pub.venue}</span>
											{/if}

											<span class="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700">
												{pub.contributionRole}
											</span>
										</div>

										{#if pub.abstract}
											<p class="mt-3 text-sm text-gray-700">
												{pub.abstract.slice(0, 200)}{pub.abstract.length > 200 ? '...' : ''}
											</p>
										{/if}

										{#if pub.doi}
											<a
												href="https://doi.org/{pub.doi}"
												target="_blank"
												rel="noopener noreferrer"
												class="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
											>
												DOI: {pub.doi}
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
