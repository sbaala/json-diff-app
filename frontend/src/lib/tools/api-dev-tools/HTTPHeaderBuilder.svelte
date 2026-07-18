<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'http-header-builder',
		name: 'HTTP Header Builder',
		description: 'Build and generate HTTP headers',
		category: 'api-dev',
		icon: 'layers',
		keywords: ['header', 'http', 'request', 'builder']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let headers: Array<{ key: string; value: string }> = $state([]);

	const commonHeaders = [
		{ key: 'Content-Type', value: 'application/json' },
		{ key: 'Accept', value: 'application/json' },
		{ key: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
		{ key: 'Authorization', value: 'Bearer your-token-here' },
		{ key: 'X-API-Key', value: 'your-api-key-here' },
		{ key: 'Accept-Encoding', value: 'gzip, deflate' },
		{ key: 'Cache-Control', value: 'no-cache' },
		{ key: 'Pragma', value: 'no-cache' },
		{ key: 'Referer', value: 'https://example.com' }
	];

	function updateOutput() {
		if (headers.length === 0) {
			output = '';
			return;
		}

		// Generate as cURL format
		let curl = 'curl -X GET \\\n';
		for (const header of headers) {
			curl += `  -H "${header.key}: ${header.value}" \\\n`;
		}
		curl += '  "https://api.example.com/endpoint"';

		output = curl;
		error = null;
	}

	function addHeader(key: string, value: string) {
		if (!key || !value) {
			error = 'Key and value required';
			return;
		}
		headers.push({ key, value });
		headers = headers;
		updateOutput();
	}

	function removeHeader(index: number) {
		headers.splice(index, 1);
		headers = headers;
		updateOutput();
	}

	function addCommonHeader(header: (typeof commonHeaders)[0]) {
		addHeader(header.key, header.value);
	}

	function handleClear() {
		headers = [];
		output = '';
		error = null;
		input = '';
	}

	function handleSample() {
		headers = [
			{ key: 'Content-Type', value: 'application/json' },
			{ key: 'Authorization', value: 'Bearer token123' },
			{ key: 'Accept', value: 'application/json' }
		];
		updateOutput();
	}

	function copyHeaders() {
		navigator.clipboard.writeText(output);
	}
</script>

<div class="tool-wrapper">
	<div class="builder-section">
		<div class="section-title">Common Headers</div>
		<div class="common-headers-grid">
			{#each commonHeaders as header}
				<button class="header-btn" onclick={() => addCommonHeader(header)}>
					+ {header.key}
				</button>
			{/each}
		</div>
	</div>

	<div class="headers-list">
		<div class="section-title">Added Headers</div>
		{#if headers.length === 0}
			<div class="empty-message">No headers added yet. Click common headers above or add custom ones.</div>
		{:else}
			<div class="headers-grid">
				{#each headers as header, i}
					<div class="header-item">
						<div class="header-key">{header.key}</div>
						<div class="header-value">{header.value}</div>
						<button class="delete-btn" onclick={() => removeHeader(i)}>🗑️</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if output}
		<div class="output-section">
			<div class="section-title">cURL Format</div>
			<textarea class="code-textarea" readonly value={output}></textarea>
			<button class="copy-btn" onclick={copyHeaders}>📋 Copy</button>
		</div>
	{/if}

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{/if}

	<div class="tool-footer">
		<button class="action-btn" onclick={handleSample}>📋 Sample</button>
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		overflow-y: auto;
		padding: var(--spacing-md);
	}

	.section-title {
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.builder-section {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
	}

	.common-headers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: var(--spacing-sm);
	}

	.header-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 8px 12px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.header-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.headers-list {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.empty-message {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--spacing-lg);
	}

	.headers-grid {
		display: grid;
		gap: var(--spacing-sm);
	}

	.header-item {
		display: grid;
		grid-template-columns: 1fr 2fr auto;
		gap: var(--spacing-sm);
		align-items: center;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: var(--spacing-sm);
	}

	.header-key {
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--color-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.header-value {
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	.output-section {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.code-textarea {
		flex: 1;
		min-height: 150px;
		font-family: monospace;
		font-size: 0.75rem;
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

	.error-box {
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border: 1px solid var(--color-removed-border);
		border-radius: 4px;
		color: var(--color-removed-border);
		display: flex;
		gap: var(--spacing-sm);
	}

	.error-icon {
		font-size: 1.25rem;
	}

	.error-message {
		font-size: 0.875rem;
	}

	.tool-footer {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: flex-end;
	}

	.action-btn {
		background: var(--color-secondary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
</style>
