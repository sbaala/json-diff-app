<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { JsonService } from '$lib/services/json.service';
	import { SchemaService } from '$lib/services/schema.service';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'json-schema-generator',
		name: 'JSON Schema Generator',
		description: 'Generate JSON Schema from JSON data',
		category: 'json-api',
		icon: 'layers',
		keywords: ['schema', 'generate', 'structure', 'type']
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
			output = JsonService.stringify(SchemaService.generate(parsed.data), 2);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleClear() { input = ''; output = ''; error = null; }
	function handleSample() {
		input = '{"id":1,"name":"Alice","email":"alice@test.com","active":true,"tags":["a","b"]}';
		transform();
	}

	$effect(() => {
		void input;
		transform();
	});
</script>

<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
