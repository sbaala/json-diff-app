<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'request-response-diff',
		name: 'Request/Response Diff',
		description: 'Compare API request and response payloads',
		category: 'api-dev',
		icon: 'diff',
		keywords: ['diff', 'request', 'response', 'compare']
	};

	let requestInput = $state('');
	let responseInput = $state('');
	let error: string | null = $state(null);
	let diffs = $state<Array<{ path: string; type: string; req: string; res: string }>>([]);
	let compared = $state(false);

	function diff(a: unknown, b: unknown, path: string, out: typeof diffs) {
		const ta = jsonType(a);
		const tb = jsonType(b);
		if (ta !== tb) {
			out.push({ path: path || 'root', type: 'changed', req: fmt(a), res: fmt(b) });
			return;
		}
		if (ta === 'object') {
			const ao = a as Record<string, unknown>;
			const bo = b as Record<string, unknown>;
			const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
			for (const k of keys) {
				const p = path ? `${path}.${k}` : k;
				if (!(k in ao)) out.push({ path: p, type: 'added', req: '', res: fmt(bo[k]) });
				else if (!(k in bo)) out.push({ path: p, type: 'removed', req: fmt(ao[k]), res: '' });
				else diff(ao[k], bo[k], p, out);
			}
		} else if (ta === 'array') {
			const aa = a as unknown[];
			const ba = b as unknown[];
			for (let i = 0; i < Math.max(aa.length, ba.length); i++) {
				const p = `${path}[${i}]`;
				if (i >= aa.length) out.push({ path: p, type: 'added', req: '', res: fmt(ba[i]) });
				else if (i >= ba.length) out.push({ path: p, type: 'removed', req: fmt(aa[i]), res: '' });
				else diff(aa[i], ba[i], p, out);
			}
		} else if (a !== b) {
			out.push({ path: path || 'root', type: 'changed', req: fmt(a), res: fmt(b) });
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
		if (!requestInput.trim() || !responseInput.trim()) return;
		const req = JsonService.parse(requestInput);
		const res = JsonService.parse(responseInput);
		if (!req.valid) { error = `Request: ${req.error}`; return; }
		if (!res.valid) { error = `Response: ${res.error}`; return; }
		const out: typeof diffs = [];
		diff(req.data, res.data, '', out);
		diffs = out;
		compared = true;
	}

	function handleSample() {
		requestInput = JSON.stringify({ name: 'Alice', email: 'a@test.com' }, null, 2);
		responseInput = JSON.stringify({ id: 1, name: 'Alice', email: 'a@test.com', createdAt: '2026-01-01' }, null, 2);
		run();
	}
	function handleClear() { requestInput = ''; responseInput = ''; diffs = []; error = null; compared = false; }

	$effect(() => {
		void [requestInput, responseInput];
		run();
	});
</script>

<div class="tool-wrapper">
	<div class="grid">
		<div class="field">
			<label for="req">Request Payload</label>
			<textarea id="req" bind:value={requestInput} placeholder="Request JSON..."></textarea>
		</div>
		<div class="field">
			<label for="res">Response Payload</label>
			<textarea id="res" bind:value={responseInput} placeholder="Response JSON..."></textarea>
		</div>
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if compared && diffs.length === 0}
		<div class="status ok">✓ Request and response payloads are identical</div>
	{:else if compared}
		<div class="status">{diffs.length} {diffs.length === 1 ? 'difference' : 'differences'}</div>
		<div class="diff-list">
			{#each diffs as d}
				<div class="diff-row">
					<span class="badge {d.type}">{d.type}</span>
					<span class="path">{d.path}</span>
					<span class="vals">
						{#if d.req}<span class="req">{d.req}</span>{/if}
						{#if d.req && d.res}<span class="arrow">→</span>{/if}
						{#if d.res}<span class="res">{d.res}</span>{/if}
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
	.vals { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
	.req { color: #ef4444; }
	.res { color: #22c55e; }
	.arrow { color: var(--color-text-muted); }
	.error-box { padding: var(--spacing-md); background: rgba(251, 113, 133, 0.1); border: 1px solid var(--color-removed-border); border-radius: 4px; color: var(--color-removed-border); }
	@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
