<script lang="ts">
import { superForm } from 'sveltekit-superforms/client'
import { goto } from '$app/navigation'
import { ariaValidity } from '$lib/actions/ariaValidity'
import { t } from '$lib/i18n'
import { getErrorMessage } from '$lib/utils/errors.ts'
import { registerSchema } from '$lib/utils/validation.js'
import { createClientFormOptions } from '$lib/validation'

let { data } = $props()
let generalError = $state('')
const errorIds = {
	name: 'register-name-error',
	username: 'register-username-error',
	email: 'register-email-error',
	password: 'register-password-error',
	passwordConfirm: 'register-password-confirm-error'
}

const { form, errors, enhance, submitting } = superForm(data.form, {
	...createClientFormOptions(registerSchema),
	onSubmit: () => {
		generalError = ''
	},
	onResult: ({ result }) => {
		if (result.type === 'redirect') {
			generalError = ''
			goto(result.location)
			return
		}

		if (result.type === 'success') {
			generalError = ''
			goto('/feed')
			return
		}

		if (result.type === 'failure') {
			const serverMessage = typeof result.data?.error === 'string' ? result.data.error : undefined
			generalError = serverMessage ?? ''
			return
		}

		if (result.type === 'error') {
			generalError = getErrorMessage(result.error)
		}
	}
})
</script>

<svelte:head>
	<title>{t('auth.register')} | {t('common.appName')}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div>
			<h1 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				{t('auth.createAccount')}
			</h1>
			<p class="mt-2 text-center text-sm text-gray-600">
				{t('auth.or')}
				<a href="/auth/login" class="font-medium text-blue-600 hover:text-blue-500">
					{t('auth.signInToAccount')}
				</a>
			</p>
		</div>

		<form method="POST" use:enhance class="mt-8 space-y-6">
			{#if generalError}
				<div
					class="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700"
					role="alert"
					aria-live="assertive"
				>
					{generalError}
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700"
						>{t('forms.fullName')}</label
					>
					<input
						id="name"
						name="name"
						type="text"
						autocomplete="name"
						required
						bind:value={$form.name}
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder={t('forms.fullNamePlaceholder')}
						use:ariaValidity={{ invalid: Boolean($errors.name), errorId: errorIds.name }}
						oninput={() => (generalError = '')}
					/>
					{#if $errors.name}
						<p class="mt-1 text-sm text-red-600" id={errorIds.name} role="alert">{$errors.name}</p>
					{/if}
				</div>

				<div>
					<label for="username" class="block text-sm font-medium text-gray-700"
						>{t('forms.username')}</label
					>
					<input
						id="username"
						name="username"
						type="text"
						autocomplete="username"
						required
						bind:value={$form.username}
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder={t('forms.usernamePlaceholder')}
						use:ariaValidity={{ invalid: Boolean($errors.username), errorId: errorIds.username }}
						oninput={() => (generalError = '')}
					/>
					{#if $errors.username}
						<p class="mt-1 text-sm text-red-600" id={errorIds.username} role="alert">
							{$errors.username}
						</p>
					{/if}
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700"
						>{t('forms.emailAddress')}</label
					>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={$form.email}
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder={t('forms.emailPlaceholder')}
						use:ariaValidity={{ invalid: Boolean($errors.email), errorId: errorIds.email }}
						oninput={() => (generalError = '')}
					/>
					{#if $errors.email}
						<p class="mt-1 text-sm text-red-600" id={errorIds.email} role="alert">
							{$errors.email}
						</p>
					{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700"
						>{t('forms.password')}</label
					>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={$form.password}
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder={t('forms.passwordPlaceholder')}
						use:ariaValidity={{ invalid: Boolean($errors.password), errorId: errorIds.password }}
						oninput={() => (generalError = '')}
					/>
					{#if $errors.password}
						<p class="mt-1 text-sm text-red-600" id={errorIds.password} role="alert">
							{$errors.password}
						</p>
					{/if}
				</div>

				<div>
					<label for="passwordConfirm" class="block text-sm font-medium text-gray-700">
						{t('forms.confirmPassword')}
					</label>
					<input
						id="passwordConfirm"
						name="passwordConfirm"
						type="password"
						autocomplete="new-password"
						required
						bind:value={$form.passwordConfirm}
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder={t('forms.confirmPasswordPlaceholder')}
						use:ariaValidity={{
							invalid: Boolean($errors.passwordConfirm),
							errorId: errorIds.passwordConfirm
						}}
						oninput={() => (generalError = '')}
					/>
					{#if $errors.passwordConfirm}
						<p class="mt-1 text-sm text-red-600" id={errorIds.passwordConfirm} role="alert">
							{$errors.passwordConfirm}
						</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={$submitting}
					class="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if $submitting}
						<svg
							class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
						{t('forms.creatingAccount')}
					{:else}
						{t('forms.createAccount')}
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
