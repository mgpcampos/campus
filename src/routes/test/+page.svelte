<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
</script>

<div class="p-8">
	<h1 class="mb-4 text-4xl font-bold">Test Page</h1>
	<p class="mb-6 text-lg text-muted-foreground">This is a test to see if components are working.</p>

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
