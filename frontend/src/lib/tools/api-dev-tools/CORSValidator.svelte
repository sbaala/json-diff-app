<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'cors-validator',
		name: 'CORS Validator',
		description: 'Validate CORS headers and configuration',
		category: 'api-dev',
		icon: 'shield-check',
		keywords: ['cors', 'validate', 'headers', 'origin']
	};

	let originUrl = $state('https://example.com');
	let serverUrl = $state('https://api.example.com');
	let method = $state<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
	let customHeaders = $state('Content-Type');
	let results = $state<any>(null);
	let error: string | null = $state(null);

	function validateCORS() {
		try {
			if (!originUrl || !serverUrl) {
				error = 'Origin URL and Server URL are required';
				results = null;
				return;
			}

			const originHost = new URL(originUrl).host;
			const serverHost = new URL(serverUrl).host;
			const sameOrigin = originHost === serverHost;

			const headers = customHeaders
				.split(',')
				.map((h) => h.trim())
				.filter((h) => h);

			results = {
				sameOrigin,
				requiresCORS: !sameOrigin,
				originUrl,
				serverUrl,
				method,
				customHeaders: headers,
				checks: {
					checkOriginHeader: !sameOrigin,
					checkMethodAllowed: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method),
					checkHeadersAllowed: headers.length > 0,
					requiresCredentials: false
				},
				recommendations: getRecommendations(sameOrigin, method, headers)
			};

			error = null;
		} catch (e) {
			error = (e as Error).message;
			results = null;
		}
	}

	function getRecommendations(sameOrigin: boolean, method: string, headers: string[]): string[] {
		const recs: string[] = [];

		if (sameOrigin) {
			recs.push('✓ Same origin - no CORS headers needed');
		} else {
			recs.push('⚠ Cross-origin request - CORS headers required');
			recs.push(`✓ Add "Access-Control-Allow-Origin: ${originUrl}" header`);
			recs.push(`✓ Add "Access-Control-Allow-Methods: ${method}" header`);
			if (headers.length > 0) {
				recs.push(`✓ Add "Access-Control-Allow-Headers: ${headers.join(', ')}" header`);
			}
			recs.push('✓ Add "Access-Control-Max-Age: 86400" header (optional)');
		}

		return recs;
	}

	function handleValidate() {
		validateCORS();
	}

	function handleClear() {
		originUrl = 'https://example.com';
		serverUrl = 'https://api.example.com';
		method = 'GET';
		customHeaders = 'Content-Type';
		results = null;
		error = null;
	}
</script>

<div class="tool-wrapper">
	<div class="config-section">
		<div class="input-group">
			<label for="origin">Origin URL:</label>
			<input
				id="origin"
				type="url"
				bind:value={originUrl}
				placeholder="https://example.com"
				class="input-field"
			/>
		</div>

		<div class="input-group">
			<label for="server">Server URL:</label>
			<input
				id="server"
				type="url"
				bind:value={serverUrl}
				placeholder="https://api.example.com"
				class="input-field"
			/>
		</div>

		<div class="input-group">
			<label for="method">Method:</label>
			<select id="method" bind:value={method} class="input-field">
				<option value="GET">GET</option>
				<option value="POST">POST</option>
				<option value="PUT">PUT</option>
				<option value="DELETE">DELETE</option>
				<option value="PATCH">PATCH</option>
			</select>
		</div>

		<div class="input-group">
			<label for="headers">Custom Headers (comma-separated):</label>
			<input
				id="headers"
				type="text"
				bind:value={customHeaders}
				placeholder="Content-Type, Authorization"
				class="input-field"
			/>
		</div>
	</div>

	{#if error}
		<div class="error-box">
			<div class="error-icon">⚠️</div>
			<div class="error-message">{error}</div>
		</div>
	{:else if results}
		<div class="results-section">
			<div class="result-status {results.sameOrigin ? 'success' : 'warning'}">
				{#if results.sameOrigin}
					<div class="status-icon">✓</div>
					<div class="status-text">Same Origin Request</div>
				{:else}
					<div class="status-icon">⚠</div>
					<div class="status-text">Cross-Origin Request Detected</div>
				{/if}
			</div>

			<div class="details-section">
				<div class="detail-title">Request Details</div>
				<div class="detail-grid">
					<div class="detail-item">
						<div class="detail-label">Origin</div>
						<div class="detail-value">{results.originUrl}</div>
					</div>
					<div class="detail-item">
						<div class="detail-label">Server</div>
						<div class="detail-value">{results.serverUrl}</div>
					</div>
					<div class="detail-item">
						<div class="detail-label">Method</div>
						<div class="detail-value">{results.method}</div>
					</div>
					<div class="detail-item">
						<div class="detail-label">Headers</div>
						<div class="detail-value">{results.customHeaders.join(', ') || 'None'}</div>
					</div>
				</div>
			</div>

			<div class="recommendations-section">
				<div class="detail-title">Recommendations</div>
				<ul class="recommendations-list">
					{#each results.recommendations as rec}
						<li>{rec}</li>
					{/each}
				</ul>
			</div>

			{#if results.requiresCredentials}
				<div class="note-box">
					<div class="note-title">📝 Note</div>
					<div class="note-text"
						>If credentials are needed, add "Access-Control-Allow-Credentials: true"</div
					>
				</div>
			{/if}
		</div>
	{/if}

	<div class="tool-footer">
		<button class="action-btn primary" onclick={handleValidate}>🔍 Validate</button>
		<button class="action-btn" onclick={handleClear}>🗑️ Clear</button>
	</div>
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
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-radius: 6px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.input-field {
		padding: 10px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-primary);
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

	.results-section {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.result-status {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		border-radius: 6px;
	}

	.result-status.success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.result-status.warning {
		background: rgba(249, 115, 22, 0.1);
		border: 1px solid rgba(249, 115, 22, 0.3);
		color: #f97316;
	}

	.status-icon {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.status-text {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.details-section,
	.recommendations-section {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: var(--spacing-md);
	}

	.detail-title {
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-md);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.detail-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-primary);
	}

	.detail-value {
		font-size: 0.875rem;
		font-family: monospace;
		color: var(--color-text-muted);
		word-break: break-all;
	}

	.recommendations-list {
		margin: 0;
		padding-left: var(--spacing-md);
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.recommendations-list li {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	.note-box {
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.3);
		border-radius: 6px;
		padding: var(--spacing-md);
	}

	.note-title {
		font-weight: 600;
		color: var(--color-primary);
		margin-bottom: var(--spacing-xs);
	}

	.note-text {
		font-size: 0.875rem;
		color: var(--color-text-muted);
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

	.action-btn.primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.action-btn.primary:hover {
		opacity: 0.9;
	}
</style>
