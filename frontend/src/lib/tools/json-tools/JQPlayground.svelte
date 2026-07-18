<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'jq-playground',
		name: 'jq Playground',
		description: 'Test jq filter expressions on JSON data',
		category: 'json-api',
		icon: 'zap',
		keywords: ['jq', 'filter', 'query', 'playground']
	};

	let jsonInput = $state('');
	let filter = $state('.');
	let output = $state('');
	let error: string | null = $state(null);

	// Minimal jq-subset evaluator: supports ., .key, .key.key, .[index], .[], pipe |,
	// .key[], keys, length, values
	function evalFilter(data: unknown, expr: string): unknown {
		const stages = expr.split('|').map((s) => s.trim());
		let current: unknown[] = [data];

		for (const stage of stages) {
			const next: unknown[] = [];
			for (const val of current) {
				next.push(...applyStage(val, stage));
			}
			current = next;
		}
		return current.length === 1 ? current[0] : current;
	}

	function applyStage(val: unknown, stage: string): unknown[] {
		if (stage === '.' || stage === '') return [val];
		if (stage === 'keys') {
			if (val && typeof val === 'object') return [Object.keys(val).sort()];
			throw new Error('keys requires an object/array');
		}
		if (stage === 'length') {
			if (Array.isArray(val) || typeof val === 'string') return [(val as any).length];
			if (val && typeof val === 'object') return [Object.keys(val).length];
			throw new Error('length not supported for this type');
		}
		if (stage === 'values' || stage === '.[]') {
			if (Array.isArray(val)) return val;
			if (val && typeof val === 'object') return Object.values(val);
			throw new Error('Cannot iterate over non-array/object');
		}

		// Path expression like .a.b[0].c[]
		if (stage.startsWith('.')) {
			let results: unknown[] = [val];
			const tokens = stage
				.slice(1)
				.replace(/\[(\d+)\]/g, '.#$1')
				.replace(/\[\]/g, '.*')
				.split('.')
				.filter((t) => t !== '');

			for (const token of tokens) {
				const nextResults: unknown[] = [];
				for (const r of results) {
					if (token === '*') {
						if (Array.isArray(r)) nextResults.push(...r);
						else if (r && typeof r === 'object') nextResults.push(...Object.values(r));
					} else if (token.startsWith('#')) {
						const idx = parseInt(token.slice(1));
						if (Array.isArray(r)) nextResults.push(r[idx]);
					} else {
						if (r && typeof r === 'object') nextResults.push((r as any)[token]);
						else nextResults.push(undefined);
					}
				}
				results = nextResults;
			}
			return results;
		}

		throw new Error(`Unsupported jq expression: ${stage}`);
	}

	function run() {
		if (!jsonInput.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			const parsed = JsonService.parse(jsonInput);
			if (!parsed.valid) throw new Error(parsed.error);
			const result = evalFilter(parsed.data, filter);
			output = JsonService.stringify(result, 2);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleSample() {
		jsonInput = JSON.stringify(
			{ users: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }] },
			null,
			2
		);
		filter = '.users[] | .name';
		run();
	}

	$effect(() => {
		void [jsonInput, filter];
		run();
	});
</script>

<div class="tool-wrapper">
	<div class="filter-row">
		<span class="jq-label">jq</span>
		<input bind:value={filter} placeholder=".users[] | .name" spellcheck="false" />
	</div>
	<div class="hint">Supports: <code>.</code>, <code>.key</code>, <code>.[0]</code>, <code>.[]</code>, <code>|</code>, <code>keys</code>, <code>length</code>, <code>values</code></div>

	<div class="grid">
		<div class="field">
			<label for="json">JSON Input</label>
			<textarea id="json" bind:value={jsonInput} placeholder="Paste JSON..."></textarea>
		</div>
		<div class="field">
			<label>Output</label>
			{#if error}
				<div class="error-box">⚠️ {error}</div>
			{:else}
				<textarea readonly value={output}></textarea>
			{/if}
		</div>
	</div>

	<button class="sample-btn" onclick={handleSample}>📋 Load Sample</button>
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.filter-row { display: flex; align-items: center; gap: var(--spacing-sm); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); }
	.jq-label { font-weight: 700; color: var(--color-primary); font-family: monospace; }
	.filter-row input { flex: 1; background: transparent; border: none; color: var(--color-text); font-family: monospace; font-size: 0.95rem; }
	.filter-row input:focus { outline: none; }
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
