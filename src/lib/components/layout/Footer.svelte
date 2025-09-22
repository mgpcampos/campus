<script lang="ts">
	let { class: className = '', id, ...restProps } = $props();
</script>

<footer class="border-t border-border/40 bg-background/95 {className}" {id} {...restProps}>
	<div class="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
		<div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
			<p class="text-center text-sm leading-loose text-muted-foreground md:text-left">
				Built for the education community. 
				<a 
					href="https://github.com" 
					target="_blank" 
					rel="noreferrer" 
					class="font-medium underline underline-offset-4"
				>
					Open Source
				</a>
				.
			</p>
		</div>
		<div class="flex items-center space-x-4">
			<a 
				href="/about" 
				class="text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				About
			</a>
			<a 
				href="/privacy" 
				class="text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				Privacy
			</a>
			<a 
				href="/terms" 
				class="text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				Terms
			</a>
		</div>
	</div>
</footer>