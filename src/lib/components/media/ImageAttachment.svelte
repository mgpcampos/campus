<script lang="ts">
import { onMount } from 'svelte'
export let src: string
export let alt: string = 'Attachment'
export let aspect: number | null = null // width/height if known - for future use
export let sizes: string = '(max-width: 640px) 100vw, 640px'
export let className: string = ''
let loaded = false
let hasError = false
let imageEl: HTMLImageElement | null = null
let currentSrc: string | null = null

function handleLoad() {
	loaded = true
	hasError = false
}

function handleError() {
	hasError = true
}

onMount(() => {
	if (!imageEl) return
	if (imageEl.complete) {
		if (imageEl.naturalWidth > 0 && imageEl.naturalHeight > 0) {
			handleLoad()
		} else {
			handleError()
		}
	}
})

$: if (src !== currentSrc) {
	currentSrc = src
	loaded = false
	hasError = false
	if (imageEl?.complete) {
		if (imageEl.naturalWidth > 0 && imageEl.naturalHeight > 0) {
			handleLoad()
		} else {
			handleError()
		}
	}
}
</script>

{#if hasError}
	<div
		class={`flex w-full items-center justify-center rounded-md border bg-muted/40 text-sm text-muted-foreground ${className}`}
		role="img"
		aria-label="Attachment unavailable"
	>
		<span>Image unavailable</span>
	</div>
{:else}
	<picture>
		<!-- Future sources for AVIF/WebP variants could be added here -->
		<img
			bind:this={imageEl}
			class={`w-full rounded-md border transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
			{src}
			{alt}
			loading="lazy"
			on:load={handleLoad}
			on:error={handleError}
			decoding="async"
			{sizes}
			style:aspect-ratio={aspect ?? undefined}
		/>
	</picture>
{/if}

<style>
	img {
		background: #f1f5f9;
	}
</style>
