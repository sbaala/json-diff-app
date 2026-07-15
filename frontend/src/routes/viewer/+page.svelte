<script lang="ts">
	import JsonTreeNode from '$lib/components/JsonTreeNode.svelte';

	let jsonInput = $state('');
	let parsedData = $state<unknown>(null);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let expandAll = $state(false);
	let viewMode = $state<'tree' | 'raw'>('tree');
	let stats = $state<{ keys: number; depth: number; size: string } | null>(null);

	function parseJson() {
		error = null;
		parsedData = null;
		stats = null;

		if (!jsonInput.trim()) {
			return;
		}

		try {
			const parsed = JSON.parse(jsonInput);
			parsedData = parsed;
			stats = calculateStats(parsed);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
		}
	}

	function calculateStats(data: unknown): { keys: number; depth: number; size: string } {
		let keyCount = 0;
		let maxDepth = 0;

		function traverse(obj: unknown, depth: number) {
			if (depth > maxDepth) maxDepth = depth;

			if (Array.isArray(obj)) {
				obj.forEach((item) => traverse(item, depth + 1));
			} else if (obj !== null && typeof obj === 'object') {
				const keys = Object.keys(obj);
				keyCount += keys.length;
				keys.forEach((key) => traverse((obj as Record<string, unknown>)[key], depth + 1));
			}
		}

		traverse(data, 0);

		const size = new Blob([jsonInput]).size;
		const sizeStr = size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

		return { keys: keyCount, depth: maxDepth, size: sizeStr };
	}

	function clearAll() {
		jsonInput = '';
		parsedData = null;
		error = null;
		stats = null;
		searchTerm = '';
	}

	function loadSample() {
		jsonInput = JSON.stringify(
			{
				company: 'Freebies Inc.',
				founded: 2024,
				active: true,
				headquarters: {
					city: 'San Francisco',
					country: 'USA',
					coordinates: {
						lat: 37.7749,
						lng: -122.4194
					}
				},
				products: [
					{
						id: 'json-tools',
						name: 'JSON Tools',
						features: ['format', 'view', 'compare'],
						pricing: {
							free: true,
							premium: null
						}
					},
					{
						id: 'api-builder',
						name: 'API Builder',
						features: ['rest', 'graphql'],
						pricing: {
							free: false,
							premium: 29.99
						}
					}
				],
				team: [
					{ name: 'Alice', role: 'CEO', email: 'alice@freebies.io' },
					{ name: 'Bob', role: 'CTO', email: 'bob@freebies.io' },
					{ name: 'Charlie', role: 'Design Lead', email: 'charlie@freebies.io' }
				],
				metadata: {
					lastUpdated: '2026-03-04T10:30:00Z',
					version: '2.0.0'
				}
			},
			null,
			2
		);
		parseJson();
	}

	function handlePaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text');
		if (text) {
			// Auto-parse after paste
			setTimeout(parseJson, 0);
		}
	}

	function toggleExpandAll() {
		expandAll = !expandAll;
	}

	async function downloadJson() {
		if (!parsedData) return;
		const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'data.json';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>JSON Viewer - Freebies JSON Tools</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>JSON Viewer</h1>
		<p>Explore and navigate JSON data with an interactive tree view</p>
	</div>

	<div class="viewer-layout">
		<div class="input-panel card">
			<div class="panel-header">
				<h2>Input JSON</h2>
				<div class="header-actions">
					<button class="action-btn" onclick={loadSample}>Load Sample</button>
					<button class="action-btn" onclick={clearAll}>Clear</button>
				</div>
			</div>
			<textarea
				class="json-input"
				bind:value={jsonInput}
				onpaste={handlePaste}
				placeholder={`Paste or type your JSON here...\n\nClick "Load Sample" to see an example.`}
				spellcheck="false"
			></textarea>
			<div class="input-footer">
				<button class="btn btn-primary" onclick={parseJson}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
					View JSON
				</button>
			</div>
		</div>

		<div class="viewer-panel card">
			<div class="panel-header">
				<h2>Tree View</h2>
				<div class="header-actions">
					{#if parsedData}
						<div class="search-box">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="11" cy="11" r="8" />
								<path d="M21 21l-4.35-4.35" />
							</svg>
							<input
								type="text"
								bind:value={searchTerm}
								placeholder="Search keys/values..."
							/>
						</div>
						<div class="view-toggle">
							<button
								class="toggle-btn"
								class:active={viewMode === 'tree'}
								onclick={() => (viewMode = 'tree')}
							>
								Tree
							</button>
							<button
								class="toggle-btn"
								class:active={viewMode === 'raw'}
								onclick={() => (viewMode = 'raw')}
							>
								Raw
							</button>
						</div>
						<button class="action-btn" onclick={toggleExpandAll}>
							{expandAll ? 'Collapse All' : 'Expand All'}
						</button>
						<button class="action-btn" onclick={downloadJson}>
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
					<div>
						<strong>Parse Error</strong>
						<p>{error}</p>
					</div>
				</div>
			{:else if parsedData}
				{#if stats}
					<div class="stats-bar">
						<div class="stat">
							<span class="stat-label">Keys</span>
							<span class="stat-value">{stats.keys}</span>
						</div>
						<div class="stat">
							<span class="stat-label">Depth</span>
							<span class="stat-value">{stats.depth}</span>
						</div>
						<div class="stat">
							<span class="stat-label">Size</span>
							<span class="stat-value">{stats.size}</span>
						</div>
					</div>
				{/if}

				<div class="tree-container">
					{#if viewMode === 'tree'}
						{#key expandAll}
							<JsonTreeNode data={parsedData} {searchTerm} {expandAll} />
						{/key}
					{:else}
						<pre class="raw-view">{JSON.stringify(parsedData, null, 2)}</pre>
					{/if}
				</div>
			{:else}
				<div class="empty-state">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="16" y1="13" x2="8" y2="13" />
						<line x1="16" y1="17" x2="8" y2="17" />
						<polyline points="10 9 9 9 8 9" />
					</svg>
					<h3>No JSON Data</h3>
					<p>Paste or enter JSON in the input panel and click "View JSON"</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		font-size: 2rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-bottom: 0.5rem;
	}

	.page-header p {
		color: var(--color-text-muted);
	}

	.viewer-layout {
		display: grid;
		grid-template-columns: 400px 1fr;
		gap: 1rem;
		height: calc(100vh - 220px);
		min-height: 500px;
	}

	.input-panel,
	.viewer-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.panel-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
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

	.search-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.375rem 0.75rem;
	}

	.search-box svg {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.search-box input {
		background: none;
		border: none;
		color: var(--color-text);
		font-size: 0.75rem;
		outline: none;
		width: 150px;
	}

	.search-box input::placeholder {
		color: var(--color-text-muted);
	}

	.view-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
	}

	.view-toggle .toggle-btn {
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.view-toggle .toggle-btn:hover {
		color: var(--color-text);
	}

	.view-toggle .toggle-btn.active {
		background: var(--color-primary);
		color: white;
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

	.input-footer {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.input-footer .btn {
		width: 100%;
	}

	.error-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-removed);
		border-bottom: 1px solid var(--color-removed-border);
		color: var(--color-text);
	}

	.error-banner svg {
		color: var(--color-error);
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.error-banner strong {
		color: var(--color-error);
	}

	.error-banner p {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.stats-bar {
		display: flex;
		gap: 1.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}

	.stat-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	.tree-container {
		flex: 1;
		overflow: auto;
		padding: 1rem;
	}

	.raw-view {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text);
		white-space: pre;
		margin: 0;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		text-align: center;
		padding: 2rem;
	}

	.empty-state svg {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		font-size: 1.125rem;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		font-size: 0.875rem;
	}

	@media (max-width: 900px) {
		.viewer-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.input-panel {
			min-height: 250px;
		}

		.viewer-panel {
			min-height: 400px;
		}
	}
</style>
