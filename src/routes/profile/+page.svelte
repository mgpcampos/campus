<script>
import { onMount } from 'svelte'
import { superForm } from 'sveltekit-superforms/client'
import { t } from '$lib/i18n'
import { currentUser } from '$lib/pocketbase.js'
import { getErrorMessage } from '$lib/utils/errors.ts'
import { profileSchema } from '$lib/utils/validation.js'
import { createClientFormOptions } from '$lib/validation'

let { data } = $props()

const { form, errors, enhance, submitting, message } = superForm(data.form, {
	...createClientFormOptions(profileSchema),
	resetForm: false
})

let generalError = $state('')
let successMessage = $state('')

onMount(() => {
	const defaults = data?.form?.data ?? {}
	if (typeof defaults.name === 'string' && defaults.name.length && !$form.name) {
		$form.name = defaults.name
	}
	if (typeof defaults.username === 'string' && defaults.username.length && !$form.username) {
		$form.username = defaults.username
	}
	if (typeof defaults.bio === 'string' && defaults.bio.length && !$form.bio) {
		$form.bio = defaults.bio
	}
})

// Handle form updates
$effect(() => {
	if ($message) {
		if ($message.type === 'success') {
			successMessage = $message.text
			generalError = ''
		} else if ($message.type === 'error') {
			generalError = $message.text
			successMessage = ''
		}
	}
})
</script>

<svelte:head>
	<title>{t('profile.pageTitle')}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-2xl">
		<div class="rounded-lg bg-white shadow">
			<div class="px-4 py-5 sm:p-6">
				<h1 class="mb-6 text-2xl font-bold text-gray-900">{t('profile.heading')}</h1>

				{#if successMessage}
					<div class="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">
						{successMessage}
					</div>
				{/if}

				{#if generalError}
					<div class="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
						{generalError}
					</div>
				{/if}

				<form method="POST" use:enhance class="space-y-6">
					<div class="grid grid-cols-1 gap-6">
						<div>
							<label for="name" class="block text-sm font-medium text-gray-700">
								{t('profile.fullName')}
							</label>
							<input
								id="name"
								type="text"
								required
								bind:value={$form.name}
								disabled
								placeholder={$form.name || ''}
								class="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 shadow-sm focus:outline-none sm:text-sm"
								readonly
							/>
							<input type="hidden" name="name" value={$form.name || ''} />
							{#if $errors.name}
								<p class="mt-1 text-sm text-red-600">{$errors.name}</p>
							{/if}
						</div>

						<div>
							<label for="username" class="block text-sm font-medium text-gray-700">
								{t('profile.username')}
							</label>
							<input
								id="username"
								type="text"
								required
								bind:value={$form.username}
								disabled
								placeholder={$form.username || ''}
								class="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 shadow-sm focus:outline-none sm:text-sm"
								readonly
							/>
							<input type="hidden" name="username" value={$form.username || ''} />
							{#if $errors.username}
								<p class="mt-1 text-sm text-red-600">{$errors.username}</p>
							{/if}
						</div>

						<div>
							<label for="bio" class="block text-sm font-medium text-gray-700">
								{t('profile.bio')}
							</label>
							<textarea
								id="bio"
								name="bio"
								rows="4"
								bind:value={$form.bio}
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								placeholder={t('profile.bioPlaceholder')}
							></textarea>
							{#if $errors.bio}
								<p class="mt-1 text-sm text-red-600">{$errors.bio}</p>
							{/if}
						</div>

						<div>
							<label for="email" class="block text-sm font-medium text-gray-700">
								{t('profile.email')}
							</label>
							<input
								id="email"
								type="email"
								value={$currentUser?.email || ''}
								disabled
								class="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 shadow-sm sm:text-sm"
							/>
							<p class="mt-1 text-sm text-gray-500">{t('profile.emailCannotChange')}</p>
						</div>
					</div>

					<div class="flex justify-between">
						<a
							href="/"
							class="rounded-md bg-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-400"
						>
							{t('profile.cancel')}
						</a>
						<button
							type="submit"
							disabled={$submitting}
							class="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if $submitting}
								<svg
									class="mr-3 -ml-1 inline h-5 w-5 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								{t('profile.saving')}
							{:else}
								{t('profile.saveChanges')}
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
