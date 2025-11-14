<script lang="ts">
import { RefreshCw, Wifi, WifiOff } from '@lucide/svelte'
import { onMount } from 'svelte'
import { Button } from '$lib/components/ui/button/index.js'
import { online } from '$lib/stores/connection.js'
import { offlineQueue } from '$lib/utils/offline.js'

let queueStatus = $state({ pending: 0, processing: 0 })
let showDetails = $state(false)

onMount(() => {
	const interval = setInterval(() => {
		queueStatus = offlineQueue.getStatus()
	}, 1000)

	return () => clearInterval(interval)
})

function forceRetry() {
	if ($online) {
		offlineQueue.processQueue()
	}
}
</script>

{#if !$online || queueStatus.pending > 0}
	<div class="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border bg-card p-4 shadow-lg">
		<div class="flex items-center gap-3">
			{#if $online}
				<Wifi class="h-5 w-5 text-green-500" />
			{:else}
				<WifiOff class="h-5 w-5 text-red-500" />
			{/if}

			<div class="flex-1">
				<div class="text-sm font-medium">
					{#if $online}
						{#if queueStatus.pending > 0}
							Syncing {queueStatus.pending} action{queueStatus.pending > 1 ? 's' : ''}
						{:else}
							Online
						{/if}
					{:else}
						Offline
					{/if}
				</div>

				{#if queueStatus.processing > 0}
					<div class="text-xs text-muted-foreground">
						Processing {queueStatus.processing} item{queueStatus.processing > 1 ? 's' : ''}...
					</div>
				{/if}

				{#if !$online && queueStatus.pending > 0}
					<div class="text-xs text-muted-foreground">
						{queueStatus.pending} action{queueStatus.pending > 1 ? 's' : ''} queued
					</div>
				{/if}
			</div>

			{#if $online && queueStatus.pending > 0}
				<Button size="sm" variant="ghost" onclick={forceRetry} class="h-8 w-8 p-0">
					<RefreshCw class="h-4 w-4" />
				</Button>
			{/if}
		</div>

		{#if !$online}
			<div class="mt-2 text-xs text-muted-foreground">
				Actions will be synced when connection is restored
			</div>
		{/if}
	</div>
{/if}
