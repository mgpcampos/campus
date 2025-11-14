<script lang="ts">
import { superForm } from 'sveltekit-superforms/client'
import { goto } from '$app/navigation'
import { ariaValidity } from '$lib/actions/ariaValidity'
import { t } from '$lib/i18n'
import { getErrorMessage } from '$lib/utils/errors.js'
import { loginSchema } from '$lib/utils/validation.js'
import { createClientFormOptions } from '$lib/validation'
import type { PageData } from './$types'

type LoginForm = {
	email: string
	password: string
}

let { data } = $props<{ data: PageData }>()
let generalError = $state('')
let attemptedSubmit = $state(false)
const touched = $state<Record<keyof LoginForm, boolean>>({
	email: false,
	password: false
})

const errorIds: Record<keyof LoginForm, string> = {
	email: 'login-email-error',
	password: 'login-password-error'
}

function coerceErrorMessage(error: unknown): string {
	if (typeof error === 'string') return error
	if (Array.isArray(error)) {
		const first = error.find((value): value is string => typeof value === 'string')
		if (first) return first
	}
	if (error && typeof error === 'object' && '_errors' in error) {
		const nested = (error as { _errors?: unknown })._errors
		if (Array.isArray(nested)) {
			const first = nested.find((value): value is string => typeof value === 'string')
			if (first) return first
		}
	}
	return ''
}

const { form, errors, enhance, submitting } = superForm(data.form, {
	...createClientFormOptions(loginSchema),
	onSubmit: () => {
		generalError = ''
	},
	onResult: ({ result }) => {
		if (result.type === 'redirect') {
			generalError = ''
			attemptedSubmit = false
			goto(result.location)
			return
		}

		if (result.type === 'success') {
			generalError = ''
			attemptedSubmit = false
			goto('/feed')
			return
		}

		if (result.type === 'failure') {
			const serverMessage = typeof result.data?.error === 'string' ? result.data.error : undefined
			generalError = serverMessage ?? ''
			attemptedSubmit = false
			return
		}

		if (result.type === 'error') {
			generalError = getErrorMessage(result.error)
		}
	}
})

type ValidationState = {
	valid: boolean
	errors: Record<keyof LoginForm, string>
}

const clientValidation = $derived.by<ValidationState>(() => {
	const result = loginSchema.safeParse({
		email: $form.email,
		password: $form.password
	})

	if (result.success) {
		return {
			valid: true,
			errors: {
				email: '',
				password: ''
			}
		}
	}

	const fieldErrors = result.error.flatten().fieldErrors
	return {
		valid: false,
		errors: {
			email: fieldErrors.email?.[0] ?? t('auth.validEmailRequired'),
			password: fieldErrors.password?.[0] ?? t('auth.passwordRequired')
		}
	}
})

const canSubmit = $derived.by(() => clientValidation.valid)

const emailErrorText = $derived.by(() => {
	const serverError = coerceErrorMessage($errors.email)
	if (serverError) return serverError
	const message = clientValidation.errors.email
	if (!message) return ''
	return attemptedSubmit || touched.email ? message : ''
})

const passwordErrorText = $derived.by(() => {
	const serverError = coerceErrorMessage($errors.password)
	if (serverError) return serverError
	const message = clientValidation.errors.password
	if (!message) return ''
	return attemptedSubmit || touched.password ? message : ''
})

const enhanceSubmit: typeof enhance = (formElement, options) =>
	enhance(formElement, {
		...options,
		onSubmit: async (event) => {
			attemptedSubmit = true
			if (!clientValidation.valid) {
				event.cancel()
				return
			}

			return options?.onSubmit ? options.onSubmit(event) : undefined
		}
	})

function handleBlur(field: keyof LoginForm) {
	touched[field] = true
}
</script>

<svelte:head>
	<title>{t('auth.title')}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div>
			<h1 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				{t('auth.signInToAccount')}
			</h1>
			<p class="mt-2 text-center text-sm text-gray-600">
				{t('auth.or')}
				<a href="/auth/register" class="font-medium text-blue-600 hover:text-blue-500">
					{t('auth.createNewAccount')}
				</a>
			</p>
		</div>

		<form method="POST" use:enhanceSubmit class="mt-8 space-y-6" novalidate>
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
					<label for="email" class="block text-sm font-medium text-gray-700">
						{t('auth.emailAddress')}
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={$form.email}
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder={t('auth.emailAddress')}
						aria-invalid={emailErrorText ? 'true' : undefined}
						aria-describedby={emailErrorText ? errorIds.email : undefined}
						use:ariaValidity={{ invalid: Boolean(emailErrorText), errorId: errorIds.email }}
						oninput={() => {
							generalError = '';
						}}
						onblur={() => handleBlur('email')}
					/>
					{#if emailErrorText}
						<p class="mt-1 text-sm text-red-600" id={errorIds.email} role="alert">
							{emailErrorText}
						</p>
					{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">
						{t('auth.password')}
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						bind:value={$form.password}
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder={t('auth.password')}
						aria-invalid={passwordErrorText ? 'true' : undefined}
						aria-describedby={passwordErrorText ? errorIds.password : undefined}
						use:ariaValidity={{ invalid: Boolean(passwordErrorText), errorId: errorIds.password }}
						oninput={() => {
							generalError = '';
						}}
						onblur={() => handleBlur('password')}
					/>
					{#if passwordErrorText}
						<p class="mt-1 text-sm text-red-600" id={errorIds.password} role="alert">
							{passwordErrorText}
						</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={!canSubmit}
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
						{t('auth.signingIn')}
					{:else}
						{t('auth.login')}
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
