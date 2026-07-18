<script lang="ts">
	import { CategoryTabs, ToolGrid, ToolSearch } from '$lib/components/tools';
	import { TOOLS, getToolsByCategory, searchTools, TOOL_CATEGORIES } from '$lib/tools/registry';
	import type { ToolCategory, ToolMetadata } from '$lib/types';

	let activeCategory: ToolCategory = 'json-api';
	let searchQuery = '';
	let selectedTool: ToolMetadata | null = null;
	let filteredTools: ToolMetadata[] = [];

	// Update filtered tools when category or search changes
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
		updateFilteredTools();
	}

	function handleSearchChange(query: string) {
		searchQuery = query;
		updateFilteredTools();
	}

	function handleSelectTool(tool: ToolMetadata) {
		selectedTool = tool;
	}

	function handleCloseTool() {
		selectedTool = null;
	}

	// Initialize
	updateFilteredTools();
</script>

<svelte:head>
	<title>Tools Dashboard - VinMi</title>
</svelte:head>

<div class="dashboard-container">
	<div class="dashboard-header">
		<div class="header-content">
			<h1 class="dashboard-title">Developer Tools</h1>
			<p class="dashboard-subtitle">59 utilities for JSON, text, dates, cryptography, and API development</p>
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
					<p>Tool: {selectedTool.name}</p>
					<p>Category: {TOOL_CATEGORIES[selectedTool.category].name}</p>
					<p>Description: {selectedTool.description}</p>
					<p style="color: var(--color-text-secondary); font-size: 0.875rem; margin-top: var(--spacing-md);">
						Coming soon - tool implementation in progress
					</p>
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
		padding: var(--spacing-lg);
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
		color: white;
		border-bottom: 1px solid var(--color-border);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.dashboard-title {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: 2rem;
		font-weight: 700;
	}

	.dashboard-subtitle {
		margin: 0;
		font-size: 0.9375rem;
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

	/* Responsive layout */
	@media (max-width: 768px) {
		.dashboard-header {
			padding: var(--spacing-md);
		}

		.dashboard-title {
			font-size: 1.5rem;
		}

		.dashboard-subtitle {
			font-size: 0.875rem;
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
