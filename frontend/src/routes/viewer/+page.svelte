<script lang="ts" module>
	import { createTabManager } from '$lib/stores/tabManager';
	import type { InspectMode } from '$lib/components/JsonNodeInspector.svelte';

	interface ViewerTabState {
		jsonInput: string;
		parsedData: unknown;
		error: string | null;
		searchTerm: string;
		expandAll: boolean;
		viewMode: 'tree' | 'raw' | 'split';
		stats: { keys: number; depth: number; size: string } | null;
		/** Child shown on its own in the inspector; null = full tree */
		inspectPath: string[] | null;
		inspectMode: InspectMode;
	}

	const defaultTabState: ViewerTabState = {
		jsonInput: '',
		parsedData: null,
		error: null,
		searchTerm: '',
		expandAll: false,
		viewMode: 'tree',
		stats: null,
		inspectPath: null,
		inspectMode: 'grid'
	};

	// Module scope: tabs survive in-app navigation (e.g. to Compare and back)
	const tabManager = createTabManager(defaultTabState, 'Viewer 1');
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { BrandBadge } from '$lib/components';
	import TabBar from '$lib/components/TabBar.svelte';
	import JsonTreeView from '$lib/components/JsonTreeView.svelte';
	import JsonNodeInspector from '$lib/components/JsonNodeInspector.svelte';
	import TreeGridSplitView from '$lib/components/TreeGridSplitView.svelte';
	import { setCompareHandoff } from '$lib/stores/compareHandoff';
	import { splitJsonDocuments } from '$lib/utils/splitJson';

	let tabState = $state<{ tabs: any[]; activeTabId: string }>({ tabs: [], activeTabId: '' });

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
	let parsedData = $derived(activeTab?.state.parsedData ?? null);
	let error = $derived(activeTab?.state.error ?? null);
	let searchTerm = $derived(activeTab?.state.searchTerm ?? '');
	let expandAll = $derived(activeTab?.state.expandAll ?? false);
	let viewMode = $derived(activeTab?.state.viewMode ?? 'tree' as const);
	let stats = $derived(activeTab?.state.stats ?? null);
	let inspectPath = $derived<string[] | null>(activeTab?.state.inspectPath ?? null);
	let inspectMode = $derived<InspectMode>(activeTab?.state.inspectMode ?? 'grid');
	let inspecting = $derived(!!parsedData && inspectPath !== null);

	function updateActiveTab(newState: Partial<ViewerTabState>) {
		if (!activeTab) return;
		tabManager.updateTabState(activeTab.id, { ...activeTab.state, ...newState });
	}

	function parseJson() {
		updateActiveTab({ error: null, parsedData: null, stats: null, inspectPath: null });

		if (!jsonInput.trim()) {
			return;
		}

		try {
			const parsed = JSON.parse(jsonInput);
			const calculatedStats = calculateStats(parsed);
			updateActiveTab({ parsedData: parsed, stats: calculatedStats });
		} catch (e) {
			if (openDocumentsInTabs(jsonInput)) return;
			const errorMsg = e instanceof Error ? e.message : 'Invalid JSON';
			updateActiveTab({ error: errorMsg });
		}
	}

	// Several JSON documents in one input: keep the first here, open the rest in new tabs
	function openDocumentsInTabs(input: string): boolean {
		const docs = splitJsonDocuments(input);
		if (!docs || !activeTab) return false;

		const currentId = activeTab.id;
		const tabCount = tabs.length;
		const [first, ...rest] = docs.map((doc) => ({
			...defaultTabState,
			jsonInput: doc.text,
			parsedData: doc.value,
			stats: calculateStats(doc.value, doc.text)
		}));
		updateActiveTab(first);
		rest.forEach((state, i) => tabManager.addTab(state, `Viewer ${tabCount + i + 1}`));
		tabManager.setActiveTab(currentId);
		return true;
	}

	function calculateStats(
		data: unknown,
		text: string = jsonInput
	): { keys: number; depth: number; size: string } {
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

		const size = new Blob([text]).size;
		const sizeStr = size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

		return { keys: keyCount, depth: maxDepth, size: sizeStr };
	}

	function clearAll() {
		updateActiveTab({
			jsonInput: '',
			parsedData: null,
			error: null,
			stats: null,
			searchTerm: '',
			inspectPath: null
		});
	}

	function loadSample() {
		const sampleJson = JSON.stringify(
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
		updateActiveTab({ jsonInput: sampleJson });
		// Parse after updating state
		setTimeout(() => {
			const parsed = JSON.parse(sampleJson);
			const calculatedStats = calculateStats(parsed);
			updateActiveTab({ parsedData: parsed, stats: calculatedStats });
		}, 0);
	}

	function handlePaste() {
		// Native paste inserts the text and fires `oninput` (which updates state);
		// setting state here too would insert the text twice. Just auto-parse after.
		setTimeout(parseJson, 0);
	}

	function toggleExpandAll() {
		updateActiveTab({ expandAll: !expandAll });
	}

	function handleInputChange(newValue: string) {
		updateActiveTab({ jsonInput: newValue });
	}

	function handleSearchChange(newValue: string) {
		updateActiveTab({ searchTerm: newValue });
	}

	function handleViewModeChange(newMode: 'tree' | 'raw' | 'split') {
		updateActiveTab({ viewMode: newMode });
	}

	function openInspector(path: string[]) {
		updateActiveTab({ inspectPath: path });
	}

	function openNodeInTab(value: unknown, name: string) {
		const text = JSON.stringify(value, null, 2);
		tabManager.addTab(
			{ ...defaultTabState, jsonInput: text, parsedData: value, stats: calculateStats(value, text) },
			name
		);
	}

	function handleAddTab() {
		tabManager.addTab(defaultTabState, `Viewer ${tabs.length + 1}`);
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

	let comparePickerOpen = $state(false);
	let compareLeftId = $state('');
	let compareRightId = $state('');
	let compareError = $state<string | null>(null);

	function openComparePicker() {
		// Default: the active tab and its neighbour, in tab-bar order
		const idx = Math.max(0, tabs.findIndex((t) => t.id === activeTabId));
		const [l, r] = idx === tabs.length - 1 ? [idx - 1, idx] : [idx, idx + 1];
		compareLeftId = tabs[l]?.id ?? '';
		compareRightId = tabs[r]?.id ?? '';
		compareError = null;
		comparePickerOpen = true;
	}

	function compareTabs() {
		const left = tabs.find((t) => t.id === compareLeftId);
		const right = tabs.find((t) => t.id === compareRightId);
		if (!left || !right) return;
		if (left.id === right.id) {
			compareError = 'Pick two different tabs';
			return;
		}
		const empty = [left, right].find((t) => !t.state.jsonInput.trim());
		if (empty) {
			compareError = `"${empty.name}" has no JSON`;
			return;
		}
		setCompareHandoff({ left: left.state.jsonInput, right: right.state.jsonInput });
		comparePickerOpen = false;
		goto('/compare');
	}

	let treeView: ReturnType<typeof JsonTreeView> | undefined = $state();
	let matchCount = $state(0);
	let currentMatch = $state(0);
	let fullscreen = $state(false);

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (e.shiftKey) treeView?.prev();
			else treeView?.next();
		} else if (e.key === 'Escape' && searchTerm) {
			e.stopPropagation();
			handleSearchChange('');
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && fullscreen) fullscreen = false;
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

<svelte:window onkeydown={handleWindowKeydown} />

<div class="container">
	<div class="page-header">
		<BrandBadge size={26} />
		<h1>JSON Viewer</h1>
		<p>Explore and navigate JSON data with an interactive tree view</p>
	</div>

	{#if tabs && tabs.length > 0}
		<div class="tab-row">
			<div class="tab-row-tabs">
				<TabBar
					{tabs}
					activeTabId={activeTabId || ''}
					onSelectTab={handleSelectTab}
					onAddTab={handleAddTab}
					onRemoveTab={handleRemoveTab}
					onRenameTab={handleRenameTab}
				/>
			</div>
			<div class="compare-tabs">
				<button
					class="action-btn compare-btn"
					class:active={comparePickerOpen}
					onclick={() => (comparePickerOpen ? (comparePickerOpen = false) : openComparePicker())}
					disabled={tabs.length < 2}
					title={tabs.length < 2 ? 'Open a second tab to compare' : 'Compare two tabs'}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
					</svg>
					Compare Tabs
				</button>
				{#if comparePickerOpen}
					<div class="compare-picker" role="dialog" aria-label="Compare two tabs">
						<label>
							<span>Left</span>
							<select bind:value={compareLeftId} onchange={() => (compareError = null)}>
								{#each tabs as tab (tab.id)}
									<option value={tab.id}>{tab.name}</option>
								{/each}
							</select>
						</label>
						<label>
							<span>Right</span>
							<select bind:value={compareRightId} onchange={() => (compareError = null)}>
								{#each tabs as tab (tab.id)}
									<option value={tab.id}>{tab.name}</option>
								{/each}
							</select>
						</label>
						{#if compareError}
							<p class="compare-error">{compareError}</p>
						{/if}
						<div class="picker-actions">
							<button class="action-btn" onclick={() => (comparePickerOpen = false)}>Cancel</button>
							<button class="btn btn-primary" onclick={compareTabs}>Compare</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

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
				value={jsonInput}
				onchange={(e) => handleInputChange(e.currentTarget.value)}
				oninput={(e) => handleInputChange(e.currentTarget.value)}
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

		<div class="viewer-panel card" class:fullscreen>
			<div class="panel-header">
				<div class="panel-title">
					<h2>{inspecting ? 'Inspect' : viewMode === 'tree' ? 'Tree View' : viewMode === 'split' ? 'Tree + Grid' : 'Raw View'}</h2>
					{#if parsedData && stats}
						<span class="stats-inline">
							<span><b>{stats.keys.toLocaleString()}</b> keys</span>
							<span><b>{stats.depth}</b> depth</span>
							<span><b>{stats.size}</b></span>
						</span>
					{/if}
				</div>
				<div class="header-actions">
					{#if parsedData && !inspecting}
						<div class="search-box" class:no-match={searchTerm.trim() && matchCount === 0}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="11" cy="11" r="8" />
								<path d="M21 21l-4.35-4.35" />
							</svg>
							<input
								type="text"
								value={searchTerm}
								onchange={(e) => handleSearchChange(e.currentTarget.value)}
								oninput={(e) => handleSearchChange(e.currentTarget.value)}
								onkeydown={handleSearchKeydown}
								placeholder="Search keys/values..."
								disabled={viewMode !== 'tree'}
								title={viewMode !== 'tree' ? 'Switch to Tree view to search' : 'Enter = next, Shift+Enter = previous'}
							/>
							{#if searchTerm.trim() && viewMode === 'tree'}
								<span class="match-count" aria-live="polite">
									{matchCount ? `${currentMatch} / ${matchCount.toLocaleString()}` : 'No matches'}
								</span>
								<button class="nav-btn" onclick={() => treeView?.prev()} disabled={!matchCount} title="Previous match (Shift+Enter)" aria-label="Previous match">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15" /></svg>
								</button>
								<button class="nav-btn" onclick={() => treeView?.next()} disabled={!matchCount} title="Next match (Enter)" aria-label="Next match">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
								</button>
							{/if}
						</div>
						<div class="view-toggle">
							<button
								class="toggle-btn"
								class:active={viewMode === 'tree'}
								onclick={() => handleViewModeChange('tree')}
							>
								Tree
							</button>
							<button
								class="toggle-btn"
								class:active={viewMode === 'split'}
								onclick={() => handleViewModeChange('split')}
								title="Tree and grid side-by-side"
							>
								Tree+Grid
							</button>
							<button
								class="toggle-btn"
								class:active={viewMode === 'raw'}
								onclick={() => handleViewModeChange('raw')}
							>
								Raw
							</button>
							<button
								class="toggle-btn"
								onclick={() => openInspector([])}
								title="Open as a grid — or hover any object/array row and click the grid icon to inspect just that child"
							>
								Grid
							</button>
						</div>
						<button class="action-btn" onclick={toggleExpandAll}>
							{expandAll ? 'Collapse All' : 'Expand All'}
						</button>
						<button class="action-btn" onclick={downloadJson}>
							Download
						</button>
					{/if}
					<button
						class="action-btn icon-only"
						onclick={() => (fullscreen = !fullscreen)}
						title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
						aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
					>
						{#if fullscreen}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
						{:else}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
						{/if}
					</button>
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
				{#if inspecting}
					<JsonNodeInspector
						root={parsedData}
						path={inspectPath!}
						mode={inspectMode}
						onPathChange={openInspector}
						onModeChange={(m) => updateActiveTab({ inspectMode: m })}
						onClose={() => updateActiveTab({ inspectPath: null })}
						onOpenInTab={openNodeInTab}
					/>
				{/if}
				{#if viewMode === 'tree'}
					<!-- Kept mounted while inspecting so expansion and scroll survive -->
					<div class="tree-container" class:hidden={inspecting}>
						<JsonTreeView
							bind:this={treeView}
							bind:matchCount
							bind:currentMatch
							data={parsedData}
							{searchTerm}
							{expandAll}
							onInspect={openInspector}
						/>
					</div>
				{:else if viewMode === 'split' && !inspecting}
					<div class="split-main-container">
						{#key parsedData}
							<TreeGridSplitView root={parsedData} {expandAll} />
						{/key}
					</div>
				{:else if !inspecting}
					<div class="raw-container">
						<pre class="raw-view">{JSON.stringify(parsedData, null, 2)}</pre>
					</div>
				{/if}
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
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.5rem;
		min-width: 0;
	}

	.page-header h1 {
		font-size: 1.15rem;
		line-height: 1.2;
		margin: 0;
		white-space: nowrap;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.page-header p {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.tab-row {
		display: flex;
		align-items: stretch;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.tab-row-tabs {
		flex: 1;
		min-width: 0;
	}

	.tab-row-tabs :global(.tab-bar) {
		border-bottom: none;
	}

	.compare-tabs {
		position: relative;
		display: flex;
		align-items: center;
		padding: 0 0.75rem;
	}

	.compare-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		white-space: nowrap;
	}

	.compare-btn.active {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.compare-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.compare-picker {
		position: absolute;
		top: calc(100% + 4px);
		right: 0.75rem;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 260px;
		padding: 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.compare-picker label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.compare-picker select {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text);
		font-size: 0.8rem;
		padding: 0.375rem 0.5rem;
	}

	.compare-error {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-error);
	}

	.picker-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.picker-actions .btn {
		padding: 0.375rem 0.9rem;
		font-size: 0.8rem;
	}

	.viewer-layout {
		display: grid;
		grid-template-columns: 360px 1fr;
		gap: 0.75rem;
		height: calc(100vh - 225px);
		min-height: 460px;
	}

	.viewer-panel.fullscreen {
		position: fixed;
		inset: 0;
		z-index: 1000;
		border-radius: 0;
		border: none;
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
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.panel-header h2 {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0;
		white-space: nowrap;
	}

	.panel-title {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		min-width: 0;
	}

	.stats-inline {
		display: flex;
		gap: 0.6rem;
		font-size: 0.72rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.stats-inline b {
		color: var(--color-primary);
		font-weight: 600;
	}

	.action-btn.icon-only {
		display: inline-flex;
		align-items: center;
		padding: 0.375rem 0.5rem;
	}

	.match-count {
		font-size: 0.72rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		padding-left: 0.25rem;
		border-left: 1px solid var(--color-border);
	}

	.search-box.no-match {
		border-color: var(--color-error);
	}

	.search-box.no-match .match-count {
		color: var(--color-error);
	}

	.nav-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		background: none;
		border: none;
		border-radius: 4px;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--color-surface);
		color: var(--color-primary);
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: default;
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
		padding: 0.25rem 0.5rem;
	}

	.search-box > svg {
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
		padding: 0.5rem 0.75rem;
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

	.tree-container {
		flex: 1;
		min-height: 0;
		padding: 0.25rem 0;
	}

	.tree-container.hidden {
		display: none;
	}

	.raw-container {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 0.75rem 1rem;
	}

	.raw-view {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text);
		white-space: pre;
		margin: 0;
	}

	.split-main-container {
		flex: 1;
		min-height: 0;
		display: flex;
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

	@media (max-width: 700px) {
		.page-header p {
			display: none;
		}
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
