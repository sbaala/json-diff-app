<script lang="ts">
	import { CategoryTabs, ToolGrid, ToolSearch } from '$lib/components/tools';
	import { TOOLS, getToolsByCategory, searchTools, TOOL_CATEGORIES } from '$lib/tools/registry';
	import { loadToolComponent, hasToolImplementation } from '$lib/tools/loader';
	import type { ToolCategory, ToolMetadata } from '$lib/types';

	let activeCategory: ToolCategory = 'json-api';
	let searchQuery = '';
	let selectedTool: ToolMetadata | null = null;
	let selectedToolComponent: any = null;
	let isLoadingComponent = false;
	let filteredTools: ToolMetadata[] = [];

	function updateFilteredTools() {
		if (searchQuery.trim()) {
			filteredTools = searchTools(searchQuery);
		} else {
			filteredTools = getToolsByCategory(activeCategory);
		}
	}

	function handleCategoryChange(category: ToolCategory) {
		activeCategory = category;
		searchQuery = '';
		selectedTool = null;
		selectedToolComponent = null;
		updateFilteredTools();
	}

	function handleSearchChange(query: string) {
		searchQuery = query;
		updateFilteredTools();
	}

	async function handleSelectTool(tool: ToolMetadata) {
		selectedTool = tool;
		isLoadingComponent = true;
		selectedToolComponent = null;

		try {
			selectedToolComponent = await loadToolComponent(tool.id);
		} catch (e) {
			console.error(`Failed to load tool ${tool.id}:`, e);
		} finally {
			isLoadingComponent = false;
		}
	}

	function handleCloseTool() {
		selectedTool = null;
		selectedToolComponent = null;
	}

	updateFilteredTools();
</script>

<svelte:head>
	<title>Tools Dashboard - VinMi</title>
</svelte:head>

<div class="dashboard-container">
	<div class="dashboard-header">
		<div class="header-content">
			<h1 class="dashboard-title">Developer Tools</h1>
			<p class="dashboard-subtitle">{TOOLS.length} utilities for JSON, text, dates, cryptography, and API development</p>
		</div>
	</div>

	<div class="dashboard-layout">
		{#if selectedTool}
			<div class="tool-viewer">
				<div class="tool-viewer-header">
					<h2>{selectedTool.name}</h2>
					<button class="back-btn" on:click={handleCloseTool} title="Back to tools list">
						← Back
					</button>
				</div>
				<div class="tool-viewer-content">
					{#if isLoadingComponent}
						<div class="loading-state">
							<div class="loading-spinner"></div>
							<span>Loading tool...</span>
						</div>
					{:else if selectedToolComponent}
						<svelte:component this={selectedToolComponent} />
					{:else if hasToolImplementation(selectedTool.id)}
						<div class="error-state">
							<div class="error-icon">❌</div>
							<div class="error-text">Failed to load tool</div>
						</div>
					{:else}
						<div class="placeholder-state">
							<div class="placeholder-icon">🔜</div>
							<div class="placeholder-title">{selectedTool.name}</div>
							<div class="placeholder-desc">{selectedTool.description}</div>
							<div class="placeholder-note">Coming soon - tool implementation in progress</div>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="tools-sidebar">
				<ToolSearch query={searchQuery} onChange={handleSearchChange} />

				{#if !searchQuery}
					<CategoryTabs
						{activeCategory}
						onChange={handleCategoryChange}
					/>
				{/if}

				{#if searchQuery}
					<div class="search-results-header">
						<p class="results-count">
							{filteredTools.length}
							{filteredTools.length === 1 ? 'result' : 'results'} for "{searchQuery}"
						</p>
					</div>
				{/if}

				<ToolGrid tools={filteredTools} onSelectTool={handleSelectTool} />
			</div>
		{/if}
	</div>
</div>

<style>
	.dashboard-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-bg);
	}

	.dashboard-header {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-md);
		flex-wrap: wrap;
		padding: var(--spacing-sm) var(--spacing-lg);
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
		color: white;
		border-bottom: 1px solid var(--color-border);
	}

	.header-content {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-md);
		flex-wrap: wrap;
		width: 100%;
		margin: 0 auto;
	}

	.dashboard-title {
		margin: 0;
		font-size: 1.375rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.dashboard-subtitle {
		margin: 0;
		font-size: 0.8125rem;
		opacity: 0.9;
	}

	.dashboard-layout {
		display: flex;
		flex: 1;
		overflow: hidden;
		min-height: 0;
	}

	.tools-sidebar {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		background: var(--color-bg);
	}

	.search-results-header {
		padding: var(--spacing-md);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.results-count {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.tool-viewer {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		background: var(--color-surface);
		border-left: 1px solid var(--color-border);
	}

	.tool-viewer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.tool-viewer-header h2 {
		margin: 0;
		font-size: 1.25rem;
	}

	.back-btn {
		background: var(--color-secondary);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.back-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.tool-viewer-content {
		padding: var(--spacing-md);
		overflow-y: auto;
		flex: 1;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		height: 100%;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		height: 100%;
		color: var(--color-removed-border);
	}

	.error-icon {
		font-size: 2.5rem;
	}

	.error-text {
		font-size: 0.875rem;
	}

	.placeholder-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		height: 100%;
		color: var(--color-text-muted);
		text-align: center;
	}

	.placeholder-icon {
		font-size: 3rem;
		opacity: 0.5;
	}

	.placeholder-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.placeholder-desc {
		font-size: 0.875rem;
		max-width: 300px;
	}

	.placeholder-note {
		font-size: 0.8125rem;
		margin-top: var(--spacing-md);
	}

	@media (max-width: 768px) {
		.dashboard-header {
			padding: var(--spacing-sm) var(--spacing-md);
		}

		.dashboard-title {
			font-size: 1.25rem;
		}

		.dashboard-subtitle {
			font-size: 0.75rem;
		}

		.tools-sidebar {
			flex-direction: column;
		}
	}

	@media (max-width: 480px) {
		.dashboard-container {
			height: auto;
		}

		.dashboard-layout {
			flex-direction: column;
			min-height: 100vh;
		}
	}
</style>
