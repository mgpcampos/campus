<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
</script>

<div class="p-8">
	<h1 class="text-4xl font-bold mb-4">Test Page</h1>
	<p class="text-lg text-muted-foreground mb-6">This is a test to see if components are working.</p>
	
	<Card.Root class="max-w-md">
		<Card.Header>
			<Card.Title>Test Card</Card.Title>
			<Card.Description>This is a test card component</Card.Description>
		</Card.Header>
		<Card.Content>
			<p>Card content goes here</p>
		</Card.Content>
		<Card.Footer>
			<Button>Test Button</Button>
		</Card.Footer>
	</Card.Root>
</div>