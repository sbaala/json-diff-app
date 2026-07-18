<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';
	import JsonNode from './JsonNode.svelte';

	const tool: ToolMetadata = {
		id: 'json-viewer',
		name: 'JSON Viewer',
		description: 'View JSON in tree structure with search and filtering',
		category: 'json-api',
		icon: 'tree',
		keywords: ['view', 'tree', 'structure', 'explore']
	};

	let input = $state('');
	let parsed = $state<unknown>(undefined);
	let error: string | null = $state(null);

	function parse() {
		if (!input.trim()) {
			parsed = undefined;
			error = null;
			return;
		}
		const result = JsonService.parse(input);
		if (result.valid) {
			parsed = result.data;
			error = null;
		} else {
			error = result.error || 'Invalid JSON';
			parsed = undefined;
		}
	}

	function handleSample() {
		input = JSON.stringify(
			{
				name: 'Product',
				price: 29.99,
				inStock: true,
				tags: ['new', 'featured'],
				meta: { created: '2026-01-01', views: 100 }
			},
			null,
			2
		);
		parse();
	}
	function handleClear() {
		input = '';
		parsed = undefined;
		error = null;
	}

	$effect(() => {
		void input;
		parse();
	});
</script>

<div class="tool-wrapper">
	<div class="grid">
		<div class="field">
			<label for="json">JSON Input</label>
			<textarea id="json" bind:value={input} placeholder="Paste JSON..."></textarea>
			<div class="quick">
				<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
				<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
			</div>
		</div>
		<div class="field">
			<label>Tree View</label>
			<div class="tree">
				{#if error}
					<div class="error-box">⚠️ {error}</div>
				{:else if parsed !== undefined}
					<JsonNode value={parsed} keyName="root" isRoot={true} />
				{:else}
					<div class="empty">Tree will appear here</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; padding: var(--spacing-md); }
	.grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); min-height: 0; }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); min-height: 0; }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { flex: 1; min-height: 200px; font-family: monospace; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: none; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.quick { display: flex; gap: var(--spacing-sm); }
	.quick-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.quick-btn:hover { background: var(--color-primary); color: white; }
	.tree { flex: 1; overflow: auto; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); font-family: monospace; font-size: 0.85rem; }
	.error-box { padding: var(--spacing-md); background: rgba(251, 113, 133, 0.1); border: 1px solid var(--color-removed-border); border-radius: 4px; color: var(--color-removed-border); }
	.empty { color: var(--color-text-muted); }
	@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
