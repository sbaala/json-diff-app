<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'whitespace-cleaner',
		name: 'Whitespace Cleaner',
		description: 'Remove, trim, or normalize whitespace',
		category: 'text-utils',
		icon: 'eraser',
		keywords: ['whitespace', 'trim', 'clean', 'space']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);

	let trimLines = $state(true);
	let collapseSpaces = $state(true);
	let removeBlankLines = $state(false);
	let tabsToSpaces = $state(false);
	let removeAll = $state(false);

	function transform() {
		if (!input) {
			output = '';
			return;
		}
		let result = input;
		if (removeAll) {
			output = result.replace(/\s+/g, '');
			return;
		}
		if (tabsToSpaces) result = result.replace(/\t/g, '  ');
		let lines = result.split('\n');
		if (trimLines) lines = lines.map((l) => l.trim());
		if (collapseSpaces) lines = lines.map((l) => l.replace(/[ \t]{2,}/g, ' '));
		if (removeBlankLines) lines = lines.filter((l) => l.trim() !== '');
		output = lines.join('\n');
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = '  Hello    World  \n\n\n   Extra   spaces\t\there  \n';
		transform();
	}

	$effect(() => {
		void [input, trimLines, collapseSpaces, removeBlankLines, tabsToSpaces, removeAll];
		transform();
	});
</script>

<div class="tool-wrapper">
	<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
	<div class="tool-controls">
		<label><input type="checkbox" bind:checked={removeAll} /> Remove all whitespace</label>
		<label><input type="checkbox" bind:checked={trimLines} disabled={removeAll} /> Trim lines</label>
		<label><input type="checkbox" bind:checked={collapseSpaces} disabled={removeAll} /> Collapse spaces</label>
		<label><input type="checkbox" bind:checked={removeBlankLines} disabled={removeAll} /> Remove blank lines</label>
		<label><input type="checkbox" bind:checked={tabsToSpaces} disabled={removeAll} /> Tabs → spaces</label>
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
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: 0.875rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	input[type='checkbox'] {
		cursor: pointer;
	}
</style>
