<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner/index.js';
</script>

<!-- Toaster component for displaying notifications -->
<Toaster 
	position="bottom-right"
	richColors
	closeButton
	expand={true}
	duration={4000}
/>