<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { JsonService } from '$lib/services/json.service';
	import { SchemaService } from '$lib/services/schema.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'mock-api-generator',
		name: 'Mock API Generator',
		description: 'Generate mock API responses from schemas',
		category: 'json-api',
		icon: 'wand',
		keywords: ['mock', 'generate', 'fake', 'dummy']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);

	function transform() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			const parsed = JsonService.parse(input);
			if (!parsed.valid) throw new Error(parsed.error);
			output = JsonService.stringify(SchemaService.mock(parsed.data as Record<string, any>), 2);
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
				type: 'object',
				properties: {
					id: { type: 'integer' },
					email: { type: 'string', format: 'email' },
					createdAt: { type: 'string', format: 'date-time' },
					tags: { type: 'array', items: { type: 'string' } }
				}
			},
			null,
			2
		);
		transform();
	}

	$effect(() => {
		void input;
		transform();
	});
</script>

<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
