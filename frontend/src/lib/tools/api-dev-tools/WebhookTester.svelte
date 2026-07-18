<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'webhook-tester',
		name: 'Webhook Tester',
		description: 'Test webhooks and inspect payloads',
		category: 'api-dev',
		icon: 'send',
		keywords: ['webhook', 'test', 'payload', 'inspector']
	};

	let rawPayload = $state('');
	let contentType = $state('application/json');
	let error: string | null = $state(null);
	let parsed = $state<{ formatted: string; fields: Array<{ path: string; type: string; value: string }> } | null>(null);

	function inspect() {
		error = null;
		parsed = null;
		if (!rawPayload.trim()) return;
		try {
			if (contentType === 'application/json') {
				const result = JsonService.parse(rawPayload);
				if (!result.valid) throw new Error(result.error);
				const fields: Array<{ path: string; type: string; value: string }> = [];
				flatten(result.data, '', fields);
				parsed = { formatted: JsonService.stringify(result.data, 2), fields };
			} else if (contentType === 'application/x-www-form-urlencoded') {
				const params = new URLSearchParams(rawPayload);
				const fields: Array<{ path: string; type: string; value: string }> = [];
				const obj: Record<string, string> = {};
				params.forEach((v, k) => {
					obj[k] = v;
					fields.push({ path: k, type: 'string', value: v });
				});
				parsed = { formatted: JsonService.stringify(obj, 2), fields };
			} else {
				parsed = { formatted: rawPayload, fields: [] };
			}
		} catch (e) {
			error = (e as Error).message;
		}
	}

	function flatten(val: unknown, path: string, out: Array<{ path: string; type: string; value: string }>) {
		if (val !== null && typeof val === 'object') {
			for (const [k, v] of Object.entries(val)) {
				const p = path ? `${path}.${k}` : k;
				if (v !== null && typeof v === 'object') flatten(v, p, out);
				else out.push({ path: p, type: v === null ? 'null' : typeof v, value: String(v) });
			}
		} else {
			out.push({ path: path || 'root', type: typeof val, value: String(val) });
		}
	}

	function handleSample() {
		contentType = 'application/json';
		rawPayload = JSON.stringify(
			{
				event: 'payment.succeeded',
				data: { id: 'pay_123', amount: 4999, currency: 'usd', customer: { email: 'a@test.com' } },
				timestamp: 1735689600
			},
			null,
			2
		);
		inspect();
	}
	function handleClear() { rawPayload = ''; parsed = null; error = null; }

	$effect(() => {
		void [rawPayload, contentType];
		inspect();
	});
</script>

<div class="tool-wrapper">
	<div class="ct-row">
		<label for="ct">Content-Type:</label>
		<select id="ct" bind:value={contentType}>
			<option value="application/json">application/json</option>
			<option value="application/x-www-form-urlencoded">x-www-form-urlencoded</option>
			<option value="text/plain">text/plain</option>
		</select>
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	<div class="field">
		<label for="payload">Webhook Payload</label>
		<textarea id="payload" bind:value={rawPayload} placeholder="Paste incoming webhook payload..."></textarea>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if parsed}
		<div class="results">
			<div class="field">
				<label>Formatted</label>
				<textarea class="formatted" readonly value={parsed.formatted}></textarea>
			</div>
			{#if parsed.fields.length > 0}
				<div class="field">
					<label>Fields ({parsed.fields.length})</label>
					<div class="fields-list">
						{#each parsed.fields as f}
							<div class="field-row">
								<span class="fpath">{f.path}</span>
								<span class="ftype">{f.type}</span>
								<span class="fval">{f.value}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.ct-row { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
	.ct-row label { font-size: 0.85rem; color: var(--color-text-muted); font-weight: 600; }
	.ct-row select { padding: 8px 10px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-size: 0.85rem; }
	.quick-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.quick-btn:hover { background: var(--color-primary); color: white; }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { font-family: monospace; font-size: 0.82rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: vertical; min-height: 90px; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.results { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); min-height: 0; }
	.formatted { flex: 1; min-height: 150px; color: var(--color-primary); }
	.fields-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); background: var(--color-bg); }
	.field-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--spacing-sm); padding: 4px 6px; font-family: monospace; font-size: 0.78rem; border-bottom: 1px solid var(--color-border); }
	.fpath { color: var(--color-primary); font-weight: 600; }
	.ftype { color: var(--color-text-muted); font-size: 0.68rem; text-transform: uppercase; }
	.fval { color: var(--color-text); word-break: break-all; }
	.error-box { padding: var(--spacing-md); background: rgba(251, 113, 133, 0.1); border: 1px solid var(--color-removed-border); border-radius: 4px; color: var(--color-removed-border); }
	@media (max-width: 768px) { .results { grid-template-columns: 1fr; } }
</style>
