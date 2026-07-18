<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'xml-formatter',
		name: 'XML Formatter',
		description: 'Format and beautify XML',
		category: 'api-dev',
		icon: 'code',
		keywords: ['xml', 'format', 'beautify', 'minify']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let mode = $state<'format' | 'minify'>('format');
	let indentSize = $state(2);

	function formatXML() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}

		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(input, 'text/xml');

			if (doc.getElementsByTagName('parsererror').length > 0) {
				throw new Error('Invalid XML syntax');
			}

			if (mode === 'minify') {
				output = doc.documentElement.outerHTML.replace(/>\s+</g, '><');
			} else {
				output = formatXMLString(doc.documentElement, 0, indentSize);
			}

			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function formatXMLString(node: Element, indent: number, indentSize: number): string {
		const pad = ' '.repeat(indent);
		const nextPad = ' '.repeat(indent + indentSize);

		let result = '';
		let hasChildren = false;

		if (node.childNodes.length > 0) {
			for (let i = 0; i < node.childNodes.length; i++) {
				const child = node.childNodes[i];
				if (child.nodeType === 1) {
					hasChildren = true;
					break;
				} else if (child.nodeType === 3 && child.nodeValue?.trim()) {
					hasChildren = true;
					break;
				}
			}
		}

		let openTag = `<${node.nodeName}`;
		for (let i = 0; i < node.attributes.length; i++) {
			const attr = node.attributes[i];
			openTag += ` ${attr.name}="${attr.value}"`;
		}

		if (!hasChildren && node.childNodes.length === 0) {
			return `${pad}${openTag} />\n`;
		}

		openTag += '>';
		result += `${pad}${openTag}\n`;

		for (let i = 0; i < node.childNodes.length; i++) {
			const child = node.childNodes[i];
			if (child.nodeType === 1) {
				result += formatXMLString(child as Element, indent + indentSize, indentSize);
			} else if (child.nodeType === 3) {
				const text = child.nodeValue?.trim();
				if (text) {
					result += `${nextPad}${text}\n`;
				}
			}
		}

		result += `${pad}</${node.nodeName}>\n`;
		return result;
	}

	function handleInput() {
		formatXML();
	}

	function handleModeChange(e: Event) {
		mode = (e.target as HTMLSelectElement).value as typeof mode;
		formatXML();
	}

	function handleIndentChange(e: Event) {
		indentSize = parseInt((e.target as HTMLInputElement).value) || 2;
		formatXML();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = `<?xml version="1.0"?><root><user><name>John Doe</name><email>john@example.com</email></user></root>`;
		formatXML();
	}
</script>

<div class="tool-wrapper">
	<ToolContainer
		{tool}
		bind:input
		bind:output
		bind:error
		onClear={handleClear}
		onSample={handleSample}
	/>

	<div class="tool-controls">
		<label for="mode">Mode:</label>
		<select id="mode" value={mode} onchange={handleModeChange}>
			<option value="format">Format (Beautify)</option>
			<option value="minify">Minify (Compact)</option>
		</select>

		{#if mode === 'format'}
			<label for="indent">Indent:</label>
			<select id="indent" value={indentSize} onchange={handleIndentChange}>
				<option value="2">2 spaces</option>
				<option value="4">4 spaces</option>
				<option value="8">8 spaces</option>
				<option value="1">1 tab</option>
			</select>
		{/if}
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.tool-controls {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-top: 1px solid var(--color-border);
		align-items: center;
		flex-wrap: wrap;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select {
		flex: 1;
		min-width: 150px;
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
</style>
