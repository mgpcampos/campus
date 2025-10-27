<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { t } from '$lib/i18n';
</script>

<div class="p-8">
	<h1 class="mb-4 text-4xl font-bold">{t('test.title')}</h1>
	<p class="mb-6 text-lg text-muted-foreground">{t('test.description')}</p>

	<Card.Root class="max-w-md">
		<Card.Header>
			<Card.Title>{t('test.cardTitle')}</Card.Title>
			<Card.Description>{t('test.cardDescription')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p>{t('test.cardContent')}</p>
		</Card.Content>
		<Card.Footer>
			<Button>{t('test.button')}</Button>
		</Card.Footer>
	</Card.Root>
</div>
