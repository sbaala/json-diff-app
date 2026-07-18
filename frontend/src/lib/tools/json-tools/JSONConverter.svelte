<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { ConvertersService } from '$lib/services/converters.service';
	import { JsonService } from '$lib/services/json.service';
	import type { ToolMetadata, ToolCategory } from '$lib/types';

	interface Props {
		toolId: string;
		toolName: string;
		toolDescription: string;
		format: 'yaml' | 'xml' | 'csv';
	}
	const { toolId, toolName, toolDescription, format }: Props = $props();

	const tool: ToolMetadata = {
		id: toolId,
		name: toolName,
		description: toolDescription,
		category: 'json-api' as ToolCategory,
		icon: 'arrow-right-left',
		keywords: ['convert', format]
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let direction = $state<'json-to' | 'to-json'>('json-to');

	function transform() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			if (direction === 'json-to') {
				const parsed = JsonService.parse(input);
				if (!parsed.valid) throw new Error(parsed.error);
				if (format === 'yaml') output = ConvertersService.jsonToYaml(parsed.data);
				else if (format === 'xml') output = ConvertersService.jsonToXml(parsed.data);
				else output = ConvertersService.jsonToCsv(parsed.data);
			} else {
				let obj: unknown;
				if (format === 'yaml') obj = ConvertersService.yamlToJson(input);
				else if (format === 'xml') obj = ConvertersService.xmlToJson(input);
				else obj = ConvertersService.csvToJson(input);
				output = JsonService.stringify(obj, 2);
			}
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}
	function handleSample() {
		if (direction === 'json-to') {
			if (format === 'csv') input = '[{"name":"Alice","age":30},{"name":"Bob","age":25}]';
			else input = '{"name":"Alice","age":30,"roles":["admin","user"]}';
		} else {
			if (format === 'yaml') input = 'name: Alice\nage: 30\nroles:\n  - admin\n  - user';
			else if (format === 'xml') input = '<root><name>Alice</name><age>30</age></root>';
			else input = 'name,age\nAlice,30\nBob,25';
		}
		transform();
	}

	$effect(() => {
		void [input, direction];
		transform();
	});
</script>

<div class="tool-wrapper">
	<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
	<div class="tool-controls">
		<label for="dir">Direction:</label>
		<select id="dir" bind:value={direction}>
			<option value="json-to">JSON → {format.toUpperCase()}</option>
			<option value="to-json">{format.toUpperCase()} → JSON</option>
		</select>
	</div>
</div>

<style>
	.tool-wrapper { display: flex; flex-direction: column; height: 100%; }
	.tool-controls { display: flex; gap: var(--spacing-md); padding: var(--spacing-md); background: var(--color-surface-elevated); border-top: 1px solid var(--color-border); align-items: center; }
	label { font-weight: 500; color: var(--color-text-muted); font-size: 0.875rem; }
	select { padding: 8px 12px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-size: 0.875rem; }
	select:focus { outline: none; border-color: var(--color-primary); }
</style>
