<script lang="ts">
	import { onMount } from 'svelte';
	export let src: string;
	export let alt: string = 'Attachment';
	export const aspect: number | null = null; // width/height if known - for future use
	export let sizes: string = '(max-width: 640px) 100vw, 640px';
	export let className: string = '';
	let loaded = false;
	function handleLoad() {
		loaded = true;
	}
</script>

<picture>
	<!-- Future sources for AVIF/WebP variants could be added here -->
	<img
		class={`w-full rounded-md border object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
		{src}
		{alt}
		loading="lazy"
		on:load={handleLoad}
		decoding="async"
		{sizes}
	/>
</picture>

<style>
	img {
		background: #f1f5f9;
	}
</style>
