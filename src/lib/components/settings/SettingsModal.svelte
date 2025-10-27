<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { pb, currentUser } from '$lib/pocketbase.js';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { mode, setMode } from 'mode-watcher';
	import {
		t,
		getCurrentLocale,
		setLocale,
		availableLanguages,
		getLanguageName,
		type Locale
	} from '$lib/i18n/index.js';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	let loading = $state(false);
	let selectedLocale = $state<Locale>(getCurrentLocale());

	function resolveActiveMode(): 'dark' | 'light' {
		const current = mode.current;
		if (current === 'dark' || current === 'light') {
			return current;
		}
		if (!browser) {
			return 'light';
		}
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	const isDarkMode = $derived.by(() => resolveActiveMode() === 'dark');

	function migrateLegacyPreference() {
		if (!browser) return;
		const legacy = window.localStorage.getItem('campus.theme');
		if (legacy === 'dark' || legacy === 'light') {
			setMode(legacy);
			window.localStorage.removeItem('campus.theme');
		}
	}

	function applyUserPreference() {
		const user = $currentUser;
		if (user && typeof user.prefersDarkMode === 'boolean') {
			setMode(user.prefersDarkMode ? 'dark' : 'light');
		}
	}

	function initializeThemePreference() {
		if (!browser) return;
		migrateLegacyPreference();
		applyUserPreference();
	}

	onMount(() => {
		initializeThemePreference();
	});

	function handleKeyToggle(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleTheme();
		}
	}

	async function toggleTheme() {
		if (!browser) return;

		const previousMode = resolveActiveMode();
		const nextMode = previousMode === 'light' ? 'dark' : 'light';
		const enablingDarkMode = nextMode === 'dark';

		setMode(nextMode);

		const user = $currentUser;
		if (!user) {
			toast.success(enablingDarkMode ? t('settings.themeEnabled') : t('settings.themeDisabled'));
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/user/theme', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ enabled: enablingDarkMode })
			});

			if (!response.ok) {
				throw new Error('Failed to update preference');
			}

			const data = await response.json();
			if (data?.user) {
				pb.authStore.save(pb.authStore.token, data.user);
				currentUser.set(data.user);
			}

			toast.success(enablingDarkMode ? t('settings.themeEnabled') : t('settings.themeDisabled'));
		} catch (error) {
			console.error('Failed to update theme preference', error);
			setMode(previousMode);
			toast.error(t('settings.errorTheme'));
		} finally {
			loading = false;
		}
	}

	async function handleLanguageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const locale = target.value as Locale;

		const user = $currentUser;
		if (!user) {
			toast.error(t('settings.errorSignIn'));
			target.value = selectedLocale; // Reset select to previous value
			return;
		}

		const previousLocale = selectedLocale;
		selectedLocale = locale;
		setLocale(locale);

		loading = true;
		try {
			const response = await fetch('/api/user/locale', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ locale })
			});

			if (!response.ok) {
				throw new Error('Failed to update locale');
			}

			const data = await response.json();
			if (data?.user) {
				pb.authStore.save(pb.authStore.token, data.user);
				currentUser.set(data.user);
			}

			toast.success(t('settings.languageChanged', { language: getLanguageName(locale) }));
		} catch (error) {
			console.error('Failed to update locale preference', error);
			selectedLocale = previousLocale;
			setLocale(previousLocale);
			target.value = previousLocale; // Reset select to previous value
			toast.error(t('settings.errorLanguage'));
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(value: boolean) {
		if (value) {
			initializeThemePreference();
			selectedLocale = getCurrentLocale();
		}
		open = value;
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="w-full max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{t('settings.title')}</Dialog.Title>
			<Dialog.Description>{t('settings.description')}</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Dark Theme Toggle -->
			<div class="flex items-center justify-between">
				<div>
					<Label for="dark-theme-toggle" class="text-sm font-medium text-foreground">
						{t('settings.darkTheme')}
					</Label>
					<p class="text-xs text-muted-foreground">{t('settings.darkThemeDescription')}</p>
				</div>
				<Switch
					id="dark-theme-toggle"
					checked={isDarkMode}
					disabled={loading}
					onclick={toggleTheme}
					on:keydown={handleKeyToggle}
				/>
			</div>

			<!-- Language Selector -->
			<div class="space-y-2">
				<Label for="language-select" class="text-sm font-medium text-foreground">
					{t('settings.language')}
				</Label>
				<p class="text-xs text-muted-foreground">{t('settings.languageDescription')}</p>
				<select
					id="language-select"
					bind:value={selectedLocale}
					onchange={handleLanguageChange}
					disabled={loading}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#each availableLanguages as lang}
						<option value={lang.code}>
							{getLanguageName(lang.code)}
						</option>
					{/each}
				</select>
			</div>
		</div>

		<Dialog.Footer class="mt-6 justify-end">
			<Button variant="outline" onclick={() => (open = false)}>{t('settings.close')}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
