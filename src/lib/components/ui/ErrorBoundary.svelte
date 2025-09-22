<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { AlertTriangle, RefreshCw } from 'lucide-svelte';

	let {
		error = null,
		retry = () => window.location.reload(),
		class: className = ''
	}: {
		error?: Error | null;
		retry?: () => void;
		class?: string;
	} = $props();

	function handleRetry() {
		error = null;
		retry();
	}
</script>

{#if error}
	<Card.Root class="w-full max-w-md mx-auto {className}">
		<Card.Header class="text-center">
			<div class="flex justify-center mb-4">
				<div class="p-3 rounded-full bg-destructive/10">
					<AlertTriangle class="w-8 h-8 text-destructive" />
				</div>
			</div>
			<Card.Title class="text-destructive">Something went wrong</Card.Title>
			<Card.Description>
				We encountered an error while loading this content.
			</Card.Description>
		</Card.Header>
		
		<Card.Content class="text-center">
			<details class="text-left">
				<summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
					Show error details
				</summary>
				<pre class="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
					{error.message}
				</pre>
			</details>
		</Card.Content>
		
		<Card.Footer class="flex justify-center">
			<Button onclick={handleRetry} variant="outline">
				<RefreshCw class="w-4 h-4 mr-2" />
				Try Again
			</Button>
		</Card.Footer>
	</Card.Root>
{/if}