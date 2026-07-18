<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { TextService } from '$lib/services/text.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'case-converter',
		name: 'Case Converter',
		description: 'Convert text between different cases',
		category: 'text-utils',
		icon: 'type',
		keywords: ['case', 'camel', 'snake', 'kebab', 'pascal']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let caseType = $state<'camel' | 'snake' | 'kebab' | 'pascal' | 'title' | 'lower' | 'upper'>('camel');

	$effect(() => {
		void [input, caseType];
		transform();
	});

	function transform() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}

		try {
			switch (caseType) {
				case 'camel':
					output = TextService.toCamelCase(input);
					break;
				case 'snake':
					output = TextService.toSnakeCase(input);
					break;
				case 'kebab':
					output = TextService.toKebabCase(input);
					break;
				case 'pascal':
					output = TextService.toPascalCase(input);
					break;
				case 'title':
					output = TextService.toTitleCase(input);
					break;
				case 'lower':
					output = TextService.toLowerCase(input);
					break;
				case 'upper':
					output = TextService.toUpperCase(input);
					break;
			}
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleInput() {
		transform();
	}

	function handleCaseChange(e: Event) {
		caseType = (e.target as HTMLSelectElement).value as typeof caseType;
		transform();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = 'Hello World Example Text';
		transform();
	}
</script>

<div class="tool-wrapper">
	<ToolContainer
		{tool}
		bind:input
		bind:output
		bind:error
		onClear={handleClear}
		onSample={handleSample}
	/>

	<div class="tool-controls">
		<label for="case-type">Convert to:</label>
		<select id="case-type" value={caseType} onchange={handleCaseChange}>
			<option value="camel">camelCase</option>
			<option value="snake">snake_case</option>
			<option value="kebab">kebab-case</option>
			<option value="pascal">PascalCase</option>
			<option value="title">Title Case</option>
			<option value="lower">lowercase</option>
			<option value="upper">UPPERCASE</option>
		</select>
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.tool-controls {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-top: 1px solid var(--color-border);
		align-items: center;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select {
		flex: 1;
		max-width: 200px;
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
</style>
