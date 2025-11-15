<script lang="ts">
	import { MessageCircle, Plus } from '@lucide/svelte'
	import { toast } from 'svelte-sonner'
	import { goto } from '$app/navigation'
	import ThreadList from '$lib/components/messaging/ThreadList.svelte'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { t } from '$lib/i18n'
	import { currentUser } from '$lib/pocketbase'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	function handleThreadSelect(threadId: string) {
		goto(`/messages/${threadId}`)
	}

	function handleNewThread() {
		// For now, direct to a hypothetical thread creation page
		// Could be implemented as a modal or separate route
		toast.info(t('messages.threadCreationComingSoon'))
	}
</script>

<svelte:head>
	<title>{t('messages.pageTitle')}</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 py-6 sm:py-10">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-3xl font-semibold tracking-tight text-foreground">{t('messages.title')}</h1>
			<p class="text-base text-muted-foreground">
				{t('messages.subtitle')}
			</p>
		</div>

		<Button onclick={handleNewThread} size="sm">
			<Plus class="mr-2 h-4 w-4" aria-hidden="true" />
			{t('messages.newConversation')}
		</Button>
	</header>

	{#if data.error}
		<Card.Root class="border-destructive">
			<Card.Content class="py-6">
				<p class="text-destructive">{data.error}</p>
			</Card.Content>
		</Card.Root>
	{:else if !$currentUser}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<MessageCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
				<h2 class="mb-2 text-lg font-semibold">{t('messages.signInToView')}</h2>
				<p class="mb-6 text-muted-foreground">
					{t('messages.signInToConnect')}
				</p>
				<Button href="/auth/login">{t('messages.signIn')}</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<ThreadList
			threads={data.threads}
			currentUserId={$currentUser.id}
			onThreadSelect={handleThreadSelect}
		/>
	{/if}
</div>
