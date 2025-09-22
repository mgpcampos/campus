<script lang="ts">
	let {
		variant = 'default',
		class: className = '',
		count = 1,
		height = 'auto',
		width = 'auto'
	}: {
		variant?: 'default' | 'card' | 'post' | 'profile' | 'list';
		class?: string;
		count?: number;
		height?: string;
		width?: string;
	} = $props();

	const baseClasses = 'animate-pulse bg-muted rounded';
</script>

{#if variant === 'card'}
	{#each Array(count) as _, i}
		<div class="border rounded-lg p-6 space-y-4 {className}">
			<div class="{baseClasses} h-4 w-3/4"></div>
			<div class="{baseClasses} h-3 w-1/2"></div>
			<div class="space-y-2">
				<div class="{baseClasses} h-3 w-full"></div>
				<div class="{baseClasses} h-3 w-5/6"></div>
				<div class="{baseClasses} h-3 w-4/6"></div>
			</div>
		</div>
	{/each}
{:else if variant === 'post'}
	{#each Array(count) as _, i}
		<div class="border rounded-lg p-4 space-y-3 {className}">
			<div class="flex items-center space-x-3">
				<div class="{baseClasses} h-10 w-10 rounded-full"></div>
				<div class="space-y-1">
					<div class="{baseClasses} h-3 w-24"></div>
					<div class="{baseClasses} h-2 w-16"></div>
				</div>
			</div>
			<div class="space-y-2">
				<div class="{baseClasses} h-3 w-full"></div>
				<div class="{baseClasses} h-3 w-4/5"></div>
				<div class="{baseClasses} h-3 w-3/5"></div>
			</div>
			<div class="flex items-center space-x-4 pt-2">
				<div class="{baseClasses} h-6 w-16"></div>
				<div class="{baseClasses} h-6 w-20"></div>
			</div>
		</div>
	{/each}
{:else if variant === 'profile'}
	{#each Array(count) as _, i}
		<div class="border rounded-lg p-6 space-y-4 text-center {className}">
			<div class="{baseClasses} h-20 w-20 rounded-full mx-auto"></div>
			<div class="space-y-2">
				<div class="{baseClasses} h-4 w-32 mx-auto"></div>
				<div class="{baseClasses} h-3 w-24 mx-auto"></div>
			</div>
			<div class="space-y-2">
				<div class="{baseClasses} h-3 w-full"></div>
				<div class="{baseClasses} h-3 w-4/5 mx-auto"></div>
			</div>
			<div class="{baseClasses} h-8 w-24 mx-auto"></div>
		</div>
	{/each}
{:else if variant === 'list'}
	{#each Array(count) as _, i}
		<div class="flex items-center space-x-3 p-3 {className}">
			<div class="{baseClasses} h-8 w-8 rounded-full"></div>
			<div class="flex-1 space-y-1">
				<div class="{baseClasses} h-3 w-3/4"></div>
				<div class="{baseClasses} h-2 w-1/2"></div>
			</div>
		</div>
	{/each}
{:else}
	{#each Array(count) as _, i}
		<div 
			class="{baseClasses} {className}"
			style="height: {height}; width: {width};"
		></div>
	{/each}
{/if}