<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'json-escape',
		name: 'JSON Escape/Unescape',
		description: 'Escape or unescape JSON strings',
		category: 'text-utils',
		icon: 'quote',
		keywords: ['json', 'escape', 'unescape', 'string']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let mode = $state<'escape' | 'unescape'>('escape');

	function transform() {
		if (!input) {
			output = '';
			error = null;
			return;
		}
		try {
			if (mode === 'escape') {
				// Produce a JSON string literal without the surrounding quotes
				output = JSON.stringify(input).slice(1, -1);
			} else {
				output = JSON.parse(`"${input.replace(/^"|"$/g, '')}"`);
			}
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleModeChange(e: Event) {
		mode = (e.target as HTMLSelectElement).value as typeof mode;
		transform();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		if (mode === 'escape') {
			input = 'Line 1\nLine 2\t"quoted"';
		} else {
			input = 'Line 1\\nLine 2\\t\\"quoted\\"';
		}
		transform();
	}

	$effect(() => {
		void input;
		transform();
	});
</script>

<div class="tool-wrapper">
	<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
	<div class="tool-controls">
		<label for="mode">Mode:</label>
		<select id="mode" value={mode} onchange={handleModeChange}>
			<option value="escape">Escape</option>
			<option value="unescape">Unescape</option>
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
