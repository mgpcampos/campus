<script lang="ts">
import { BookOpen, Search, UserCircle } from '@lucide/svelte'
import { goto, invalidateAll } from '$app/navigation'
import { Button } from '$lib/components/ui/button/index.js'
import * as Card from '$lib/components/ui/card/index.js'
import * as Dialog from '$lib/components/ui/dialog/index.js'
import { Input } from '$lib/components/ui/input/index.js'
import { Label } from '$lib/components/ui/label/index.js'
import { t } from '$lib/i18n'
import { pb } from '$lib/pocketbase.js'

interface Profile {
	id: string
	displayName: string
	role: string
	department?: string
	biography?: string
	publicationCount?: number
	expand?: {
		user?: {
			email?: string
		}
	}
}

interface PageData {
	profiles: Profile[]
}

let { data }: { data: PageData } = $props()

let searchQuery = $state('')
let selectedRole = $state('all')
let selectedDepartment = $state('all')
let createDialogOpen = $state(false)
let creating = $state(false)
let error = $state('')

// Form fields
let displayName = $state('')
let role = $state('student')
let department = $state('')
let biography = $state('')

const filteredProfiles = $derived.by(() => {
	let filtered: Profile[] = data.profiles

	if (searchQuery) {
		const query = searchQuery.toLowerCase()
		filtered = filtered.filter(
			(p: Profile) =>
				p.displayName.toLowerCase().includes(query) ||
				p.department?.toLowerCase().includes(query) ||
				p.role?.toLowerCase().includes(query)
		)
	}

	if (selectedRole !== 'all') {
		filtered = filtered.filter((p: Profile) => p.role === selectedRole)
	}

	if (selectedDepartment !== 'all') {
		filtered = filtered.filter((p: Profile) => p.department === selectedDepartment)
	}

	return filtered
})

const roles = $derived.by(() => {
	const roleSet = new Set(data.profiles.map((p: Profile) => p.role))
	return Array.from(roleSet).sort()
})

const departments = $derived.by(() => {
	const deptSet = new Set(
		data.profiles.map((p: Profile) => p.department).filter((d): d is string => Boolean(d))
	)
	return Array.from(deptSet).sort()
})

function handleProfileClick(profileId: string) {
	goto(`/profiles/${profileId}`)
}

async function handleCreate() {
	if (creating) return
	creating = true
	error = ''

	try {
		await pb.collection('profiles').create({
			user: pb.authStore.model?.id,
			displayName,
			role,
			department,
			biography
		})

		createDialogOpen = false
		displayName = ''
		role = 'student'
		department = ''
		biography = ''
		await invalidateAll()
	} catch (err: any) {
		error = err.message || t('profiles.createFailed')
	} finally {
		creating = false
	}
}
</script>

<svelte:head>
	<title>{t('profiles.pageTitle')}</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 py-6 sm:py-10">
	<div class="flex items-start justify-between">
		<header>
			<h1 class="text-3xl font-semibold tracking-tight text-foreground">{t('profiles.heading')}</h1>
			<p class="mt-2 text-base text-muted-foreground">
				{t('profiles.subtitle')}
			</p>
		</header>
		<Button onclick={() => (createDialogOpen = true)}>
			<UserCircle class="mr-2 h-4 w-4" />
			{t('profiles.createProfile')}
		</Button>
	</div>

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="grid gap-4 md:grid-cols-3">
				<div class="md:col-span-3">
					<Label for="search">{t('profiles.search')}</Label>
					<div class="relative mt-1">
						<Search
							class="absolute top-3 left-3 h-4 w-4 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							id="search"
							type="text"
							placeholder={t('profiles.searchPlaceholder')}
							bind:value={searchQuery}
							class="pl-9"
						/>
					</div>
				</div>

				<div>
					<Label for="role-filter">{t('profiles.role')}</Label>
					<select
						id="role-filter"
						bind:value={selectedRole}
						class="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						<option value="all">{t('profiles.allRoles')}</option>
						{#each roles as role (role)}
							<option value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
						{/each}
					</select>
				</div>

				<div>
					<Label for="department-filter">{t('profiles.department')}</Label>
					<select
						id="department-filter"
						bind:value={selectedDepartment}
						class="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						<option value="all">{t('profiles.allDepartments')}</option>
						{#each departments as dept}
							<option value={dept}>{dept}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-end">
					<Button
						variant="outline"
						onclick={() => {
							searchQuery = '';
							selectedRole = 'all';
							selectedDepartment = 'all';
						}}
						class="w-full"
					>
						{t('profiles.clearFilters')}
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Profiles Grid -->
	{#if filteredProfiles.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<UserCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
				<h3 class="mb-2 text-lg font-semibold">{t('profiles.noProfilesFound')}</h3>
				<p class="text-muted-foreground">{t('profiles.noProfilesHint')}</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredProfiles as profile (profile.id)}
				<Card.Root
					class="cursor-pointer transition-shadow hover:shadow-lg"
					onclick={() => handleProfileClick(profile.id)}
					role="article"
					tabindex={0}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleProfileClick(profile.id);
						}
					}}
				>
					<Card.Header>
						<Card.Title class="line-clamp-1">{profile.displayName}</Card.Title>
						<Card.Description>
							<div class="space-y-1">
								<p class="capitalize">{profile.role}</p>
								{#if profile.department}
									<p class="text-xs">{profile.department}</p>
								{/if}
							</div>
						</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if profile.biography}
							<p class="line-clamp-2 text-sm text-muted-foreground">
								{profile.biography.replace(/<[^>]*>/g, '')}
							</p>
						{/if}

						<div class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
							<BookOpen class="h-4 w-4" aria-hidden="true" />
							<span>{t('profiles.publications', { count: profile.publicationCount || 0 })}</span>
						</div>
					</Card.Content>
					<Card.Footer>
						<Button variant="outline" class="w-full">{t('profiles.viewProfile')}</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}

	<!-- Create Profile Dialog -->
	<Dialog.Root bind:open={createDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{t('profiles.createDialogTitle')}</Dialog.Title>
				<Dialog.Description>
					{t('profiles.createDialogDescription')}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4">
				{#if error}
					<div class="rounded bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</div>
				{/if}

				<div>
					<Label for="displayName">{t('profiles.displayName')} *</Label>
					<Input
						id="displayName"
						bind:value={displayName}
						placeholder={t('profiles.displayNamePlaceholder')}
						required
					/>
				</div>

				<div>
					<Label for="role">{t('profiles.role')} *</Label>
					<select
						id="role"
						bind:value={role}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="student">{t('profiles.roleStudent')}</option>
						<option value="professor">{t('profiles.roleProfessor')}</option>
						<option value="researcher">{t('profiles.roleResearcher')}</option>
						<option value="staff">{t('profiles.roleStaff')}</option>
					</select>
				</div>

				<div>
					<Label for="department">{t('profiles.department')} *</Label>
					<Input
						id="department"
						bind:value={department}
						placeholder={t('profiles.departmentPlaceholder')}
						required
					/>
				</div>

				<div>
					<Label for="biography">{t('profiles.biography')}</Label>
					<textarea
						id="biography"
						bind:value={biography}
						placeholder={t('profiles.biographyPlaceholder')}
						class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						rows="3"
					></textarea>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (createDialogOpen = false)}
					>{t('profiles.cancel')}</Button
				>
				<Button onclick={handleCreate} disabled={creating || !displayName || !department}>
					{creating ? t('profiles.creating') : t('profiles.createProfileButton')}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
