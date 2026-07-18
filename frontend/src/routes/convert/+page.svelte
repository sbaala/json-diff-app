<script lang="ts">
	// Mode: json-to-format or values-to-json
	let mode = $state<'json-to-format' | 'values-to-json'>('json-to-format');

	// --- JSON → Format mode ---
	let jsonInput = $state('');
	let output = $state('');
	let outputFormat = $state<'xml' | 'csv' | 'yaml'>('xml');
	let error = $state<string | null>(null);
	let copySuccess = $state(false);

	// --- Values → JSON mode ---
	let valuesInput = $state('');
	let valuesOutputFormat = $state<'array' | 'quoted'>('array');
	let valuesCopySuccess = $state(false);

	let valuesOutput = $derived.by(() => {
		const trimmed = valuesInput.trim();
		if (!trimmed) return '';
		let values: string[];
		if (trimmed.includes('\n')) {
			values = trimmed.split('\n').map(v => v.trim()).filter(v => v.length > 0);
		} else {
			values = trimmed.split(',').map(v => v.trim()).filter(v => v.length > 0);
		}
		if (valuesOutputFormat === 'array') {
			return JSON.stringify(values, null, 2);
		} else {
			return values.map(v => `"${v}"`).join(', ');
		}
	});

	function convertJson() {
		error = null;
		output = '';

		if (!jsonInput.trim()) {
			error = 'Please enter JSON to convert';
			return;
		}

		try {
			const parsed = JSON.parse(jsonInput);

			switch (outputFormat) {
				case 'xml':
					output = jsonToXml(parsed);
					break;
				case 'csv':
					output = jsonToCsv(parsed);
					break;
				case 'yaml':
					output = jsonToYaml(parsed);
					break;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
		}
	}

	function jsonToXml(obj: unknown, rootName = 'root', indent = 0): string {
		const spaces = '  '.repeat(indent);

		if (obj === null || obj === undefined) {
			return `${spaces}<${rootName}></${rootName}>`;
		}

		if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
			return `${spaces}<${rootName}>${escapeXml(String(obj))}</${rootName}>`;
		}

		if (Array.isArray(obj)) {
			if (obj.length === 0) {
				return `${spaces}<${rootName}></${rootName}>`;
			}
			const itemName = rootName.endsWith('s') ? rootName.slice(0, -1) : 'item';
			const items = obj.map(item => jsonToXml(item, itemName, indent + 1)).join('\n');
			return `${spaces}<${rootName}>\n${items}\n${spaces}</${rootName}>`;
		}

		if (typeof obj === 'object') {
			const entries = Object.entries(obj as Record<string, unknown>);
			if (entries.length === 0) {
				return `${spaces}<${rootName}></${rootName}>`;
			}
			const children = entries.map(([key, value]) => {
				const safeName = key.replace(/[^a-zA-Z0-9_-]/g, '_');
				return jsonToXml(value, safeName, indent + 1);
			}).join('\n');
			return `${spaces}<${rootName}>\n${children}\n${spaces}</${rootName}>`;
		}

		return `${spaces}<${rootName}>${String(obj)}</${rootName}>`;
	}

	function escapeXml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}

	function jsonToCsv(data: unknown): string {
		if (!Array.isArray(data)) {
			if (typeof data === 'object' && data !== null) {
				data = [data];
			} else {
				throw new Error('JSON must be an array or object for CSV conversion');
			}
		}

		const arr = data as Record<string, unknown>[];
		if (arr.length === 0) {
			return '';
		}

		// Get all unique keys
		const headers = new Set<string>();
		arr.forEach(item => {
			if (typeof item === 'object' && item !== null) {
				Object.keys(item).forEach(key => headers.add(key));
			}
		});

		const headerArr = Array.from(headers);
		const headerRow = headerArr.map(h => `"${h}"`).join(',');

		const rows = arr.map(item => {
			if (typeof item !== 'object' || item === null) {
				return headerArr.map(() => '""').join(',');
			}
			return headerArr.map(header => {
				const value = (item as Record<string, unknown>)[header];
				if (value === null || value === undefined) return '""';
				if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
				return `"${String(value).replace(/"/g, '""')}"`;
			}).join(',');
		});

		return [headerRow, ...rows].join('\n');
	}

	function jsonToYaml(obj: unknown, indent = 0): string {
		const spaces = '  '.repeat(indent);

		if (obj === null) return 'null';
		if (obj === undefined) return '~';
		if (typeof obj === 'boolean') return obj ? 'true' : 'false';
		if (typeof obj === 'number') return String(obj);
		if (typeof obj === 'string') {
			if (obj.includes('\n') || obj.includes(':') || obj.includes('#') ||
				obj.startsWith(' ') || obj.endsWith(' ')) {
				return `"${obj.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
			}
			return obj;
		}

		if (Array.isArray(obj)) {
			if (obj.length === 0) return '[]';
			return obj.map((item, i) => {
				const itemYaml = jsonToYaml(item, indent + 1);
				if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
					return `${i === 0 ? '' : spaces}- ${itemYaml.trim().replace(/^\s+/gm, (match) => spaces + '  ' + match.trim() + '\n').trim()}`;
				}
				return `${spaces}- ${itemYaml}`;
			}).join('\n');
		}

		if (typeof obj === 'object') {
			const entries = Object.entries(obj as Record<string, unknown>);
			if (entries.length === 0) return '{}';
			return entries.map(([key, value]) => {
				const valueYaml = jsonToYaml(value, indent + 1);
				if (typeof value === 'object' && value !== null) {
					if (Array.isArray(value) && value.length > 0) {
						return `${spaces}${key}:\n${valueYaml}`;
					}
					if (!Array.isArray(value) && Object.keys(value).length > 0) {
						return `${spaces}${key}:\n${valueYaml}`;
					}
				}
				return `${spaces}${key}: ${valueYaml}`;
			}).join('\n');
		}

		return String(obj);
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(output);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} catch {
			error = 'Failed to copy to clipboard';
		}
	}

	async function copyValuesOutput() {
		if (!valuesOutput) return;
		await navigator.clipboard.writeText(valuesOutput);
		valuesCopySuccess = true;
		setTimeout(() => (valuesCopySuccess = false), 2000);
	}

	function downloadOutput() {
		if (!output) return;

		const extensions = { xml: 'xml', csv: 'csv', yaml: 'yaml' };
		const mimeTypes = {
			xml: 'application/xml',
			csv: 'text/csv',
			yaml: 'application/x-yaml'
		};

		const blob = new Blob([output], { type: mimeTypes[outputFormat] });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `converted.${extensions[outputFormat]}`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function loadSample() {
		jsonInput = JSON.stringify({
			users: [
				{ id: 1, name: "Alice", email: "alice@example.com", active: true },
				{ id: 2, name: "Bob", email: "bob@example.com", active: false },
				{ id: 3, name: "Charlie", email: "charlie@example.com", active: true }
			],
			meta: {
				total: 3,
				page: 1
			}
		}, null, 2);
	}

	function clearAll() {
		jsonInput = '';
		output = '';
		error = null;
	}

	let lineCount = $derived(output.split('\n').length);
</script>

<svelte:head>
	<title>Convert JSON - Freebies JSON Tools</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>JSON Converter</h1>
		<p>Convert JSON to XML, CSV, or YAML — or convert values to quoted JSON</p>
	</div>

	<!-- Mode switcher -->
	<div class="mode-switcher">
		<button
			type="button"
			class="mode-btn"
			class:active={mode === 'json-to-format'}
			onclick={() => mode = 'json-to-format'}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
				<path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
			</svg>
			JSON → Format
		</button>
		<button
			type="button"
			class="mode-btn"
			class:active={mode === 'values-to-json'}
			onclick={() => mode = 'values-to-json'}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M16 3h5v5"/><path d="M8 3H3v5"/>
				<path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>
			</svg>
			Values → JSON
		</button>
	</div>

	{#if mode === 'json-to-format'}
	<div class="convert-layout">
		<div class="input-section card">
			<div class="section-header">
				<h2>Input JSON</h2>
				<div class="header-actions">
					<button class="action-btn" onclick={loadSample}>Load Sample</button>
					<button class="action-btn" onclick={clearAll}>Clear</button>
				</div>
			</div>
			<textarea
				class="json-input"
				bind:value={jsonInput}
				placeholder={`Paste your JSON here...\n\nExample:\n[\n  { "name": "Alice", "age": 30 },\n  { "name": "Bob", "age": 25 }\n]`}
				spellcheck="false"
			></textarea>
		</div>

		<div class="actions-section">
			<div class="action-group card">
				<h3>Output Format</h3>
				<div class="format-options">
					<label class="format-option" class:selected={outputFormat === 'xml'}>
						<input type="radio" name="format" value="xml" bind:group={outputFormat} />
						<span class="format-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
								<polyline points="14 2 14 8 20 8"/>
								<path d="M8 13h2M8 17h2M14 13h2M14 17h2"/>
							</svg>
						</span>
						<span class="format-name">XML</span>
					</label>
					<label class="format-option" class:selected={outputFormat === 'csv'}>
						<input type="radio" name="format" value="csv" bind:group={outputFormat} />
						<span class="format-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
								<polyline points="14 2 14 8 20 8"/>
								<line x1="8" y1="13" x2="16" y2="13"/>
								<line x1="8" y1="17" x2="16" y2="17"/>
							</svg>
						</span>
						<span class="format-name">CSV</span>
					</label>
					<label class="format-option" class:selected={outputFormat === 'yaml'}>
						<input type="radio" name="format" value="yaml" bind:group={outputFormat} />
						<span class="format-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
								<polyline points="14 2 14 8 20 8"/>
								<path d="M10 12l2 2 2-2M10 18l2-2 2 2"/>
							</svg>
						</span>
						<span class="format-name">YAML</span>
					</label>
				</div>
				<button class="btn btn-primary" onclick={convertJson}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 1l4 4-4 4"/>
						<path d="M3 11V9a4 4 0 0 1 4-4h14"/>
						<path d="M7 23l-4-4 4-4"/>
						<path d="M21 13v2a4 4 0 0 1-4 4H3"/>
					</svg>
					Convert
				</button>
			</div>
		</div>

		<div class="output-section card">
			<div class="section-header">
				<h2>Output ({outputFormat.toUpperCase()})</h2>
				<div class="header-actions">
					{#if output}
						<button class="action-btn" onclick={copyToClipboard}>
							{copySuccess ? '✓ Copied!' : 'Copy'}
						</button>
						<button class="action-btn" onclick={downloadOutput}>
							Download
						</button>
					{/if}
				</div>
			</div>
			{#if error}
				<div class="error-banner">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4M12 16h.01" />
					</svg>
					{error}
				</div>
			{/if}
			<div class="output-wrapper">
				<div class="line-numbers">
					{#each Array(Math.max(lineCount, 10)) as _, i}
						<span>{i + 1}</span>
					{/each}
				</div>
				<pre class="output-content">{output || 'Converted output will appear here...'}</pre>
			</div>
		</div>
	</div>
	{:else}
	<!-- Values → JSON mode -->
	<div class="values-layout card">
		<div class="values-input-section">
			<div class="section-header">
				<h2>Input Values</h2>
				<button class="action-btn" onclick={() => { valuesInput = ''; }}>Clear</button>
			</div>
			<textarea
				class="json-input"
				bind:value={valuesInput}
				placeholder="Enter comma-separated or newline-separated values...&#10;&#10;Examples:&#10;value1, value2, value3&#10;&#10;or one per line:&#10;02b42104-b04b-42bf-8edd&#10;15e03349-71de-4959-9caf"
				spellcheck="false"
			></textarea>
		</div>

		<div class="values-options-section">
			<div class="values-format-group">
				<h3>Output Format</h3>
				<label class="format-option" class:selected={valuesOutputFormat === 'array'}>
					<input type="radio" name="values-fmt" value="array" bind:group={valuesOutputFormat} />
					<span class="format-name">JSON Array</span>
					<code class="format-preview">["a", "b"]</code>
				</label>
				<label class="format-option" class:selected={valuesOutputFormat === 'quoted'}>
					<input type="radio" name="values-fmt" value="quoted" bind:group={valuesOutputFormat} />
					<span class="format-name">Quoted values</span>
					<code class="format-preview">"a", "b"</code>
				</label>
			</div>
			{#if valuesOutput}
				<div class="values-stats">
					<span class="stat-chip">
						{valuesOutput.startsWith('[') ? JSON.parse(valuesOutput).length : valuesOutput.split(',').length} values
					</span>
				</div>
			{/if}
		</div>

		<div class="values-output-section">
			<div class="section-header">
				<h2>Output</h2>
				{#if valuesOutput}
					<button class="action-btn" onclick={copyValuesOutput}>
						{valuesCopySuccess ? '✓ Copied!' : 'Copy'}
					</button>
				{/if}
			</div>
			<pre class="values-output">{valuesOutput || 'Output will appear here as you type...'}</pre>
		</div>
	</div>
	{/if}
</div>

<style>
	.page-header {
		margin-bottom: 0.75rem;
	}

	.page-header h1 {
		font-size: 1.5rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-bottom: 0.25rem;
	}

	.page-header p {
		color: var(--color-text-muted);
	}

	.convert-layout {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		height: calc(100vh - 220px);
		min-height: 500px;
	}

	.input-section,
	.output-section {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.json-input {
		flex: 1;
		background: var(--color-bg);
		border: none;
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		padding: 1rem;
		resize: none;
		outline: none;
		line-height: 1.5;
	}

	.json-input::placeholder {
		color: var(--color-text-muted);
	}

	.actions-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 180px;
	}

	.action-group {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-group h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.format-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.format-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.format-option:hover {
		border-color: var(--color-primary);
	}

	.format-option.selected {
		border-color: var(--color-primary);
		background: rgba(139, 92, 246, 0.1);
	}

	.format-option input {
		display: none;
	}

	.format-icon {
		color: var(--color-text-muted);
	}

	.format-option.selected .format-icon {
		color: var(--color-primary);
	}

	.format-name {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.btn {
		font-size: 0.875rem;
		padding: 0.75rem 1rem;
		margin-top: 0.5rem;
	}

	.output-wrapper {
		flex: 1;
		display: flex;
		overflow: auto;
		background: var(--color-bg);
	}

	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: 1rem 0.5rem;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		text-align: right;
		user-select: none;
		min-width: 40px;
	}

	.line-numbers span {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		height: 1.3125rem;
	}

	.output-content {
		flex: 1;
		padding: 1rem;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text);
		white-space: pre;
		overflow: visible;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-removed);
		border-bottom: 1px solid var(--color-removed-border);
		color: var(--color-error);
		font-size: 0.875rem;
	}

	@media (max-width: 1024px) {
		.convert-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.input-section,
		.output-section {
			min-height: 300px;
		}

		.actions-section {
			width: 100%;
		}

		.format-options {
			flex-direction: row;
		}

		.format-option {
			flex: 1;
			justify-content: center;
		}
	}

	/* Mode Switcher */
	.mode-switcher {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.25rem;
		width: fit-content;
	}

	.mode-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mode-btn:hover {
		color: var(--color-text);
		background: var(--color-bg);
	}

	.mode-btn.active {
		background: var(--color-primary);
		color: white;
	}

	/* Values → JSON mode */
	.values-layout {
		display: grid;
		grid-template-columns: 1fr 200px 1fr;
		gap: 0;
		height: calc(100vh - 260px);
		min-height: 400px;
		overflow: hidden;
	}

	.values-input-section,
	.values-output-section {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.values-options-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		border-left: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
	}

	.values-format-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.values-format-group h3 {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.format-preview {
		font-size: 0.7rem;
		padding: 0.1rem 0.35rem;
		background: var(--color-bg);
		border-radius: 4px;
		color: var(--color-text-muted);
		margin-left: auto;
	}

	.values-stats {
		display: flex;
		gap: 0.5rem;
	}

	.stat-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.6rem;
		background: rgba(139, 92, 246, 0.1);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 12px;
		font-size: 0.75rem;
		color: var(--color-primary);
		font-weight: 500;
	}

	.values-output {
		flex: 1;
		margin: 0;
		padding: 1rem;
		background: var(--color-bg);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text);
		white-space: pre-wrap;
		word-break: break-all;
		overflow: auto;
	}

	@media (max-width: 768px) {
		.mode-switcher {
			width: 100%;
		}

		.mode-btn {
			flex: 1;
			justify-content: center;
		}

		.values-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.values-options-section {
			border-left: none;
			border-right: none;
			border-top: 1px solid var(--color-border);
			border-bottom: 1px solid var(--color-border);
		}

		.values-format-group {
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
</style>