<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import { ConvertersService } from '$lib/services/converters.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'openapi-viewer',
		name: 'OpenAPI Viewer',
		description: 'View and browse OpenAPI specifications',
		category: 'json-api',
		icon: 'book-open',
		keywords: ['openapi', 'swagger', 'api', 'documentation']
	};

	let input = $state('');
	let error: string | null = $state(null);
	let spec = $state<any>(null);
	let endpoints = $state<Array<{ method: string; path: string; summary: string }>>([]);

	const methodColors: Record<string, string> = {
		get: '#22c55e', post: '#3b82f6', put: '#f59e0b', delete: '#ef4444', patch: '#a855f7'
	};

	function parse() {
		error = null;
		spec = null;
		endpoints = [];
		if (!input.trim()) return;
		try {
			const asJson = JsonService.parse(input);
			const data = asJson.valid ? asJson.data : ConvertersService.yamlToJson(input);
			spec = data;
			const eps: typeof endpoints = [];
			for (const [path, methods] of Object.entries((data as any).paths || {})) {
				for (const [method, op] of Object.entries(methods as Record<string, any>)) {
					if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
						eps.push({ method, path, summary: op.summary || op.description || '' });
					}
				}
			}
			endpoints = eps;
		} catch (e) {
			error = (e as Error).message;
		}
	}

	function handleSample() {
		input = JSON.stringify(
			{
				openapi: '3.0.0',
				info: { title: 'Petstore', version: '1.0.0', description: 'A sample API' },
				paths: {
					'/pets': {
						get: { summary: 'List all pets' },
						post: { summary: 'Create a pet' }
					},
					'/pets/{id}': {
						get: { summary: 'Get a pet by ID' },
						delete: { summary: 'Delete a pet' }
					}
				}
			},
			null,
			2
		);
		parse();
	}
	function handleClear() {
		input = ''; spec = null; endpoints = []; error = null;
	}

	$effect(() => {
		void input;
		parse();
	});
</script>

<div class="tool-wrapper">
	<div class="field">
		<label for="spec">OpenAPI Spec (JSON or YAML)</label>
		<textarea id="spec" bind:value={input} placeholder="Paste OpenAPI spec..."></textarea>
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if spec}
		{#if spec.info}
			<div class="api-header">
				<div class="api-title">{spec.info.title || 'API'} <span class="api-version">v{spec.info.version || '?'}</span></div>
				{#if spec.info.description}<div class="api-desc">{spec.info.description}</div>{/if}
			</div>
		{/if}
		<div class="endpoints">
			{#each endpoints as ep}
				<div class="endpoint">
					<span class="method" style="background: {methodColors[ep.method] || '#64748b'}">{ep.method.toUpperCase()}</span>
					<span class="ep-path">{ep.path}</span>
					<span class="ep-summary">{ep.summary}</span>
				</div>
			{/each}
			{#if endpoints.length === 0}
				<div class="empty">No endpoints found in spec</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { min-height: 120px; font-family: monospace; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: vertical; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.quick { display: flex; gap: var(--spacing-sm); }
	.quick-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.quick-btn:hover { background: var(--color-primary); color: white; }
	.api-header { background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 6px; padding: var(--spacing-md); }
	.api-title { font-size: 1.2rem; font-weight: 700; }
	.api-version { font-size: 0.8rem; color: var(--color-text-muted); font-weight: 400; }
	.api-desc { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 4px; }
	.endpoints { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-xs); }
	.endpoint { display: flex; align-items: center; gap: var(--spacing-md); padding: 10px 14px; background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 4px; }
	.method { color: white; font-weight: 700; font-size: 0.7rem; padding: 3px 8px; border-radius: 3px; min-width: 60px; text-align: center; }
	.ep-path { font-family: monospace; font-weight: 600; color: var(--color-text); }
	.ep-summary { font-size: 0.85rem; color: var(--color-text-muted); }
	.empty { color: var(--color-text-muted); text-align: center; padding: var(--spacing-lg); }
	.error-box { padding: var(--spacing-md); background: rgba(251, 113, 133, 0.1); border: 1px solid var(--color-removed-border); border-radius: 4px; color: var(--color-removed-border); }
</style>
