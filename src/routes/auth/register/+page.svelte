<script>
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { registerSchema } from '$lib/utils/validation.js';
	import { getErrorMessage } from '$lib/utils/errors.js';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const { form, errors, enhance, submitting } = superForm(data.form, {
		validators: zod(registerSchema),
		onUpdated: ({ form }) => {
			if (form.valid) {
				goto('/');
			}
		}
	});

	let generalError = $state('');
</script>

<svelte:head>
	<title>Sign Up - Campus</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Create your account
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				Or
				<a href="/auth/login" class="font-medium text-blue-600 hover:text-blue-500">
					sign in to your existing account
				</a>
			</p>
		</div>

		<form method="POST" use:enhance class="mt-8 space-y-6">
			{#if generalError}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{generalError}
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700">
						Full Name
					</label>
					<input
						id="name"
						name="name"
						type="text"
						autocomplete="name"
						required
						bind:value={$form.name}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
						placeholder="Full name"
					/>
					{#if $errors.name}
						<p class="mt-1 text-sm text-red-600">{$errors.name}</p>
					{/if}
				</div>

				<div>
					<label for="username" class="block text-sm font-medium text-gray-700">
						Username
					</label>
					<input
						id="username"
						name="username"
						type="text"
						autocomplete="username"
						required
						bind:value={$form.username}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
						placeholder="Username"
					/>
					{#if $errors.username}
						<p class="mt-1 text-sm text-red-600">{$errors.username}</p>
					{/if}
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">
						Email address
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={$form.email}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
						placeholder="Email address"
					/>
					{#if $errors.email}
						<p class="mt-1 text-sm text-red-600">{$errors.email}</p>
					{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={$form.password}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
						placeholder="Password"
					/>
					{#if $errors.password}
						<p class="mt-1 text-sm text-red-600">{$errors.password}</p>
					{/if}
				</div>

				<div>
					<label for="passwordConfirm" class="block text-sm font-medium text-gray-700">
						Confirm Password
					</label>
					<input
						id="passwordConfirm"
						name="passwordConfirm"
						type="password"
						autocomplete="new-password"
						required
						bind:value={$form.passwordConfirm}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
						placeholder="Confirm password"
					/>
					{#if $errors.passwordConfirm}
						<p class="mt-1 text-sm text-red-600">{$errors.passwordConfirm}</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={$submitting}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if $submitting}
						<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Creating account...
					{:else}
						Create account
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>