<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { TextService } from '$lib/services/text.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'text-reverse',
		name: 'Text Reverser',
		description: 'Reverse text, words, or lines',
		category: 'text-utils',
		icon: 'arrow-left-right',
		keywords: ['reverse', 'text', 'word', 'line']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let reverseType = $state<'text' | 'words' | 'lines'>('text');

	function transform() {
		if (!input) {
			output = '';
			error = null;
			return;
		}

		try {
			switch (reverseType) {
				case 'text':
					output = TextService.reverse(input);
					break;
				case 'words':
					output = TextService.reverseWords(input);
					break;
				case 'lines':
					output = TextService.reverseLines(input);
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

	function handleReverseTypeChange(e: Event) {
		reverseType = (e.target as HTMLSelectElement).value as typeof reverseType;
		transform();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = 'Hello World\nLine Two\nLine Three';
		reverseType = 'lines';
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
		<label for="reverse-type">Reverse:</label>
		<select id="reverse-type" value={reverseType} onchange={handleReverseTypeChange}>
			<option value="text">Text (character-by-character)</option>
			<option value="words">Words</option>
			<option value="lines">Lines</option>
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
		max-width: 300px;
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
