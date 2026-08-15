<script lang="ts">
	import { BrandBadge } from '$lib/components';
	import TabBar from '$lib/components/TabBar.svelte';
	import { createTabManager, type Tab } from '$lib/stores/tabManager';

	interface FormatTabState {
		jsonInput: string;
		formattedOutput: string;
		error: string | null;
		indentSize: number;
		copySuccess: boolean;
	}

	const defaultTabState: FormatTabState = {
		jsonInput: '',
		formattedOutput: '',
		error: null,
		indentSize: 2,
		copySuccess: false
	};

	const tabManager = createTabManager(defaultTabState, 'Format 1');
	let tabState = $state<{ tabs: Tab<FormatTabState>[]; activeTabId: string }>({ tabs: [], activeTabId: '' });

	$effect.pre(() => {
		const unsubscribe = tabManager.subscribe((state) => {
			tabState = state;
		});
		return unsubscribe;
	});

	let tabs = $derived(tabState.tabs);
	let activeTabId = $derived(tabState.activeTabId);
	let activeTab = $derived(tabs.find((t) => t.id === activeTabId));

	// Create proxies for reactive state
	let jsonInput = $derived(activeTab?.state.jsonInput ?? '');
	let formattedOutput = $derived(activeTab?.state.formattedOutput ?? '');
	let error = $derived(activeTab?.state.error ?? null);
	let indentSize = $derived(activeTab?.state.indentSize ?? 2);
	let copySuccess = $derived(activeTab?.state.copySuccess ?? false);

	function updateActiveTab(newState: Partial<FormatTabState>) {
		if (!activeTab) return;
		tabManager.updateTabState(activeTab.id, { ...activeTab.state, ...newState });
	}

	function formatJson() {
		updateActiveTab({ error: null });
		try {
			const parsed = JSON.parse(jsonInput);
			updateActiveTab({ formattedOutput: JSON.stringify(parsed, null, indentSize) });
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Invalid JSON';
			updateActiveTab({ error: errorMsg, formattedOutput: '' });
		}
	}

	function minifyJson() {
		updateActiveTab({ error: null });
		try {
			const parsed = JSON.parse(jsonInput);
			updateActiveTab({ formattedOutput: JSON.stringify(parsed) });
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Invalid JSON';
			updateActiveTab({ error: errorMsg, formattedOutput: '' });
		}
	}

	function sortKeys() {
		updateActiveTab({ error: null });
		try {
			const parsed = JSON.parse(jsonInput);
			const sorted = sortObjectKeys(parsed);
			updateActiveTab({ formattedOutput: JSON.stringify(sorted, null, indentSize) });
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Invalid JSON';
			updateActiveTab({ error: errorMsg, formattedOutput: '' });
		}
	}

	function sortObjectKeys(obj: unknown): unknown {
		if (Array.isArray(obj)) {
			return obj.map(sortObjectKeys);
		} else if (obj !== null && typeof obj === 'object') {
			const sorted: Record<string, unknown> = {};
			Object.keys(obj as Record<string, unknown>)
				.sort()
				.forEach((key) => {
					sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
				});
			return sorted;
		}
		return obj;
	}

	function escapeJson() {
		updateActiveTab({ error: null });
		try {
			const escaped = JSON.stringify(jsonInput);
			updateActiveTab({ formattedOutput: escaped });
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Error escaping JSON';
			updateActiveTab({ error: errorMsg, formattedOutput: '' });
		}
	}

	function unescapeJson() {
		updateActiveTab({ error: null });
		try {
			const unescaped = JSON.parse(jsonInput);
			if (typeof unescaped === 'string') {
				updateActiveTab({ formattedOutput: unescaped });
			} else {
				updateActiveTab({ formattedOutput: JSON.stringify(unescaped, null, indentSize) });
			}
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Invalid escaped JSON';
			updateActiveTab({ error: errorMsg, formattedOutput: '' });
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(formattedOutput);
			updateActiveTab({ copySuccess: true });
			setTimeout(() => updateActiveTab({ copySuccess: false }), 2000);
		} catch {
			updateActiveTab({ error: 'Failed to copy to clipboard' });
		}
	}

	function clearAll() {
		updateActiveTab({ jsonInput: '', formattedOutput: '', error: null });
	}

	function loadSample() {
		const sampleJson = JSON.stringify(
			{
				name: 'Freebies JSON Tools',
				version: '1.0.0',
				features: ['format', 'view', 'compare'],
				config: {
					theme: 'dark',
					indentSize: 2,
					sortKeys: false
				},
				users: [
					{ id: 1, name: 'Alice', active: true },
					{ id: 2, name: 'Bob', active: false }
				]
			},
			null,
			2
		);
		updateActiveTab({ jsonInput: sampleJson });
	}

	function handleInputChange(newValue: string) {
		updateActiveTab({ jsonInput: newValue });
	}

	function handleOutputChange(newValue: string) {
		updateActiveTab({ formattedOutput: newValue });
	}

	function handleIndentChange(newValue: number) {
		updateActiveTab({ indentSize: newValue });
	}

	function handleAddTab() {
		tabManager.addTab(defaultTabState, `Format ${tabs.length + 1}`);
	}

	function handleSelectTab(id: string) {
		tabManager.setActiveTab(id);
	}

	function handleRemoveTab(id: string) {
		tabManager.removeTab(id);
	}

	function handleRenameTab(id: string, newName: string) {
		tabManager.renameTab(id, newName);
	}

	let lineCount = $derived(formattedOutput?.split('\n').length ?? 1);
