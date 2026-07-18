<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'json-validator',
		name: 'JSON Validator',
		description: 'Validate JSON syntax and structure',
		category: 'json-api',
		icon: 'check-circle',
		keywords: ['validate', 'check', 'syntax', 'error']
	};

	let input = $state('');
	let valid = $state<boolean | null>(null);
	let errorMsg = $state('');
	let stats = $state<{ type: string; size: number; depth: number; keys: number } | null>(null);

	function validate() {
		if (!input.trim()) {
			valid = null;
			errorMsg = '';
			stats = null;
			return;
		}
		const result = JsonService.parse(input);
		if (result.valid) {
			valid = true;
			errorMsg = '';
			const s = JsonService.getStatistics(result.data);
			stats = { type: s.type, size: s.size, depth: s.depth, keys: s.keys };
		} else {
			valid = false;
			errorMsg = result.error || 'Invalid JSON';
			stats = null;
		}
	}

	function handleSample() {
		input = '{"name":"test","values":[1,2,3],"nested":{"ok":true}}';
		validate();
	}
	function handleClear() {
		input = '';
		valid = null;
		errorMsg = '';
		stats = null;
	}

	$effect(() => {
		void input;
		validate();
	});
</script>

<div class="tool-wrapper">
	<div class="field">
		<label for="json">JSON Input</label>
		<textarea id="json" bind:value={input} placeholder="Paste JSON to validate..."></textarea>
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	{#if valid === true}
		<div class="status ok">✓ Valid JSON</div>
		{#if stats}
			<div class="stats">
				<div class="stat"><span>{stats.type}</span><label>Root Type</label></div>
				<div class="stat"><span>{stats.size}</span><label>Size (chars)</label></div>
				<div class="stat"><span>{stats.depth}</span><label>Max Depth</label></div>
				<div class="stat"><span>{stats.keys}</span><label>Total Keys</label></div>
			</div>
		{/if}
	{:else if valid === false}
		<div class="status fail">✗ Invalid JSON</div>
		<div class="error-detail">{errorMsg}</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); flex: 1; }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { flex: 1; min-height: 150px; font-family: monospace; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: vertical; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.quick { display: flex; gap: var(--spacing-sm); }
	.quick-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.quick-btn:hover { background: var(--color-primary); color: white; }
	.status { padding: var(--spacing-md); border-radius: 6px; font-weight: 600; font-size: 1rem; }
	.status.ok { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
	.status.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
	.error-detail { font-family: monospace; font-size: 0.85rem; color: var(--color-removed-border); background: rgba(239,68,68,0.06); padding: var(--spacing-sm); border-radius: 4px; }
	.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: var(--spacing-md); }
	.stat { background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 6px; padding: var(--spacing-md); text-align: center; }
	.stat span { display: block; font-size: 1.5rem; font-weight: 700; color: var(--color-primary); }
	.stat label { font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); }
</style>
