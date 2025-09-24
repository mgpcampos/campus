<script lang="ts">
	import { onMount } from 'svelte';
	export let src: string;
	export let alt: string = 'Attachment';
	export let aspect: number | null = null; // width/height if known
	export let sizes: string = '(max-width: 640px) 100vw, 640px';
	export let className: string = '';
	let loaded = false;
	function handleLoad(){ loaded = true; }
</script>

<picture>
	<!-- Future sources for AVIF/WebP variants could be added here -->
	<img
		class={`rounded-md border object-cover w-full transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
		src={src}
		alt={alt}
		loading="lazy"
		on:load={handleLoad}
		decoding="async"
		sizes={sizes}
	/>
</picture>

<style>
	img { background: #f1f5f9; }
</style>
