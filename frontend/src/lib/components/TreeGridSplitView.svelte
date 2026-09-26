<script lang="ts">
	import JsonTreeView from './JsonTreeView.svelte';
	import JsonGridView from './JsonGridView.svelte';
	import { resolvePath, isContainer } from '$lib/utils/gridModel';

	/** Full tree on the left; the selected object/array as a grid on the right. */
	interface Props {
		root: unknown;
		expandAll?: boolean;
	}

	let { root, expandAll = false }: Props = $props();

	let selectedPath = $state<string[]>([]);

	const selectedValue = $derived(resolvePath(root, selectedPath).value);
	const selectedKey = $derived(JSON.stringify(selectedPath));

	let container: HTMLDivElement | undefined = $state();
	let splitPos = $state(40);
	let dragging = $state(false);

	function handleMouseMove(e: MouseEvent) {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		splitPos = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
	}
</script>

<svelte:window
	onmousemove={dragging ? handleMouseMove : undefined}
	onmouseup={() => (dragging = false)}
/>

<div class="split-container" class:dragging bind:this={container}>
	<div class="split-panel" style="flex-basis: {splitPos}%">
		<div class="panel-label">Tree</div>
		<div class="panel-body">
			<JsonTreeView data={root} {expandAll} {selectedPath} onSelect={(p) => (selectedPath = p)} />
		</div>
	</div>

	<button
		class="split-divider"
		type="button"
		aria-label="Drag to resize panels"
		onmousedown={() => (dragging = true)}
	></button>

	<div class="split-panel" style="flex-basis: {100 - splitPos}%">
		<nav class="panel-label crumbs" aria-label="Selected path">
			<button class="crumb" class:current={selectedPath.length === 0} onclick={() => (selectedPath = [])}>root</button>
			{#each selectedPath as seg, idx (idx)}
				<span class="sep">›</span>
				<button
					class="crumb"
					class:current={idx === selectedPath.length - 1}
					onclick={() => (selectedPath = selectedPath.slice(0, idx + 1))}
				>{seg}</button>
			{/each}
		</nav>
		<div class="panel-body">
			{#if isContainer(selectedValue)}
				{#key selectedKey}
					<JsonGridView
						data={selectedValue}
						name={selectedPath.at(-1) ?? 'root'}
						onDrill={(rel) => (selectedPath = [...selectedPath, ...rel])}
					/>
				{/key}
			{:else}
				<p class="hint">The root is a single value — nothing to show as a grid.</p>
			{/if}
		</div>
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
		cursor: col-resize;
	}

	.split-panel {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}

	.panel-label {
		flex-shrink: 0;
		padding: 0.35rem 0.75rem;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-text-muted);
		background: color-mix(in srgb, var(--color-primary) 3%, transparent);
		border-bottom: 1px solid var(--color-border);
	}

	.panel-body {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.panel-body > :global(*) {
		flex: 1;
		min-height: 0;
	}

	.crumbs {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.2rem;
		font-family: var(--font-mono);
		font-weight: 400;
	}

	.crumb {
		background: none;
		border: none;
		padding: 0.05rem 0.25rem;
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
		opacity: 0.6;
	}

	.split-divider {
		width: 5px;
		flex-shrink: 0;
		padding: 0;
		border: none;
		border-left: 1px solid var(--color-border);
		background: transparent;
		cursor: col-resize;
	}

	.split-divider:hover,
	.dragging .split-divider {
		background: var(--color-primary);
	}

	.hint {
		padding: 2rem;
		text-align: center;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>
