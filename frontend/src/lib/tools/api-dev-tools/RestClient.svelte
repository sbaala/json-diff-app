<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'rest-client',
		name: 'REST Client',
		description: 'Test API endpoints with request builder',
		category: 'api-dev',
		icon: 'globe',
		keywords: ['rest', 'api', 'http', 'request', 'client']
	};

	let method = $state('GET');
	let url = $state('https://jsonplaceholder.typicode.com/todos/1');
	let headersText = $state('Accept: application/json');
	let body = $state('');
	let loading = $state(false);
	let error: string | null = $state(null);
	let response = $state<{
		status: number;
		statusText: string;
		time: number;
		headers: Record<string, string>;
		body: string;
	} | null>(null);

	async function send() {
		error = null;
		response = null;
		loading = true;
		const start = performance.now();
		try {
			const headers: Record<string, string> = {};
			headersText.split('\n').forEach((line) => {
				const idx = line.indexOf(':');
				if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			});

			const opts: RequestInit = { method, headers };
			if (method !== 'GET' && method !== 'HEAD' && body.trim()) {
				opts.body = body;
			}

			const res = await fetch(url, opts);
			const text = await res.text();
			const respHeaders: Record<string, string> = {};
			res.headers.forEach((v, k) => (respHeaders[k] = v));

			let formattedBody = text;
			try {
				formattedBody = JSON.stringify(JSON.parse(text), null, 2);
			} catch {
				/* keep raw */
			}

			response = {
				status: res.status,
				statusText: res.statusText,
				time: Math.round(performance.now() - start),
				headers: respHeaders,
				body: formattedBody
			};
		} catch (e) {
			error = `${(e as Error).message} — the endpoint may block CORS from the browser.`;
		} finally {
			loading = false;
		}
	}

	function statusClass(s: number): string {
		if (s < 300) return 'ok';
		if (s < 400) return 'redirect';
		if (s < 500) return 'client-err';
		return 'server-err';
	}
</script>

<div class="tool-wrapper">
	<div class="request-bar">
		<select bind:value={method} class="method-select">
			<option>GET</option>
			<option>POST</option>
			<option>PUT</option>
			<option>DELETE</option>
			<option>PATCH</option>
		</select>
		<input class="url-input" bind:value={url} placeholder="https://api.example.com/endpoint" />
		<button class="send-btn" onclick={send} disabled={loading}>{loading ? '...' : 'Send'}</button>
	</div>

	<div class="config-grid">
		<div class="field">
			<label for="headers">Headers (one per line)</label>
			<textarea id="headers" bind:value={headersText} placeholder="Content-Type: application/json"></textarea>
		</div>
		{#if method !== 'GET' && method !== 'HEAD'}
			<div class="field">
				<label for="body">Request Body</label>
				<textarea id="body" bind:value={body} placeholder={'{"key": "value"}'}></textarea>
			</div>
		{/if}
	</div>

	<div class="note">ℹ️ Runs 100% in your browser. Requests are subject to CORS — target APIs must allow browser origins.</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if response}
		<div class="response">
			<div class="resp-status">
				<span class="status-badge {statusClass(response.status)}">{response.status} {response.statusText}</span>
				<span class="resp-time">{response.time} ms</span>
			</div>
			<div class="field">
				<label>Response Body</label>
				<textarea class="resp-body" readonly value={response.body}></textarea>
			</div>
		</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.request-bar { display: flex; gap: var(--spacing-sm); }
	.method-select { padding: 10px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-weight: 600; }
	.url-input { flex: 1; padding: 10px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-family: monospace; font-size: 0.9rem; }
	.url-input:focus, .method-select:focus { outline: none; border-color: var(--color-primary); }
	.send-btn { background: var(--color-primary); color: white; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; }
	.send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
	.config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
	.config-grid:has(.field:only-child) { grid-template-columns: 1fr; }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { min-height: 70px; font-family: monospace; font-size: 0.82rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: vertical; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.note { font-size: 0.78rem; color: var(--color-text-muted); background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); }
	.response { flex: 1; display: flex; flex-direction: column; gap: var(--spacing-sm); min-height: 0; }
	.resp-status { display: flex; align-items: center; gap: var(--spacing-md); }
	.status-badge { padding: 4px 12px; border-radius: 4px; font-weight: 700; color: white; }
	.status-badge.ok { background: #22c55e; }
	.status-badge.redirect { background: #f59e0b; }
	.status-badge.client-err { background: #ef4444; }
	.status-badge.server-err { background: #b91c1c; }
	.resp-time { color: var(--color-text-muted); font-size: 0.85rem; }
	.resp-body { flex: 1; min-height: 150px; }
	.error-box { padding: var(--spacing-md); background: rgba(251, 113, 133, 0.1); border: 1px solid var(--color-removed-border); border-radius: 4px; color: var(--color-removed-border); font-size: 0.85rem; }
	@media (max-width: 768px) { .config-grid { grid-template-columns: 1fr; } }
</style>
