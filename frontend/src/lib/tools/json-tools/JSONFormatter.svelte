<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'json-formatter',
		name: 'JSON Formatter',
		description: 'Beautify, minify, and sort JSON with custom formatting',
		category: 'json-api',
		icon: 'sparkles',
		keywords: ['format', 'beautify', 'minify', 'indent', 'pretty']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let mode = $state<'beautify' | 'minify' | 'sort'>('beautify');
	let indent = $state(2);

	function transform() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			const parsed = JsonService.parse(input);
			if (!parsed.valid) throw new Error(parsed.error);
			if (mode === 'minify') {
				output = JsonService.minify(input);
			} else if (mode === 'sort') {
				output = JsonService.stringify(JsonService.sortKeys(parsed.data), indent);
			} else {
				output = JsonService.format(input, indent);
			}
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}
	function handleSample() {
		input = '{"z":1,"a":{"nested":true,"list":[3,1,2]},"b":"hello"}';
		transform();
	}

	$effect(() => {
		void [input, mode, indent];
		transform();
	});
</script>

<div class="tool-wrapper">
	<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
	<div class="tool-controls">
		<label for="mode">Mode:</label>
		<select id="mode" bind:value={mode}>
			<option value="beautify">Beautify</option>
			<option value="minify">Minify</option>
			<option value="sort">Sort keys</option>
		</select>
		{#if mode !== 'minify'}
			<label for="indent">Indent:</label>
			<select id="indent" bind:value={indent}>
				<option value={2}>2 spaces</option>
				<option value={4}>4 spaces</option>
			</select>
		{/if}
	</div>
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; }
	.tool-controls { display: flex; gap: var(--spacing-md); padding: var(--spacing-md); background: var(--color-surface-elevated); border-top: 1px solid var(--color-border); align-items: center; }
	label { font-weight: 500; color: var(--color-text-muted); font-size: 0.875rem; }
	select { padding: 8px 12px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-size: 0.875rem; }
	select:focus { outline: none; border-color: var(--color-primary); }
</style>
