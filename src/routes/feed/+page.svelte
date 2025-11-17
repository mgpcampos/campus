<svelte:options runes />

<script lang="ts">
	import { MessageSquare, User } from '@lucide/svelte'
	import Feed from '$lib/components/feed/Feed.svelte'
	import type { FeedPost } from '$lib/components/feed/types'
	import PostForm from '$lib/components/forms/PostForm.svelte'
	import { Button } from '$lib/components/ui/button/index.js'
	import { t } from '$lib/i18n'
	import { currentUser, pb } from '$lib/pocketbase.js'
	import type { PageData } from './$types'

	const { data } = $props<{ data: PageData }>()

	type FeedComponentInstance = InstanceType<
		typeof import('$lib/components/feed/Feed.svelte')['default']
	>

	let feedComponent: FeedComponentInstance | null = null

	type SortOption = 'new' | 'top'
	let feedSearch = $state('')
	let feedSort = $state<SortOption>('new')

	let searchDebounce: ReturnType<typeof setTimeout> | null = null
	function handleSearchInput(event: Event) {
		const value = (event.target as HTMLInputElement).value
		if (searchDebounce) clearTimeout(searchDebounce)
		searchDebounce = setTimeout(async () => {
			feedSearch = value.trim()
			if (feedComponent && typeof feedComponent.refresh === 'function') {
				await feedComponent.refresh()
			}
		}, 250)
	}

	async function changeSort(next: SortOption) {
		if (feedSort === next) return
		feedSort = next
		if (feedComponent && typeof feedComponent.refresh === 'function') {
			await feedComponent.refresh()
		}
	}

	async function handlePostCreated(event: CustomEvent<FeedPost>) {
		const newPost = event.detail
		if (feedComponent && typeof feedComponent.addPost === 'function') {
			feedComponent.addPost(newPost)
		}
		if (feedComponent && typeof feedComponent.refresh === 'function') {
			await feedComponent.refresh()
		}
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Compose Section -->
	{#if $currentUser}
		<div class="border-b border-border/40 bg-card/50">
			<div class="mx-auto max-w-2xl px-4 py-4">
				<div class="flex space-x-3">
					<!-- User Avatar -->
					<div class="flex-shrink-0">
						{#if $currentUser.avatar}
							<img
								src={pb.files.getURL($currentUser, $currentUser.avatar, { thumb: '40x40' })}
								alt="{$currentUser.name}'s avatar"
								class="h-10 w-10 rounded-full object-cover"
							/>
						{:else}
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
								<span class="text-sm font-medium text-muted-foreground">
									{$currentUser.name?.charAt(0)?.toUpperCase() || '?'}
								</span>
							</div>
						{/if}
					</div>

					<!-- Compose Form -->
					<div class="flex-1">
						<PostForm formData={data.form} on:postCreated={handlePostCreated} />
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div
			class="border-b border-border/40 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
		>
			<div class="px-4 py-6 text-center">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
				>
					<MessageSquare class="h-6 w-6 text-primary" />
				</div>
				<h3 class="mb-2 text-lg font-semibold text-foreground">{t('feed.startConversation')}</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					{t('feed.signInDescription')}
				</p>
				<div class="flex justify-center gap-3">
					<Button href="/auth/login" size="sm">
						<User class="mr-2 h-4 w-4" />
						{t('header.signIn')}
					</Button>
					<Button href="/auth/register" variant="outline" size="sm">{t('header.signUp')}</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Feed Controls -->
	<div class="border-b border-border/40 bg-card/50">
		<div class="mx-auto max-w-2xl px-4 py-4">
			<div class="flex items-center justify-between">
				<!-- Sort Tabs -->
				<div
					class="inline-flex rounded-lg border border-input bg-background p-1"
					role="tablist"
					aria-label="Feed sort options"
				>
					<Button
						variant={feedSort === 'new' ? 'default' : 'ghost'}
						size="sm"
						onclick={() => changeSort('new')}
						role="tab"
						aria-selected={feedSort === 'new'}
						tabindex={feedSort === 'new' ? 0 : -1}
						class="px-3"
					>
						<MessageSquare class="mr-2 h-4 w-4" aria-hidden="true" />
						{t('feed.new')}
					</Button>
					<Button
						variant={feedSort === 'top' ? 'default' : 'ghost'}
						size="sm"
						onclick={() => changeSort('top')}
						role="tab"
						aria-selected={feedSort === 'top'}
						tabindex={feedSort === 'top' ? 0 : -1}
						class="px-3"
					>
						{t('feed.top')}
					</Button>
				</div>

				<!-- Search -->
				<div class="flex items-center space-x-3">
					<div class="relative">
						<input
							type="search"
							placeholder={t('feed.searchPlaceholder')}
							aria-label="Search posts"
							class="h-8 w-48 rounded-full border border-input bg-background px-3 pr-8 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
							oninput={handleSearchInput}
						/>
						<div class="absolute inset-y-0 right-0 flex items-center pr-2">
							<svg
								class="h-4 w-4 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Feed Timeline -->
	<section aria-label="Feed timeline">
		<Feed
			bind:this={feedComponent}
			scope="global"
			q={feedSearch}
			sort={feedSort}
			on:like={(event) => console.log('Like:', event.detail)}
			on:comment={(event) => console.log('Comment:', event.detail)}
			on:edit={(event) => console.log('Edit:', event.detail)}
			on:delete={(event) => console.log('Delete:', event.detail)}
		/>
	</section>
</div>
