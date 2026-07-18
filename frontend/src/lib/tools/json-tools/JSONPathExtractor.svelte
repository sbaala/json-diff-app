<script lang="ts">
	import { ConvertersService } from '$lib/services/converters.service';
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'jsonpath-extractor',
		name: 'JSONPath Extractor',
		description: 'Extract data from JSON using JSONPath expressions',
		category: 'json-api',
		icon: 'filter',
		keywords: ['jsonpath', 'extract', 'query', 'path']
	};

	let jsonInput = $state('');
	let path = $state('$');
	let output = $state('');
	let error: string | null = $state(null);

	function run() {
		if (!jsonInput.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			const parsed = JsonService.parse(jsonInput);
			if (!parsed.valid) throw new Error(parsed.error);
			const results = ConvertersService.jsonPath(parsed.data, path);
			output = JsonService.stringify(results, 2);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleSample() {
		jsonInput = JSON.stringify(
			{ store: { books: [{ title: 'A', price: 10 }, { title: 'B', price: 20 }] } },
			null,
			2
		);
		path = '$.store.books[*].title';
		run();
	}

	$effect(() => {
		void [jsonInput, path];
		run();
	});
</script>

<div class="tool-wrapper">
	<div class="path-row">
		<label for="path">JSONPath</label>
		<input id="path" bind:value={path} placeholder="$.store.books[*].title" spellcheck="false" />
	</div>
	<div class="hint">Supports: <code>$</code>, <code>.key</code>, <code>['key']</code>, <code>[0]</code>, <code>[*]</code>, <code>*</code>, <code>..</code> (recursive)</div>

	<div class="grid">
		<div class="field">
			<label for="json">JSON Input</label>
			<textarea id="json" bind:value={jsonInput} placeholder="Paste JSON..."></textarea>
		</div>
		<div class="field">
			<label>Results</label>
			{#if error}
				<div class="error-box">⚠️ {error}</div>
			{:else}
				<textarea readonly value={output} placeholder="Extracted values..."></textarea>
			{/if}
		</div>
	</div>

	<button class="sample-btn" onclick={handleSample}>📋 Load Sample</button>
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.path-row { display: flex; align-items: center; gap: var(--spacing-md); }
	.path-row label { font-weight: 600; font-size: 0.85rem; color: var(--color-primary); }
	.path-row input { flex: 1; padding: 10px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-family: monospace; font-size: 0.9rem; }
	.path-row input:focus { outline: none; border-color: var(--color-primary); }
	.hint { font-size: 0.78rem; color: var(--color-text-muted); }
	.hint code { background: var(--color-surface-elevated); padding: 1px 5px; border-radius: 3px; }
	.grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); min-height: 0; }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	.field > label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { flex: 1; min-height: 200px; font-family: monospace; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: none; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.error-box { flex: 1; padding: var(--spacing-md); background: rgba(251, 113, 133, 0.1); border: 1px solid var(--color-removed-border); border-radius: 4px; color: var(--color-removed-border); font-size: 0.85rem; }
	.sample-btn { align-self: flex-start; background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
	.sample-btn:hover { background: var(--color-primary); color: white; }
	@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
