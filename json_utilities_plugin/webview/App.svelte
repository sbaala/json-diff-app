<script lang="ts">
	import { onMount } from 'svelte';
	import { CategoryTabs, ToolGrid, ToolSearch } from '$lib/components/tools';
	import { TOOLS, TOOL_CATEGORIES, getToolsByCategory, searchTools } from '$lib/tools/registry';
	import { loadToolComponent } from '$lib/tools/loader';
	import type { ToolCategory, ToolMetadata } from '$lib/types';
	import { onHostMessage, post } from './vscode';
	import { getToolOutput, seedTool, seedToolWhenReady } from './toolBridge';
	import { PAGES, findPage, type PageMetadata } from './pages';

	let activeCategory: ToolCategory = $state('json-api');
	let searchQuery = $state('');
	let selectedTool: ToolMetadata | null = $state(null);
	let selectedPage: PageMetadata | null = $state(null);
	// Tools are resolved at runtime by id, so the component type is only known
	// then — the toolkit's own loader types it the same way.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let selectedComponent: any = $state(null);
	let isLoading = $state(false);
	let loadError: string | null = $state(null);

	const filteredTools = $derived(
		searchQuery.trim() ? searchTools(searchQuery) : getToolsByCategory(activeCategory)
	);

	/**
	 * Whatever is currently open, page or tool. A function rather than a
	 * `$derived`, so it reads the declared types instead of the narrowed-to-null
	 * types TypeScript infers at the point of declaration.
	 */
	function activeTitle(): string | null {
		return selectedPage?.name ?? selectedTool?.name ?? null;
	}

	/** Open one of the toolkit's full pages (/grid, /visualize, …). */
	async function openPage(page: PageMetadata, seed = '') {
		selectedPage = page;
		selectedTool = null;
		selectedComponent = null;
		loadError = null;
		isLoading = true;

		try {
			selectedComponent = (await page.load()).default;
			// Pages own their layout, so the generic textarea bridge is the
			// only seeding contract they share with tools.
			seedToolWhenReady(page.id, seed);
		} catch (error) {
			loadError = (error as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function openTool(tool: ToolMetadata, primary = '', secondary?: string) {
		selectedTool = tool;
		selectedPage = null;
		selectedComponent = null;
		loadError = null;
		isLoading = true;

		try {
			const component = await loadToolComponent(tool.id);
			if (!component) {
				loadError = `"${tool.name}" is listed in the catalog but has no implementation yet.`;
				return;
			}
			selectedComponent = component;
			seedToolWhenReady(tool.id, primary, secondary);
		} catch (error) {
			loadError = (error as Error).message;
		} finally {
			isLoading = false;
		}
	}

	function closeTool() {
		selectedTool = null;
		selectedPage = null;
		selectedComponent = null;
		loadError = null;
	}

	function sendOutputToEditor(asNewFile: boolean) {
		const output = getToolOutput();
		if (!output.trim()) {
			post({ level: 'warn', message: 'This tool has no output to send yet.', type: 'notify' });
			return;
		}
		post(
			asNewFile
				? { type: 'openAsNewFile', text: output, languageId: 'json' }
				: { type: 'applyToEditor', text: output }
		);
	}

	onMount(() => {
		const unsubscribe = onHostMessage((message) => {
			switch (message.type) {
				case 'open': {
					if (message.toolId === null) {
						closeTool();
						break;
					}
					// Pages and registry tools share one id space in the
					// protocol; pages win, since they are the richer surface.
					const page = findPage(message.toolId);
					if (page) {
						void openPage(page, message.input);
						break;
					}
					const tool = TOOLS.find((candidate) => candidate.id === message.toolId);
					if (!tool) {
						loadError = `Unknown tool "${message.toolId}".`;
						break;
					}
					activeCategory = tool.category;
					// Two-pane tools (compare, text diff) receive the second
					// document in their second field; the bridge places it.
					void openTool(tool, message.input, message.secondaryInput);
					break;
				}

				case 'setInput':
					if (!seedTool(selectedPage?.id ?? selectedTool?.id ?? '', message.input)) {
						post({
							type: 'notify',
							level: 'warn',
							message: 'Open a tool with a text field first, then load from the editor.'
						});
					}
					break;

				case 'setTheme':
					document.documentElement.setAttribute('data-theme', message.theme);
					break;
			}
		});

		post({ type: 'ready' });
		return unsubscribe;
	});
</script>

<div class="shell">
	<header class="bar">
		{#if activeTitle()}
			<button class="ghost" onclick={closeTool}>← All tools</button>
			<span class="title">{activeTitle()}</span>
			<span class="spacer"></span>
			<button class="ghost" onclick={() => post({ type: 'loadFromEditor' })}>
				Load from editor
			</button>
			<button class="ghost" onclick={() => sendOutputToEditor(false)}>Replace selection</button>
			<button class="primary" onclick={() => sendOutputToEditor(true)}>Open as new file</button>
		{:else}
			<span class="title">Developer Tools</span>
			<span class="count">{PAGES.length} pages · {TOOLS.length} tools</span>
			<span class="spacer"></span>
			<ToolSearch
				query={searchQuery}
				placeholder="Search tools…"
				onChange={(query) => (searchQuery = query)}
			/>
		{/if}
	</header>

	<main class="body">
		{#if activeTitle()}
			{#if isLoading}
				<p class="status">Loading {activeTitle()}…</p>
			{:else if loadError}
				<p class="status error">{loadError}</p>
			{:else if selectedComponent}
				{#if selectedPage?.requiresBackend}
					<p class="notice">
						{selectedPage.name} runs its comparison on the VinMi API, so it needs an
						internet connection. For an offline diff, use the JSON Comparator tool.
					</p>
				{/if}
				{@const Tool = selectedComponent}
				<Tool />
			{/if}
		{:else}
			{#if !searchQuery.trim()}
				<section class="pages">
					<h2 class="section-title">Pages</h2>
					<div class="page-grid">
						{#each PAGES as page (page.id)}
							<button class="page-card" onclick={() => openPage(page)}>
								<span class="page-name">{page.name}</span>
								<span class="page-desc">{page.description}</span>
							</button>
						{/each}
					</div>
				</section>
				<h2 class="section-title">Tools</h2>
				<CategoryTabs
					{activeCategory}
					onChange={(category) => (activeCategory = category)}
				/>
				<p class="category-note">{TOOL_CATEGORIES[activeCategory].description}</p>
			{/if}
			<ToolGrid tools={filteredTools} onSelectTool={(tool) => openTool(tool)} />
			{#if filteredTools.length === 0}
				<p class="status">No tools match “{searchQuery}”.</p>
			{/if}
		{/if}
	</main>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-bg);
		color: var(--color-text);
		font-family: var(--font-sans);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.title {
		font-weight: 600;
	}

	.count {
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.spacer {
		flex: 1;
	}

	.body {
		flex: 1;
		overflow: auto;
		padding: var(--spacing-md);
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-subtle);
		margin: var(--spacing-sm) 0 var(--spacing-sm);
	}

	.pages {
		margin-bottom: var(--spacing-lg);
	}

	.page-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: var(--spacing-sm);
	}

	.page-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: flex-start;
		text-align: left;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.page-card:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-primary);
	}

	.page-name {
		font-weight: 600;
		color: var(--color-text);
	}

	.page-desc {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.notice {
		margin-bottom: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.category-note {
		margin: var(--spacing-sm) 0 var(--spacing-md);
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.status {
		color: var(--color-text-muted);
		padding: var(--spacing-lg);
		text-align: center;
	}

	.status.error {
		color: var(--color-error, #ef4444);
	}

	button {
		font: inherit;
		font-size: 0.8125rem;
		border-radius: var(--radius-sm);
		padding: 6px 12px;
		cursor: pointer;
		border: 1px solid var(--color-border);
		transition: background var(--transition), border-color var(--transition);
	}

	button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.ghost {
		background: transparent;
		color: var(--color-text-muted);
	}

	.ghost:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.primary {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: #fff;
	}

	.primary:hover {
		filter: brightness(1.08);
	}
</style>
