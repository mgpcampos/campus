<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertCircle, Eye, EyeOff } from 'lucide-svelte';

	let {
		type = 'text',
		name,
		label,
		value = '',
		placeholder = '',
		required = false,
		disabled = false,
		readonly = false,
		error = '',
		helpText = '',
		rows = 3,
		maxLength,
		class: className = '',
		inputClass = '',
		onInput = () => {},
		onBlur = () => {},
		onFocus = () => {}
	}: {
		type?: 'text' | 'email' | 'password' | 'textarea' | 'number' | 'tel' | 'url';
		name: string;
		label: string;
		value?: string | number;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		readonly?: boolean;
		error?: string;
		helpText?: string;
		rows?: number;
		maxLength?: number;
		class?: string;
		inputClass?: string;
		onInput?: (event: Event) => void;
		onBlur?: (event: Event) => void;
		onFocus?: (event: Event) => void;
	} = $props();

	let showPassword = $state(false);

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement;
		value = target.value;
		onInput(event);
	}

	const inputId = `${name}-input`;
	const errorId = `${name}-error`;
	const helpId = `${name}-help`;
</script>

<div class="space-y-2 {className}">
	<Label
		for={inputId}
		class={required ? "after:ml-0.5 after:text-destructive after:content-['*']" : ''}
	>
		{label}
	</Label>

	<div class="relative">
		{#if type === 'textarea'}
			<Textarea
				id={inputId}
				{name}
				bind:value
				{placeholder}
				{required}
				{disabled}
				{readonly}
				{rows}
				maxlength={maxLength}
				class="{error ? 'border-destructive focus-visible:ring-destructive' : ''} {inputClass}"
				aria-describedby="{error ? errorId : ''} {helpText ? helpId : ''}"
				aria-invalid={error ? 'true' : 'false'}
				oninput={handleInput}
				onblur={onBlur}
				onfocus={onFocus}
			/>
		{:else}
			<Input
				id={inputId}
				{name}
				type={type === 'password' && showPassword ? 'text' : type}
				bind:value
				{placeholder}
				{required}
				{disabled}
				{readonly}
				maxlength={maxLength}
				class="{error ? 'border-destructive focus-visible:ring-destructive' : ''} {type ===
				'password'
					? 'pr-10'
					: ''} {inputClass}"
				aria-describedby="{error ? errorId : ''} {helpText ? helpId : ''}"
				aria-invalid={error ? 'true' : 'false'}
				oninput={handleInput}
				onblur={onBlur}
				onfocus={onFocus}
			/>

			{#if type === 'password'}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
					onclick={togglePasswordVisibility}
					aria-label={showPassword ? 'Hide password' : 'Show password'}
				>
					{#if showPassword}
						<EyeOff class="h-4 w-4" />
					{:else}
						<Eye class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
		{/if}
	</div>

	{#if error}
		<div id={errorId} class="flex items-center gap-2 text-sm text-destructive" role="alert">
			<AlertCircle class="h-4 w-4" />
			{error}
		</div>
	{/if}

	{#if helpText}
		<p id={helpId} class="text-sm text-muted-foreground">
			{helpText}
		</p>
	{/if}

	{#if maxLength && type === 'textarea'}
		<p class="text-right text-xs text-muted-foreground">
			{value.toString().length}/{maxLength}
		</p>
	{/if}
</div>
