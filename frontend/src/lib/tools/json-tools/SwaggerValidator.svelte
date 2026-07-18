<script lang="ts">
	import { JsonService } from '$lib/services/json.service';
	import { ConvertersService } from '$lib/services/converters.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'swagger-validator',
		name: 'Swagger/OpenAPI Validator',
		description: 'Validate OpenAPI/Swagger specifications',
		category: 'json-api',
		icon: 'check-circle',
		keywords: ['swagger', 'openapi', 'api', 'validate']
	};

	let input = $state('');
	let issues = $state<Array<{ level: 'error' | 'warning'; message: string }>>([]);
	let info = $state<{ version: string; title: string; paths: number } | null>(null);
	let parseError: string | null = $state(null);

	function parseSpec(text: string): any {
		const asJson = JsonService.parse(text);
		if (asJson.valid) return asJson.data;
		return ConvertersService.yamlToJson(text);
	}

	function validate() {
		issues = [];
		info = null;
		parseError = null;
		if (!input.trim()) return;

		let spec: any;
		try {
			spec = parseSpec(input);
		} catch (e) {
			parseError = `Parse error: ${(e as Error).message}`;
			return;
		}

		const found: typeof issues = [];
		const version = spec.openapi || spec.swagger;
		if (!version) {
			found.push({ level: 'error', message: 'Missing "openapi" or "swagger" version field' });
		}
		if (!spec.info) {
			found.push({ level: 'error', message: 'Missing required "info" object' });
		} else {
			if (!spec.info.title) found.push({ level: 'error', message: 'info.title is required' });
			if (!spec.info.version) found.push({ level: 'error', message: 'info.version is required' });
		}
		if (!spec.paths) {
			found.push({ level: 'error', message: 'Missing required "paths" object' });
		} else {
			const pathCount = Object.keys(spec.paths).length;
			if (pathCount === 0) found.push({ level: 'warning', message: 'paths object is empty' });
			for (const [p, methods] of Object.entries(spec.paths)) {
				if (!p.startsWith('/')) found.push({ level: 'warning', message: `Path "${p}" should start with /` });
				for (const [method, op] of Object.entries(methods as Record<string, any>)) {
					if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
						if (!op.responses) {
							found.push({ level: 'error', message: `${method.toUpperCase()} ${p}: missing responses` });
						}
					}
				}
			}
		}
		if (version && spec.openapi && !/^3\./.test(spec.openapi)) {
			found.push({ level: 'warning', message: `OpenAPI ${spec.openapi} — validator tuned for 3.x` });
		}

		issues = found;
		if (spec.info && spec.paths) {
			info = {
				version: version || 'unknown',
				title: spec.info.title || 'untitled',
				paths: Object.keys(spec.paths).length
			};
		}
	}

	function handleSample() {
		input = JSON.stringify(
			{
				openapi: '3.0.0',
				info: { title: 'Sample API', version: '1.0.0' },
				paths: { '/users': { get: { summary: 'List users' } } }
			},
			null,
			2
		);
		validate();
	}
	function handleClear() {
		input = ''; issues = []; info = null; parseError = null;
	}

	$effect(() => {
		void input;
		validate();
	});

	let errorCount = $derived(issues.filter((i) => i.level === 'error').length);
</script>

<div class="tool-wrapper">
	<div class="field">
		<label for="spec">OpenAPI / Swagger Spec (JSON or YAML)</label>
		<textarea id="spec" bind:value={input} placeholder="Paste OpenAPI spec..."></textarea>
	</div>

	<div class="quick">
		<button class="quick-btn" onclick={handleSample}>📋 Sample</button>
		<button class="quick-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>

	{#if parseError}
		<div class="status fail">⚠️ {parseError}</div>
	{:else if input.trim()}
		{#if errorCount === 0}
			<div class="status ok">✓ Valid specification{issues.length ? ` (${issues.length} warnings)` : ''}</div>
		{:else}
			<div class="status fail">✗ {errorCount} {errorCount === 1 ? 'error' : 'errors'} found</div>
		{/if}
		{#if info}
			<div class="info-bar">
				<span>Version: <strong>{info.version}</strong></span>
				<span>Title: <strong>{info.title}</strong></span>
				<span>Paths: <strong>{info.paths}</strong></span>
			</div>
		{/if}
		{#if issues.length > 0}
			<div class="issues">
				{#each issues as issue}
					<div class="issue {issue.level}">
						<span class="issue-badge {issue.level}">{issue.level}</span>
						{issue.message}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; gap: var(--spacing-md); padding: var(--spacing-md); }
	.field { display: flex; flex-direction: column; gap: var(--spacing-xs); flex: 1; }
	label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
	textarea { flex: 1; min-height: 160px; font-family: monospace; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: var(--spacing-sm); resize: vertical; }
	textarea:focus { outline: none; border-color: var(--color-primary); }
	.quick { display: flex; gap: var(--spacing-sm); }
	.quick-btn { background: var(--color-secondary); color: var(--color-text); border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.quick-btn:hover { background: var(--color-primary); color: white; }
	.status { padding: var(--spacing-md); border-radius: 6px; font-weight: 600; }
	.status.ok { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
	.status.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
	.info-bar { display: flex; gap: var(--spacing-lg); flex-wrap: wrap; font-size: 0.85rem; color: var(--color-text-muted); background: var(--color-surface-elevated); padding: var(--spacing-sm) var(--spacing-md); border-radius: 4px; }
	.info-bar strong { color: var(--color-primary); }
	.issues { display: flex; flex-direction: column; gap: var(--spacing-xs); overflow-y: auto; }
	.issue { display: flex; align-items: center; gap: var(--spacing-sm); padding: 8px 12px; border-radius: 4px; font-size: 0.82rem; }
	.issue.error { background: rgba(239,68,68,0.06); }
	.issue.warning { background: rgba(245,158,11,0.06); }
	.issue-badge { text-transform: uppercase; font-size: 0.62rem; font-weight: 700; padding: 2px 6px; border-radius: 3px; color: white; }
	.issue-badge.error { background: #ef4444; }
	.issue-badge.warning { background: #f59e0b; }
</style>
