<script lang="ts" module>
	export type InspectMode = 'grid' | 'tree' | 'raw' | 'split';
</script>

<script lang="ts">
	import JsonGridView from './JsonGridView.svelte';
	import JsonTreeView from './JsonTreeView.svelte';
	import TreeGridSplitView from './TreeGridSplitView.svelte';
	import { resolvePath, isContainer } from '$lib/utils/gridModel';

	/**
	 * Shows one child of a JSON document on its own — as a grid, tree or raw
	 * JSON — with search. Drilling into nested values (from either view)
	 * extends `path`; the breadcrumb walks back up.
	 */
	interface Props {
		root: unknown;
		path: string[];
		mode: InspectMode;
		onPathChange: (path: string[]) => void;
		onModeChange: (mode: InspectMode) => void;
		onClose: () => void;
		onOpenInTab?: (value: unknown, name: string) => void;
	}

	let { root, path, mode, onPathChange, onModeChange, onClose, onOpenInTab }: Props = $props();

	const resolved = $derived(resolvePath(root, path));
	const value = $derived(resolved.value);
	const name = $derived(path.length ? path[path.length - 1] : 'root');
	const pathKey = $derived(JSON.stringify(path));

	let searchTerm = $state('');
	let treeView: ReturnType<typeof JsonTreeView> | undefined = $state();
	let matchCount = $state(0);
	let currentMatch = $state(0);

	// A new node starts with a clean search
	$effect(() => {
		void pathKey;
		searchTerm = '';
	});

	function drill(rel: string[]) {
		onPathChange([...path, ...rel]);
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && mode === 'tree') {
			e.preventDefault();
			if (e.shiftKey) treeView?.prev();
			else treeView?.next();
		} else if (e.key === 'Escape' && searchTerm) {
			e.stopPropagation();
			searchTerm = '';
		}
	}
</script>

<div class="inspector">
	<div class="inspector-bar">
		<nav class="crumbs" aria-label="Inspected path">
			<button class="back-btn" onclick={onClose} title="Back to full tree">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6" /></svg>
				Tree
			</button>
			<button class="crumb" class:current={path.length === 0} onclick={() => onPathChange([])}>root</button>
			{#each path as seg, idx (idx)}
				<span class="sep">›</span>
				<button
					class="crumb"
					class:current={idx === path.length - 1}
					onclick={() => onPathChange(path.slice(0, idx + 1))}
				>{seg}</button>
			{/each}
		</nav>

		<div class="bar-actions">
			<div class="search-box" class:no-match={mode === 'tree' && searchTerm.trim() && matchCount === 0}>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="M21 21l-4.35-4.35" />
				</svg>
				<input
					type="text"
					bind:value={searchTerm}
					onkeydown={handleSearchKeydown}
					placeholder={mode === 'grid' ? 'Search rows...' : 'Search keys/values...'}
					disabled={mode === 'raw' || mode === 'split'}
				/>
				{#if searchTerm.trim() && mode === 'tree'}
					<span class="match-count">{matchCount ? `${currentMatch} / ${matchCount.toLocaleString()}` : 'No matches'}</span>
					<button class="nav-btn" onclick={() => treeView?.prev()} disabled={!matchCount} aria-label="Previous match">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15" /></svg>
					</button>
					<button class="nav-btn" onclick={() => treeView?.next()} disabled={!matchCount} aria-label="Next match">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
					</button>
				{/if}
			</div>
			<div class="view-toggle">
				{#each ['grid', 'tree', 'split', 'raw'] as const as m (m)}
					<button class="toggle-btn" class:active={mode === m} onclick={() => onModeChange(m)}>
						{m === 'split' ? 'Tree+Grid' : m[0].toUpperCase() + m.slice(1)}
					</button>
				{/each}
			</div>
			{#if onOpenInTab && resolved.found}
				<button class="tool-btn" onclick={() => onOpenInTab(value, name)} title="Open this node as a new viewer tab">
					New tab
				</button>
			{/if}
		</div>
	</div>

	<div class="inspector-body">
		{#if !resolved.found}
			<div class="notice">
				<p>This path no longer exists in the document.</p>
				<button class="tool-btn" onclick={onClose}>Back to tree</button>
			</div>
		{:else if mode === 'raw'}
			<pre class="raw-view">{JSON.stringify(value, null, 2)}</pre>
		{:else if mode === 'split'}
			{#key pathKey}
				<TreeGridSplitView root={value} />
			{/key}
		{:else if mode === 'tree' || !isContainer(value)}
			{#if mode === 'grid'}
				<p class="hint">A single value can't be shown as a grid.</p>
			{/if}
			<div class="tree-wrap">
				{#key pathKey}
					<JsonTreeView
						bind:this={treeView}
						bind:matchCount
						bind:currentMatch
						data={value}
						{searchTerm}
						onInspect={(rel) => {
							if (rel.length) drill(rel);
							else onModeChange('grid');
						}}
					/>
				{/key}
			</div>
		{:else}
			{#key pathKey}
				<JsonGridView data={value} {searchTerm} {name} onDrill={drill} />
			{/key}
		{/if}
	</div>
</div>

<style>
	.inspector {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.inspector-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-primary) 5%, transparent);
	}

	.crumbs {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.2rem;
		min-width: 0;
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.back-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		margin-right: 0.4rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.2rem 0.5rem 0.2rem 0.3rem;
		color: var(--color-text-muted);
		font-family: var(--font-sans, inherit);
		font-size: 0.72rem;
		cursor: pointer;
	}

	.back-btn:hover {
		color: var(--color-text);
		border-color: var(--color-primary);
	}

	.crumb {
		background: none;
		border: none;
		padding: 0.1rem 0.25rem;
		border-radius: 4px;
		color: var(--color-text-muted);
		font: inherit;
		cursor: pointer;
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.crumb:hover {
		color: var(--color-primary);
		background: var(--color-surface);
	}

	.crumb.current {
		color: var(--color-secondary);
		font-weight: 600;
	}

	.sep {
		color: var(--color-text-muted);
		opacity: 0.6;
	}

	.bar-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
	}

	.search-box.no-match {
		border-color: var(--color-error);
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

	.match-count {
		font-size: 0.72rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		padding-left: 0.25rem;
		border-left: 1px solid var(--color-border);
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
		color: var(--color-primary);
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.view-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
	}

	.toggle-btn {
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		padding: 0.3rem 0.7rem;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.toggle-btn:hover {
		color: var(--color-text);
	}

	.toggle-btn.active {
		background: var(--color-primary);
		color: white;
	}

	.tool-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.3rem 0.65rem;
		border-radius: 6px;
		font-size: 0.75rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.tool-btn:hover {
		color: var(--color-text);
		background: var(--color-bg);
	}

	.inspector-body {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.tree-wrap {
		flex: 1;
		min-height: 0;
		padding: 0.25rem 0;
	}

	.raw-view {
		flex: 1;
		min-height: 0;
		overflow: auto;
		margin: 0;
		padding: 0.75rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-text);
		white-space: pre;
	}

	.hint {
		margin: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.notice {
		padding: 2rem;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
</style>
