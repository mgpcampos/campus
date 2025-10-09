<svelte:head>
	<title>About Campus</title>
	<meta
		name="description"
		content="Learn about Campus, our mission, and the team building a collaborative academic network."
	/>
</svelte:head>

<section class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
	<header class="space-y-4">
		<h1 class="text-3xl font-semibold text-foreground sm:text-4xl">About Campus</h1>
		<p class="text-lg text-muted-foreground">
			Campus is a lightweight social platform built to help academic communities collaborate, share
			resources, and stay connected across classes, labs, and research groups.
		</p>
	</header>

	<div class="grid gap-6 text-base leading-7 text-muted-foreground">
		<section class="space-y-2">
			<h2 class="text-xl font-semibold text-foreground">Mission</h2>
			<p>
				We designed Campus to provide a focused environment for sharing course materials,
				coordinating events, and building stronger connections without the noise of general purpose
				social platforms. Accessibility, privacy, and performance guide every product decision we
				make.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="text-xl font-semibold text-foreground">What We Offer</h2>
			<ul class="list-disc space-y-2 pl-6">
				<li>Multimedia feeds with structured metadata for inclusive storytelling.</li>
				<li>Shared resource libraries to keep course files organised and searchable.</li>
				<li>Real-time messaging and analytics designed for academic workflows.</li>
				<li>Granular moderation tools to keep communities safe and supportive.</li>
			</ul>
		</section>

		<section class="space-y-2">
			<h2 class="text-xl font-semibold text-foreground">Contact</h2>
			<p>
				Have questions or feedback? Email
				<a class="font-medium text-primary underline" href="mailto:support@campus.local">
					support@campus.local
				</a>
				and our team will get back to you.
			</p>
		</section>
	</div>
</section>
