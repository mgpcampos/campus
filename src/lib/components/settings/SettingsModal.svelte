<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { pb, currentUser } from '$lib/pocketbase.js';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	let loading = $state(false);
	let enabled = $state(false);

	const STORAGE_KEY = 'campus.theme';

	function applyTheme(isDark: boolean) {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', isDark);
	}

	async function loadPreference() {
		if (!browser) return;
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored) {
			enabled = stored === 'dark';
			applyTheme(enabled);
			return;
		}
		const user = $currentUser;
		if (user && typeof user.prefersDarkMode === 'boolean') {
			enabled = user.prefersDarkMode;
			applyTheme(enabled);
		}
	}

	onMount(() => {
		loadPreference();
	});

	async function persistPreference(isDark: boolean) {
		if (!browser) return;
		window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
	}

	function handleKeyToggle(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleTheme();
		}
	}

	async function toggleTheme() {
		const user = $currentUser;
		if (!user) {
			toast.error('You need to be signed in to change theme settings.');
			return;
		}

		const next = !enabled;
		enabled = next;
		applyTheme(next);
		persistPreference(next);

		loading = true;
		try {
			const response = await fetch('/api/user/theme', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ enabled: next })
			});

			if (!response.ok) {
				throw new Error('Failed to update preference');
			}

			const data = await response.json();
			if (data?.user) {
				pb.authStore.save(pb.authStore.token, data.user);
				currentUser.set(data.user);
			}

			toast.success(`Dark theme ${next ? 'enabled' : 'disabled'}.`);
		} catch (error) {
			console.error('Failed to update theme preference', error);
			enabled = !next;
			applyTheme(enabled);
			persistPreference(enabled);
			toast.error('Could not update theme preference. Please try again.');
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(value: boolean) {
		if (value) {
			loadPreference();
		}
		open = value;
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="w-full max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Settings</Dialog.Title>
			<Dialog.Description>Personalize your Campus experience.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<Label for="dark-theme-toggle" class="text-sm font-medium text-foreground">
						Dark theme
					</Label>
					<p class="text-xs text-muted-foreground">Reduce glare and rest your eyes.</p>
				</div>
				<Switch
					id="dark-theme-toggle"
					checked={enabled}
					disabled={loading}
					on:click={toggleTheme}
					on:keydown={handleKeyToggle}
				/>
			</div>
		</div>

		<Dialog.Footer class="mt-6 justify-end">
			<Button variant="outline" onclick={() => (open = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