</script>

<svelte:head>
	<title>Format JSON - Freebies JSON Tools</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<BrandBadge />
		<div class="page-header-copy">
			<h1>JSON Formatter</h1>
			<p>Beautify, minify, sort and transform your JSON data</p>
		</div>
	</div>

	{#if tabs && tabs.length > 0}
		<TabBar
			{tabs}
			activeTabId={activeTabId || ''}
			onSelectTab={handleSelectTab}
			onAddTab={handleAddTab}
			onRemoveTab={handleRemoveTab}
			onRenameTab={handleRenameTab}
		/>
	{/if}

	<div class="format-layout">
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
				value={jsonInput}
				onchange={(e) => handleInputChange(e.currentTarget.value)}
				oninput={(e) => handleInputChange(e.currentTarget.value)}
				placeholder={`Paste your JSON here...\n\nExample:\n{\n  "key": "value"\n}`}
				spellcheck="false"
			></textarea>
		</div>

		<div class="actions-section">
			<div class="action-group card">
				<h3>Format Options</h3>
				<div class="indent-control">
					<label for="indent">Indent Size:</label>
					<select
						id="indent"
						value={indentSize}
						onchange={(e) => handleIndentChange(Number(e.currentTarget.value))}
					>
						<option value={2}>2 spaces</option>
						<option value={4}>4 spaces</option>
						<option value={1}>1 space</option>
					</select>
				</div>
				<button class="btn btn-primary" onclick={formatJson}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 6h16M4 12h16M4 18h12" />
					</svg>
					Format / Beautify
				</button>
				<button class="btn btn-secondary" onclick={minifyJson}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 12h16" />
					</svg>
					Minify
				</button>
				<button class="btn btn-secondary" onclick={sortKeys}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 6h18M6 12h12M9 18h6" />
					</svg>
					Sort Keys
				</button>
			</div>

			<div class="action-group card">
				<h3>String Operations</h3>
				<button class="btn btn-secondary" onclick={escapeJson}>
					Escape JSON
				</button>
				<button class="btn btn-secondary" onclick={unescapeJson}>
					Unescape JSON
				</button>
			</div>
		</div>

		<div class="output-section card">
			<div class="section-header">
				<h2>Output</h2>
				<div class="header-actions">
					{#if formattedOutput}
						<button class="action-btn" onclick={copyToClipboard}>
							{copySuccess ? '✓ Copied!' : 'Copy'}
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
				<pre class="json-output">{formattedOutput || 'Formatted JSON will appear here...'}</pre>
			</div>
		</div>
	</div>
</div>

<style>
	.page-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
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

	.format-layout {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		height: calc(100vh - 280px);
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
		width: 200px;
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
		margin-bottom: 0.25rem;
	}

	.indent-control {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.indent-control label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.indent-control select {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 0.5rem;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.btn {
		font-size: 0.875rem;
		padding: 0.625rem 1rem;
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

	.json-output {
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
		.format-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.input-section,
		.output-section {
			min-height: 300px;
		}

		.actions-section {
			width: 100%;
			flex-direction: row;
			flex-wrap: wrap;
		}

		.action-group {
			flex: 1;
			min-width: 200px;
		}
	}
</style>
