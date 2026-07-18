<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { JsonService } from '$lib/services/json.service';
	import { ConvertersService } from '$lib/services/converters.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'postman-generator',
		name: 'Postman Collection Generator',
		description: 'Generate Postman collections from API specs',
		category: 'api-dev',
		icon: 'download',
		keywords: ['postman', 'collection', 'generate', 'export']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let baseUrl = $state('https://api.example.com');

	function generate() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			const asJson = JsonService.parse(input);
			const spec: any = asJson.valid ? asJson.data : ConvertersService.yamlToJson(input);

			const items: any[] = [];
			for (const [path, methods] of Object.entries(spec.paths || {})) {
				for (const [method, op] of Object.entries(methods as Record<string, any>)) {
					if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
					const cleanPath = path.replace(/^\//, '');
					items.push({
						name: op.summary || `${method.toUpperCase()} ${path}`,
						request: {
							method: method.toUpperCase(),
							header: [{ key: 'Content-Type', value: 'application/json' }],
							url: {
								raw: `{{baseUrl}}${path}`,
								host: ['{{baseUrl}}'],
								path: cleanPath.split('/').filter(Boolean)
							}
						}
					});
				}
			}

			const collection = {
				info: {
					name: spec.info?.title || 'API Collection',
					schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
				},
				item: items,
				variable: [{ key: 'baseUrl', value: baseUrl }]
			};

			output = JsonService.stringify(collection, 2);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleClear() { input = ''; output = ''; error = null; }
	function handleSample() {
		input = JSON.stringify(
			{
				info: { title: 'My API', version: '1.0.0' },
				paths: {
					'/users': { get: { summary: 'List users' }, post: { summary: 'Create user' } },
					'/users/{id}': { get: { summary: 'Get user' } }
				}
			},
			null,
			2
		);
		generate();
	}

	$effect(() => {
		void [input, baseUrl];
		generate();
	});
</script>

<div class="tool-wrapper">
	<div class="base-row">
		<label for="base">Base URL variable:</label>
		<input id="base" bind:value={baseUrl} />
	</div>
	<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; }
	.base-row { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-sm) var(--spacing-md); background: var(--color-surface-elevated); }
	.base-row label { font-size: 0.85rem; color: var(--color-text-muted); font-weight: 600; white-space: nowrap; }
	.base-row input { flex: 1; padding: 8px 12px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-family: monospace; font-size: 0.85rem; }
	.base-row input:focus { outline: none; border-color: var(--color-primary); }
</style>
