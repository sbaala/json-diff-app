<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'form-data-generator',
		name: 'Form Data Generator',
		description: 'Generate form data and multipart payloads',
		category: 'api-dev',
		icon: 'form',
		keywords: ['form', 'data', 'multipart', 'generate']
	};

	interface FormField {
		id: string;
		name: string;
		value: string;
		type: 'text' | 'number' | 'boolean' | 'array';
	}

	let fields: FormField[] = $state([
		{ id: '1', name: 'username', value: 'john_doe', type: 'text' },
		{ id: '2', name: 'email', value: 'john@example.com', type: 'text' }
	]);

	let output = $state('');
	let format = $state<'form-urlencoded' | 'multipart' | 'json'>('json');
	let boundary = $state('----WebKitFormBoundary7MA4YWxkTrZu0gW');

	function generateOutput() {
		if (fields.length === 0) {
			output = '';
			return;
		}

		if (format === 'json') {
			const json: Record<string, any> = {};
			for (const field of fields) {
				if (field.type === 'boolean') {
					json[field.name] = field.value.toLowerCase() === 'true';
				} else if (field.type === 'number') {
					json[field.name] = parseFloat(field.value) || 0;
				} else if (field.type === 'array') {
					json[field.name] = field.value.split(',').map((v) => v.trim());
				} else {
					json[field.name] = field.value;
				}
			}
			output = JSON.stringify(json, null, 2);
		} else if (format === 'form-urlencoded') {
			const params = fields.map(
				(f) => `${encodeURIComponent(f.name)}=${encodeURIComponent(f.value)}`
			);
			output = params.join('&');
		} else if (format === 'multipart') {
			let multipart = '';
			for (const field of fields) {
				multipart += `--${boundary}\r\n`;
				multipart += `Content-Disposition: form-data; name="${field.name}"\r\n\r\n`;
				multipart += `${field.value}\r\n`;
			}
			multipart += `--${boundary}--\r\n`;
			output = multipart;
		}
	}

	function addField() {
		const newId = Math.random().toString(36).substr(2, 9);
		fields.push({ id: newId, name: `field_${fields.length + 1}`, value: '', type: 'text' });
		fields = fields;
		generateOutput();
	}

	function removeField(id: string) {
		fields = fields.filter((f) => f.id !== id);
		generateOutput();
	}

	function updateField(id: string, key: keyof FormField, value: any) {
		const field = fields.find((f) => f.id === id);
		if (field) {
			field[key] = value;
			generateOutput();
		}
	}

	function handleFormatChange(e: Event) {
		format = (e.target as HTMLSelectElement).value as typeof format;
		generateOutput();
	}

	function handleBoundaryChange(e: Event) {
		boundary = (e.target as HTMLInputElement).value;
		generateOutput();
	}

	function copyOutput() {
		navigator.clipboard.writeText(output);
	}

	function addSampleFields() {
		fields = [
			{ id: '1', name: 'username', value: 'john_doe', type: 'text' },
			{ id: '2', name: 'email', value: 'john@example.com', type: 'text' },
			{ id: '3', name: 'age', value: '30', type: 'number' },
			{ id: '4', name: 'active', value: 'true', type: 'boolean' },
			{ id: '5', name: 'tags', value: 'developer, tech, api', type: 'array' }
		];
		generateOutput();
	}
</script>

<div class="tool-wrapper">
	<div class="config-section">
		<label for="format">Format:</label>
		<select id="format" value={format} onchange={handleFormatChange}>
			<option value="json">JSON</option>
			<option value="form-urlencoded">Form URL Encoded</option>
			<option value="multipart">Multipart Form Data</option>
		</select>

		{#if format === 'multipart'}
			<label for="boundary">Boundary:</label>
			<input
				id="boundary"
				type="text"
				bind:value={boundary}
				onchange={handleBoundaryChange}
				class="input-field"
			/>
		{/if}
	</div>

	<div class="fields-section">
		<div class="section-title">Form Fields</div>
		<div class="fields-list">
			{#each fields as field}
				<div class="field-row">
					<input
						type="text"
						placeholder="Field name"
						value={field.name}
						onchange={(e) => updateField(field.id, 'name', e.currentTarget.value)}
						class="field-input"
					/>
					<select
						value={field.type}
						onchange={(e) => updateField(field.id, 'type', e.currentTarget.value)}
						class="field-type"
					>
						<option value="text">Text</option>
						<option value="number">Number</option>
						<option value="boolean">Boolean</option>
						<option value="array">Array</option>
					</select>
					<input
						type="text"
						placeholder="Value"
						value={field.value}
						onchange={(e) => updateField(field.id, 'value', e.currentTarget.value)}
						class="field-input flex-grow"
					/>
					<button class="delete-btn" onclick={() => removeField(field.id)}>🗑️</button>
				</div>
			{/each}
		</div>

		<button class="add-btn" onclick={addField}>+ Add Field</button>
		<button class="sample-btn" onclick={addSampleFields}>📋 Sample</button>
	</div>

	{#if output}
		<div class="output-section">
			<div class="section-title">Output</div>
			<textarea class="code-textarea" readonly value={output}></textarea>
			<button class="copy-btn" onclick={copyOutput}>📋 Copy</button>
		</div>
	{/if}
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}

	.config-section {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-radius: 6px;
		align-items: center;
		flex-wrap: wrap;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select,
	.input-field {
		flex: 1;
		min-width: 150px;
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	select:focus,
	.input-field:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.section-title {
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.fields-section {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.fields-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		flex: 1;
	}

	.field-row {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.field-input {
		flex: 1;
		padding: 8px 12px;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.field-input.flex-grow {
		flex: 2;
	}

	.field-type {
		padding: 8px 12px;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.85rem;
		min-width: 100px;
	}

	.field-type:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.delete-btn {
		background: transparent;
		color: var(--color-removed-border);
		border: none;
		cursor: pointer;
		font-size: 1rem;
		padding: 4px;
		border-radius: 4px;
		transition: background 0.2s ease;
	}

	.delete-btn:hover {
		background: rgba(251, 113, 133, 0.1);
	}

	.add-btn,
	.sample-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-btn:hover,
	.sample-btn:hover {
		background: var(--color-primary);
		color: white;
	}

	.sample-btn {
		align-self: flex-start;
	}

	.output-section {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		flex: 1;
		min-height: 0;
	}

	.code-textarea {
		flex: 1;
		font-family: monospace;
		font-size: 0.8rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
		resize: none;
	}

	.code-textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.copy-btn {
		background: var(--color-primary);
		color: white;
		border: 1px solid var(--color-primary);
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-btn:hover {
		opacity: 0.9;
	}
</style>
