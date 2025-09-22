<script>
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { profileSchema } from '$lib/utils/validation.js';
	import { getErrorMessage } from '$lib/utils/errors.js';
	import { currentUser } from '$lib/pocketbase.js';

	let { data } = $props();

	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		validators: zod(profileSchema),
		resetForm: false
	});

	let generalError = $state('');
	let successMessage = $state('');

	// Handle form updates
	$effect(() => {
		if ($message) {
			if ($message.type === 'success') {
				successMessage = $message.text;
				generalError = '';
			} else if ($message.type === 'error') {
				generalError = $message.text;
				successMessage = '';
			}
		}
	});
</script>

<svelte:head>
	<title>Profile - Campus</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-2xl mx-auto">
		<div class="bg-white shadow rounded-lg">
			<div class="px-4 py-5 sm:p-6">
				<h1 class="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

				{#if successMessage}
					<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
						{successMessage}
					</div>
				{/if}

				{#if generalError}
					<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
						{generalError}
					</div>
				{/if}

				<form method="POST" use:enhance class="space-y-6">
					<div class="grid grid-cols-1 gap-6">
						<div>
							<label for="name" class="block text-sm font-medium text-gray-700">
								Full Name
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								bind:value={$form.name}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
								required
								bind:value={$form.username}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							/>
							{#if $errors.username}
								<p class="mt-1 text-sm text-red-600">{$errors.username}</p>
							{/if}
						</div>

						<div>
							<label for="bio" class="block text-sm font-medium text-gray-700">
								Bio
							</label>
							<textarea
								id="bio"
								name="bio"
								rows="4"
								bind:value={$form.bio}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="Tell us about yourself..."
							></textarea>
							{#if $errors.bio}
								<p class="mt-1 text-sm text-red-600">{$errors.bio}</p>
							{/if}
						</div>

						<div>
							<label for="email" class="block text-sm font-medium text-gray-700">
								Email
							</label>
							<input
								id="email"
								type="email"
								value={$currentUser?.email || ''}
								disabled
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
							/>
							<p class="mt-1 text-sm text-gray-500">Email cannot be changed</p>
						</div>
					</div>

					<div class="flex justify-between">
						<a
							href="/"
							class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
						>
							Cancel
						</a>
						<button
							type="submit"
							disabled={$submitting}
							class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{#if $submitting}
								<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Saving...
							{:else}
								Save Changes
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>