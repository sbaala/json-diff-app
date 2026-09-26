<script lang="ts">
	import JsonTreeView from './JsonTreeView.svelte';
	import JsonGridView from './JsonGridView.svelte';
	import { resolvePath, isContainer } from '$lib/utils/gridModel';

	interface Props {
		root: unknown;
		searchTerm?: string;
		onPathChange?: (path: string[]) => void;
		onOpenInTab?: (value: unknown, name: string) => void;
	}

	let { root, searchTerm = '', onPathChange, onOpenInTab }: Props = $props();

	// Track selected path for the right panel
	let selectedPath = $state<string[]>([]);

	const resolved = $derived(resolvePath(root, selectedPath));
	const selectedValue = $derived(resolved.value);
	const selectedName = $derived(selectedPath.length ? selectedPath[selectedPath.length - 1] : 'root');
	const isRootSelected = $derived(selectedPath.length === 0);

	let splitPos = $state(50);
	let isDragging = $state(false);

	let treeView: ReturnType<typeof JsonTreeView> | undefined = $state();
	let matchCount = $state(0);
	let currentMatch = $state(0);
	let treeWrapperEl: HTMLDivElement | undefined = $state();
	let initialized = $state(false);

	// Auto-select root on mount
	$effect(() => {
		if (!initialized && root) {
			selectedPath = [];
			initialized = true;
		}
	});

	function handleNodeSelected(path: string[]) {
		selectedPath = path;
		// Notify parent of selection change (for inspector mode)
		onPathChange?.(path);
	}

	// Extract path from node row by analyzing DOM structure
	function extractPathFromNode(nodeRow: Element): string[] | null {
		const style = window.getComputedStyle(nodeRow);
		const paddingLeft = parseFloat(style.paddingLeft || '0');
		const INDENT = 18;
		const depth = Math.max(0, Math.round((paddingLeft - 8) / INDENT));

		// Get the key/text content of this node
		const keySpan = nodeRow.querySelector('.node-key');
		if (!keySpan) return null;

		const keyText = keySpan.textContent?.trim();
		if (!keyText) return null;

		// Build path by finding ancestors at each depth level
		const path: string[] = [];
		let currentDepth = depth;
		let current: Element | null = nodeRow;

		// Add current node key
		path.push(keyText);

		// Walk backwards to find parent nodes
		while (currentDepth > 0 && current) {
			let found = false;
			let sibling: Element | null = current.previousElementSibling;

			while (sibling) {
				const siblingStyle = window.getComputedStyle(sibling);
				const siblingPadding = parseFloat(siblingStyle.paddingLeft || '0');
				const siblingDepth = Math.max(0, Math.round((siblingPadding - 8) / INDENT));

				if (siblingDepth < currentDepth) {
					const siblingKeySpan = sibling.querySelector('.node-key');
					const siblingKey = siblingKeySpan?.textContent?.trim();
					if (siblingKey) {
						path.unshift(siblingKey);
						currentDepth = siblingDepth;
						current = sibling;
						found = true;
					}
					break;
				}
				sibling = sibling.previousElementSibling;
			}

			if (!found) break;
		}

		return path;
	}

	// Auto-select node when tree node is clicked
	function handleTreeClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const nodeRow = target.closest('.node-row');
		if (!nodeRow) return;

		// Don't trigger on inspect button (it has its own handler via onInspect)
		if (target.closest('.inspect')) return;

		// First try clicking the inspect button if it exists
		const inspectBtn = nodeRow.querySelector('.inspect') as HTMLButtonElement | null;
		if (inspectBtn) {
			inspectBtn.click();
			return;
		}

		// If no inspect button, extract path from DOM and select directly
		const path = extractPathFromNode(nodeRow);
		if (path) {
			handleNodeSelected(path);
		}
	}

	function handleMouseDown() {
		isDragging = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		const container = document.querySelector('.split-container') as HTMLElement;
		if (!container) return;

		const rect = container.getBoundingClientRect();
		const newPos = ((e.clientX - rect.left) / rect.width) * 100;
		if (newPos > 20 && newPos < 80) {
			splitPos = newPos;
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}
</script>

<svelte:window
	onmousemove={isDragging ? handleMouseMove : undefined}
	onmouseup={handleMouseUp}
/>

<div class="split-container" class:dragging={isDragging}>
	<!-- Tree Panel -->
	<div class="split-panel tree-panel" style="flex-basis: {splitPos}%">
		<div class="panel-label">Tree View</div>
		<div class="tree-wrapper" bind:this={treeWrapperEl} onclick={handleTreeClick} role="region" aria-label="JSON tree structure, click any container to view its contents in the grid">
			<JsonTreeView
				bind:this={treeView}
				bind:matchCount
				bind:currentMatch
				data={root}
				{searchTerm}
				onInspect={handleNodeSelected}
			/>
		</div>
	</div>

	<!-- Resizable Divider -->
	<button
		class="split-divider"
		onmousedown={handleMouseDown}
		aria-label="Resize panels: drag left to shrink tree, right to expand"
		type="button"
		title="Drag to resize panels"
	></button>

	<!-- Grid Panel -->
	<div class="split-panel grid-panel" style="flex-basis: {100 - splitPos}%">
		<div class="panel-label">Grid View {selectedPath.length > 0 ? `(${selectedName})` : ''}</div>
		{#if isContainer(selectedValue)}
			{#key JSON.stringify(selectedPath)}
				<JsonGridView
					data={selectedValue}
					{searchTerm}
					name={selectedName}
					onDrill={(rel) => {
						handleNodeSelected([...selectedPath, ...rel]);
					}}
				/>
			{/key}
		{:else}
			<div class="hint">
				<p>{isRootSelected ? 'Root is a single value (not a container)' : 'This is a single value, not a container'}</p>
				<p class="hint-small">Click an object or array in the tree to view its data as a grid.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.split-container {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.split-container.dragging {
		user-select: none;
	}

	.split-panel {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.tree-panel {
		border-right: none;
	}

	.grid-panel {
		border-left: none;
	}

	.panel-label {
		padding: 0.4rem 0.75rem;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-text-muted);
		background: color-mix(in srgb, var(--color-primary) 3%, transparent);
		border-bottom: 1px solid var(--color-border);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		flex-shrink: 0;
	}

	.tree-wrapper {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 0.25rem 0;
	}

	.split-panel > :global(div:not(.panel-label):not(.tree-wrapper)) {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.split-divider {
		width: 4px;
		background: var(--color-border);
		cursor: col-resize;
		transition: background 0.2s ease;
		flex-shrink: 0;
		border: none;
		padding: 0;
		outline: none;
	}

	.split-divider:hover {
		background: var(--color-primary);
	}

	.split-container.dragging .split-divider {
		background: var(--color-primary);
	}

	.hint {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		text-align: center;
		padding: 2rem;
	}

	.hint p {
		margin: 0.25rem 0;
		font-size: 0.85rem;
	}

	.hint-small {
		font-size: 0.75rem !important;
		opacity: 0.8;
	}
</style>
