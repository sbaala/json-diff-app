<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { TextService } from '$lib/services/text.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'line-sorter',
		name: 'Line Sorter',
		description: 'Sort, remove duplicates, and filter lines',
		category: 'text-utils',
		icon: 'sort-asc',
		keywords: ['sort', 'line', 'duplicate', 'filter']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let operation = $state<'sort' | 'reverse' | 'dedupe' | 'remove-blank'>('sort');
	let descending = $state(false);

	$effect(() => {
		void [input, operation, descending];
		transform();
	});

	function transform() {
		if (!input) {
			output = '';
			error = null;
			return;
		}

		try {
			let result = input;
			switch (operation) {
				case 'sort':
					result = TextService.sortLines(input, descending);
					break;
				case 'reverse':
					result = TextService.reverseLines(input);
					break;
				case 'dedupe':
					result = TextService.removeDuplicateLines(input);
					break;
				case 'remove-blank':
					result = TextService.removeBlankLines(input);
					break;
			}
			output = result;
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleOperationChange(e: Event) {
		operation = (e.target as HTMLSelectElement).value as typeof operation;
		transform();
	}

	function handleDescendingChange(e: Event) {
		descending = (e.target as HTMLInputElement).checked;
		if (operation === 'sort') transform();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = `zebra
apple
banana
apple
cherry

banana
date`;
		operation = 'dedupe';
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
		<label for="operation">Operation:</label>
		<select id="operation" value={operation} onchange={handleOperationChange}>
			<option value="sort">Sort (A-Z)</option>
			<option value="reverse">Reverse order</option>
			<option value="dedupe">Remove duplicates</option>
			<option value="remove-blank">Remove blank lines</option>
		</select>

		{#if operation === 'sort'}
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={descending} onchange={handleDescendingChange} />
				Descending
			</label>
		{/if}
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
		flex-wrap: wrap;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select {
		flex: 1;
		min-width: 150px;
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

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		cursor: pointer;
	}

	input[type='checkbox'] {
		cursor: pointer;
	}
</style>
