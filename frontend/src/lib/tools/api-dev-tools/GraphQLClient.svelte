<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'graphql-client',
		name: 'GraphQL Client',
		description: 'Test GraphQL queries and mutations',
		category: 'api-dev',
		icon: 'zap',
		keywords: ['graphql', 'query', 'mutation', 'client']
	};

	let endpoint = $state('https://countries.trevorblades.com/');
	let query = $state('{ countries { code name } }');
	let variables = $state('');
	let headersText = $state('Content-Type: application/json');
	let loading = $state(false);
	let error: string | null = $state(null);
	let output = $state('');

	async function send() {
		error = null;
		output = '';
		loading = true;
		try {
			const headers: Record<string, string> = {};
			headersText.split('\n').forEach((line) => {
				const idx = line.indexOf(':');
				if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			});
			if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

			let vars: unknown = undefined;
			if (variables.trim()) {
				vars = JSON.parse(variables);
			}

			const res = await fetch(endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({ query, variables: vars })
			});
			const json = await res.json();
			output = JSON.stringify(json, null, 2);
		} catch (e) {
			error = `${(e as Error).message} — check endpoint, query syntax, or CORS.`;
		} finally {
			loading = false;
		}
	}

	function copy() {
		navigator.clipboard.writeText(output);
	}
</script>

<div class="tool-wrapper">
	<div class="field">
		<label for="ep">GraphQL Endpoint</label>
		<input id="ep" bind:value={endpoint} placeholder="https://api.example.com/graphql" />
	</div>

	<div class="grid">
		<div class="field">
			<label for="query">Query / Mutation</label>
			<textarea id="query" bind:value={query} placeholder="{'{ field { subfield } }'}"></textarea>
		</div>
		<div class="field">
			<label for="vars">Variables (JSON)</label>
			<textarea id="vars" bind:value={variables} placeholder={'{"id": "1"}'}></textarea>
		</div>
	</div>

	<div class="field">
		<label for="headers">Headers</label>
		<input id="headers" bind:value={headersText} />
	</div>

	<button class="send-btn" onclick={send} disabled={loading}>{loading ? 'Sending...' : '▶ Execute'}</button>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if output}
		<div class="field grow">
			<div class="output-header">
				<label>Response</label>
				<button class="copy-btn" onclick={copy}>📋 Copy</button>
			</div>
			<textarea class="output" readonly value={output}></textarea>
		</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	.field.grow { flex: 1; min-height: 0; }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	input, textarea { padding: 10px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-family: monospace; font-size: 0.85rem; }
	textarea { min-height: 100px; resize: vertical; }
	input:focus, textarea:focus { outline: none; border-color: var(--color-primary); }
	.grid { display: grid; grid-template-columns: 2fr 1fr; gap: var(--spacing-md); }
	.send-btn { align-self: flex-start; background: var(--color-primary); color: white; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; }
	.send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
	.output-header { display: flex; justify-content: space-between; align-items: center; }
	.copy-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
	.output { flex: 1; min-height: 150px; color: var(--color-primary); }
	.error-box { padding: var(--spacing-md); background: rgba(251, 113, 133, 0.1); border: 1px solid var(--color-removed-border); border-radius: 4px; color: var(--color-removed-border); font-size: 0.85rem; }
	@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
