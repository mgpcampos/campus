<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Shield, AlertTriangle, CheckCircle, Clock, XCircle } from '@lucide/svelte';
	import { onMount, onDestroy } from 'svelte';
	import { pb } from '$lib/pocketbase.js';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';

	interface ModerationCase {
		id: string;
		sourceType: string;
		sourceId: string;
		state: 'open' | 'in_review' | 'escalated' | 'resolved';
		evidence?: Array<{
			type: string;
			reason?: string;
			body?: string;
			flagCount?: number;
		}>;
		created: string;
		updated: string;
	}

	interface PageData {
		cases: ModerationCase[];
	}

	let { data }: { data: PageData } = $props();

	let cases = $state<ModerationCase[]>(data.cases || []);
	let selectedCase = $state<ModerationCase | null>(null);
	let activeFilter = $state<string>('all');
	let unsubscribe: (() => void) | null = null;

	// Subscribe to real-time updates
	onMount(async () => {
		try {
			unsubscribe = await pb.collection('moderation_cases').subscribe('*', (event) => {
				const record = event.record as unknown as ModerationCase;
				if (event.action === 'create') {
					cases = [record, ...cases];
				} else if (event.action === 'update') {
					cases = cases.map((c: ModerationCase) => (c.id === record.id ? record : c));
					if (selectedCase?.id === record.id) {
						selectedCase = record;
					}
				} else if (event.action === 'delete') {
					cases = cases.filter((c: ModerationCase) => c.id !== record.id);
					if (selectedCase?.id === record.id) {
						selectedCase = null;
					}
				}
			});
		} catch (error) {
			console.error('Failed to subscribe to moderation cases:', error);
		}
	});

	onDestroy(() => {
		if (unsubscribe) {
			try {
				unsubscribe();
			} catch {
				/* ignore */
			}
		}
	});

	const filteredCases = $derived.by(() => {
		if (activeFilter === 'all') return cases;
		return cases.filter((c: ModerationCase) => c.state === activeFilter);
	});

	const caseStats = $derived.by(() => ({
		open: cases.filter((c: ModerationCase) => c.state === 'open').length,
		in_review: cases.filter((c: ModerationCase) => c.state === 'in_review').length,
		escalated: cases.filter((c: ModerationCase) => c.state === 'escalated').length,
		resolved: cases.filter((c: ModerationCase) => c.state === 'resolved').length
	}));

	function formatDate(date: string) {
		return new Date(date).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getStateIcon(state: string) {
		switch (state) {
			case 'open':
				return AlertTriangle;
			case 'in_review':
				return Clock;
			case 'escalated':
				return XCircle;
			case 'resolved':
				return CheckCircle;
			default:
				return Shield;
		}
	}

	function getStateColor(state: string) {
		switch (state) {
			case 'open':
				return 'bg-yellow-100 text-yellow-800';
			case 'in_review':
				return 'bg-blue-100 text-blue-800';
			case 'escalated':
				return 'bg-red-100 text-red-800';
			case 'resolved':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function isSLABreached(caseRecord: ModerationCase): boolean {
		const created = new Date(caseRecord.created);
		const now = new Date();
		const ageMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
		return caseRecord.state === 'open' && ageMinutes > 15;
	}

	async function handleResolve(caseId: string) {
		try {
			await pb.collection('moderation_cases').update(caseId, {
				state: 'resolved'
			});
		} catch (error) {
			console.error('Failed to resolve case:', error);
		}
	}

	async function handleEscalate(caseId: string) {
		try {
			await pb.collection('moderation_cases').update(caseId, {
				state: 'escalated'
			});
		} catch (error) {
			console.error('Failed to escalate case:', error);
		}
	}

	async function handleReview(caseId: string) {
		try {
			await pb.collection('moderation_cases').update(caseId, {
				state: 'in_review'
			});
		} catch (error) {
			console.error('Failed to update case:', error);
		}
	}

	function viewSource(caseRecord: ModerationCase) {
		const { sourceType, sourceId } = caseRecord;
		if (sourceType === 'message') {
			// Navigate to the message thread
			goto(`/messages/${sourceId}`);
		} else if (sourceType === 'post') {
			goto(`/feed#${sourceId}`);
		} else if (sourceType === 'comment') {
			goto(`/feed#comment-${sourceId}`);
		}
	}
</script>

<svelte:head>
	<title>{t('admin.moderation')} | Campus Admin</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 py-6">
	<header>
		<h1 class="text-3xl font-semibold tracking-tight">{t('admin.moderation')}</h1>
		<p class="mt-2 text-muted-foreground">{t('admin.moderationCases')}</p>
	</header>

	<!-- Stats Overview -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">{t('admin.openCases')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{caseStats.open}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">{t('admin.inReview')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{caseStats.in_review}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">{t('admin.escalated')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-red-600">{caseStats.escalated}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">{t('admin.resolved')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{caseStats.resolved}</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Cases List -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title>{t('admin.moderationCases')}</Card.Title>
				<div class="flex gap-2">
					<Button
						variant={activeFilter === 'all' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (activeFilter = 'all')}
					>
						{t('admin.all')}
					</Button>
					<Button
						variant={activeFilter === 'open' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (activeFilter = 'open')}
					>
						{t('admin.open')} ({caseStats.open})
					</Button>
					<Button
						variant={activeFilter === 'in_review' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (activeFilter = 'in_review')}
					>
						{t('admin.inReview')} ({caseStats.in_review})
					</Button>
					<Button
						variant={activeFilter === 'escalated' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (activeFilter = 'escalated')}
					>
						{t('admin.escalated')} ({caseStats.escalated})
					</Button>
					<Button
						variant={activeFilter === 'resolved' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (activeFilter = 'resolved')}
					>
						{t('admin.resolved')} ({caseStats.resolved})
					</Button>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				{#if filteredCases.length === 0}
					<p class="py-8 text-center text-muted-foreground">
						{t('admin.noCasesAtMoment', {
							filter: activeFilter === 'all' ? t('admin.all') : activeFilter
						})}
					</p>
				{:else}
					{#each filteredCases as caseRecord (caseRecord.id)}
						{@const StateIcon = getStateIcon(caseRecord.state)}
						<Card.Root
							class="cursor-pointer transition-shadow hover:shadow-md {selectedCase?.id ===
							caseRecord.id
								? 'ring-2 ring-primary'
								: ''}"
							onclick={() => (selectedCase = caseRecord)}
						>
							<Card.Header class="pb-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<Badge variant="outline" class={getStateColor(caseRecord.state)}>
												<StateIcon class="mr-1 h-3 w-3" aria-hidden="true" />
												{t(`admin.${caseRecord.state}`)}
											</Badge>
											{#if isSLABreached(caseRecord)}
												<Badge variant="destructive">{t('admin.slaBreach')}</Badge>
											{/if}
										</div>
										<Card.Title class="mt-2 text-base capitalize">
											{caseRecord.sourceType} #{caseRecord.sourceId.slice(0, 8)}
										</Card.Title>
										<Card.Description>
											{t('admin.created')}
											{formatDate(caseRecord.created)}
										</Card.Description>
									</div>
								</div>
							</Card.Header>

							{#if selectedCase?.id === caseRecord.id}
								<Card.Content>
									<div class="space-y-4">
										<!-- Evidence -->
										{#if caseRecord.evidence && caseRecord.evidence.length > 0}
											<div>
												<h4 class="mb-2 text-sm font-semibold">{t('admin.evidence')}</h4>
												<div class="space-y-2">
													{#each caseRecord.evidence as evidence}
														<div class="rounded-md border border-border/50 bg-muted/50 p-3 text-sm">
															<p class="font-medium capitalize">{evidence.type}</p>
															{#if evidence.reason}
																<p class="mt-1 text-muted-foreground">
																	{t('admin.reason')}: {evidence.reason}
																</p>
															{/if}
															{#if evidence.body}
																<p class="mt-1 line-clamp-2 text-muted-foreground">
																	{evidence.body}
																</p>
															{/if}
															{#if evidence.flagCount}
																<p class="mt-1 text-muted-foreground">
																	{t('admin.flags')}: {evidence.flagCount}
																</p>
															{/if}
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Actions -->
										<div class="flex gap-2">
											<Button variant="outline" onclick={() => viewSource(caseRecord)}>
												{t('admin.viewSource')}
											</Button>
											{#if caseRecord.state === 'open'}
												<Button variant="outline" onclick={() => handleReview(caseRecord.id)}>
													{t('admin.startReview')}
												</Button>
												<Button variant="destructive" onclick={() => handleEscalate(caseRecord.id)}>
													{t('admin.escalate')}
												</Button>
											{/if}
											{#if caseRecord.state === 'in_review' || caseRecord.state === 'escalated'}
												<Button onclick={() => handleResolve(caseRecord.id)}
													>{t('admin.resolveCase')}</Button
												>
											{/if}
										</div>
									</div>
								</Card.Content>
							{/if}
						</Card.Root>
					{/each}
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
