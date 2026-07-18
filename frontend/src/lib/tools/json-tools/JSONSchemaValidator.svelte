<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import { SchemaService } from '$lib/services/schema.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'json-schema-validator',
		name: 'JSON Schema Validator',
		description: 'Validate JSON against a schema',
		category: 'json-api',
		icon: 'shield-check',
		keywords: ['schema', 'validate', 'check']
	};

	let schemaInput = $state('');
	let dataInput = $state('');
	let errors = $state<string[]>([]);
	let parseError: string | null = $state(null);
	let validated = $state(false);

	function run() {
		validated = false;
		parseError = null;
		errors = [];
		if (!schemaInput.trim() || !dataInput.trim()) return;
		try {
			const schema = JsonService.parse(schemaInput);
			if (!schema.valid) throw new Error(`Schema: ${schema.error}`);
			const data = JsonService.parse(dataInput);
			if (!data.valid) throw new Error(`Data: ${data.error}`);
			errors = SchemaService.validate(data.data, schema.data as Record<string, any>);
			validated = true;
		} catch (e) {
			parseError = (e as Error).message;
		}
	}

	function handleSample() {
		schemaInput = JSON.stringify(
			{
				type: 'object',
				required: ['name', 'age'],
				properties: {
					name: { type: 'string', minLength: 2 },
					age: { type: 'integer', minimum: 0 }
				}
			},
			null,
			2
		);
		dataInput = JSON.stringify({ name: 'A', age: -5 }, null, 2);
		run();
	}
	function handleClear() {
		schemaInput = '';
		dataInput = '';
		errors = [];
		parseError = null;
		validated = false;
	}

	$effect(() => {
		void [schemaInput, dataInput];
		run();
	});
</script>

<div class="tool-wrapper">
	<div class="grid">
		<div class="field">
			<label for="schema">JSON Schema</label>
			<textarea id="schema" bind:value={schemaInput} placeholder="Schema..."></textarea>
		</div>
		<div class="field">
			<label for="data">Data to Validate</label>
			<textarea id="data" bind:value={dataInput} placeholder="Data..."></textarea>
		</div>
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	{#if parseError}
		<div class="status fail">⚠️ {parseError}</div>
	{:else if validated && errors.length === 0}
		<div class="status ok">✓ Valid — data conforms to schema</div>
	{:else if validated}
		<div class="status fail">✗ {errors.length} validation {errors.length === 1 ? 'error' : 'errors'}</div>
		<div class="errors">
			{#each errors as err}
				<div class="err-item">{err}</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); min-height: 0; }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { flex: 1; min-height: 160px; font-family: monospace; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: none; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.quick { display: flex; gap: var(--spacing-sm); }
	.quick-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.quick-btn:hover { background: var(--color-primary); color: white; }
	.status { padding: var(--spacing-md); border-radius: 6px; font-weight: 600; }
	.status.ok { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
	.status.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
	.errors { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	.err-item { font-family: monospace; font-size: 0.8rem; color: var(--color-removed-border); background: rgba(239,68,68,0.06); padding: 8px 12px; border-radius: 4px; }
	@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
