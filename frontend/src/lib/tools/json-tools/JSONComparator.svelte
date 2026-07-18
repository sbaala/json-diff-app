<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'json-comparator',
		name: 'JSON Comparator',
		description: 'Compare two JSON objects and highlight differences',
		category: 'json-api',
		icon: 'diff',
		keywords: ['compare', 'diff', 'difference', 'merge']
	};

	let leftInput = $state('');
	let rightInput = $state('');
	let error: string | null = $state(null);
	let diffs = $state<Array<{ path: string; type: string; left: string; right: string }>>([]);
	let compared = $state(false);

	function diff(a: unknown, b: unknown, path: string, out: typeof diffs) {
		const ta = jsonType(a);
		const tb = jsonType(b);
		if (ta !== tb) {
			out.push({ path, type: 'changed', left: fmt(a), right: fmt(b) });
			return;
		}
		if (ta === 'object') {
			const ao = a as Record<string, unknown>;
			const bo = b as Record<string, unknown>;
			const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
			for (const k of keys) {
				const p = path ? `${path}.${k}` : k;
				if (!(k in ao)) out.push({ path: p, type: 'added', left: '', right: fmt(bo[k]) });
				else if (!(k in bo)) out.push({ path: p, type: 'removed', left: fmt(ao[k]), right: '' });
				else diff(ao[k], bo[k], p, out);
			}
		} else if (ta === 'array') {
			const aa = a as unknown[];
			const ba = b as unknown[];
			const max = Math.max(aa.length, ba.length);
			for (let i = 0; i < max; i++) {
				const p = `${path}[${i}]`;
				if (i >= aa.length) out.push({ path: p, type: 'added', left: '', right: fmt(ba[i]) });
				else if (i >= ba.length) out.push({ path: p, type: 'removed', left: fmt(aa[i]), right: '' });
				else diff(aa[i], ba[i], p, out);
			}
		} else if (a !== b) {
			out.push({ path, type: 'changed', left: fmt(a), right: fmt(b) });
		}
	}

	function jsonType(v: unknown): string {
		if (v === null) return 'null';
		if (Array.isArray(v)) return 'array';
		return typeof v;
	}
	function fmt(v: unknown): string {
		return typeof v === 'string' ? `"${v}"` : JSON.stringify(v);
	}

	function run() {
		compared = false;
		error = null;
		diffs = [];
		if (!leftInput.trim() || !rightInput.trim()) return;
		const l = JsonService.parse(leftInput);
		const r = JsonService.parse(rightInput);
		if (!l.valid) { error = `Left: ${l.error}`; return; }
		if (!r.valid) { error = `Right: ${r.error}`; return; }
		const out: typeof diffs = [];
		diff(l.data, r.data, '', out);
		diffs = out;
		compared = true;
	}

	function handleSample() {
		leftInput = JSON.stringify({ name: 'Alice', age: 30, city: 'NYC' }, null, 2);
		rightInput = JSON.stringify({ name: 'Alice', age: 31, country: 'US' }, null, 2);
		run();
	}
	function handleClear() {
		leftInput = ''; rightInput = ''; diffs = []; error = null; compared = false;
	}

	$effect(() => {
		void [leftInput, rightInput];
		run();
	});
</script>

<div class="tool-wrapper">
	<div class="grid">
		<div class="field">
			<label for="left">Left JSON</label>
			<textarea id="left" bind:value={leftInput} placeholder="First JSON..."></textarea>
		</div>
		<div class="field">
			<label for="right">Right JSON</label>
			<textarea id="right" bind:value={rightInput} placeholder="Second JSON..."></textarea>
		</div>
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if compared && diffs.length === 0}
		<div class="status ok">✓ JSONs are identical</div>
	{:else if compared}
		<div class="status">{diffs.length} {diffs.length === 1 ? 'difference' : 'differences'}</div>
		<div class="diff-list">
			{#each diffs as d}
				<div class="diff-row {d.type}">
					<span class="badge {d.type}">{d.type}</span>
					<span class="path">{d.path}</span>
					<span class="values">
						{#if d.left}<span class="left">{d.left}</span>{/if}
						{#if d.left && d.right}<span class="arrow">→</span>{/if}
						{#if d.right}<span class="right">{d.right}</span>{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); min-height: 140px; }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { flex: 1; min-height: 120px; font-family: monospace; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: vertical; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.quick { display: flex; gap: var(--spacing-sm); }
	.quick-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.quick-btn:hover { background: var(--color-primary); color: white; }
	.status { padding: var(--spacing-sm) var(--spacing-md); border-radius: 6px; font-weight: 600; background: var(--color-surface-elevated); }
	.status.ok { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
	.diff-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-xs); }
	.diff-row { display: flex; align-items: center; gap: var(--spacing-sm); padding: 8px 12px; background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 4px; font-family: monospace; font-size: 0.8rem; }
	.badge { text-transform: uppercase; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 3px; color: white; }
	.badge.added { background: #22c55e; }
	.badge.removed { background: #ef4444; }
	.badge.changed { background: #f59e0b; }
	.path { color: var(--color-primary); font-weight: 600; }
	.values { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
	.left { color: #ef4444; }
	.right { color: #22c55e; }
	.arrow { color: var(--color-text-muted); }
	@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
