<script lang="ts">
	import type { AnnotatedNode } from '$lib/types';
	import DiffNode from './DiffNode.svelte';

	interface Props {
		node: AnnotatedNode;
		side: 'left' | 'right';
		depth: number;
		keyName?: string;
	}

	let { node, side, depth, keyName }: Props = $props();

	let isExpanded = $state(depth < 3);

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	function getDiffClass(diffType: string): string {
		switch (diffType) {
			case 'added':
				return 'diff-added';
			case 'removed':
				return 'diff-removed';
			case 'modified':
			case 'type_changed':
				return 'diff-modified';
			default:
				return '';
		}
	}

	function formatValue(value: unknown): string {
		if (value === null) return 'null';
		if (typeof value === 'string') return `"${value}"`;
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (typeof value === 'number') return String(value);
		if (Array.isArray(value)) return `Array[${value.length}]`;
		if (typeof value === 'object') return `Object{${Object.keys(value).length}}`;
		return String(value);
	}

	function getValueClass(value: unknown): string {
		if (value === null) return 'value-null';
		if (typeof value === 'string') return 'value-string';
		if (typeof value === 'boolean') return 'value-boolean';
		if (typeof value === 'number') return 'value-number';
		return '';
	}

	let hasChildren = $derived(node.children !== undefined);
	let isArray = $derived(Array.isArray(node.children));
	let childEntries = $derived(
		hasChildren
			? isArray
				? (node.children as AnnotatedNode[]).map((child, i) => [String(i), child] as const)
				: Object.entries(node.children as Record<string, AnnotatedNode>)
			: []
	);
</script>

<div class="node {getDiffClass(node.diff_type)}" style="--depth: {depth}">
	<div class="node-content">
		{#if hasChildren}
			<button class="toggle-btn" onclick={toggleExpand} aria-label="Toggle expand">
				<span class="toggle-icon" class:expanded={isExpanded}>▶</span>
			</button>
		{:else}
			<span class="toggle-placeholder"></span>
		{/if}

		{#if keyName !== undefined}
			<span class="key">"{keyName}"</span><span class="colon">:</span>
		{/if}

		{#if hasChildren}
			<span class="bracket">{isArray ? '[' : '{'}</span>
			{#if !isExpanded}
				<span class="collapsed-indicator">...</span>
				<span class="bracket">{isArray ? ']' : '}'}</span>
			{/if}
		{:else}
			<span class="value {getValueClass(node.value)}">{formatValue(node.value)}</span>
		{/if}

		{#if node.diff_type !== 'unchanged'}
			<span class="diff-indicator {node.diff_type}">
				{#if node.diff_type === 'added'}+{:else if node.diff_type === 'removed'}-{:else if node.diff_type === 'modified'}~{:else if node.diff_type === 'type_changed'}⇄{/if}
			</span>
		{/if}
	</div>

	{#if hasChildren && isExpanded}
		<div class="children">
			{#each childEntries as [key, child]}
				<DiffNode node={child} {side} depth={depth + 1} keyName={key} />
			{/each}
		</div>
		<div class="closing-bracket">
			<span class="bracket">{isArray ? ']' : '}'}</span>
		</div>
	{/if}
</div>

<style>
	.node {
		padding-left: calc(var(--depth) * 1.5rem);
	}

	.node-content {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		border-radius: 3px;
		transition: background-color 0.15s ease;
	}

	.node-content:hover {
		background: var(--color-bg);
	}

	.diff-added > .node-content {
		background: var(--color-added);
		border-left: 3px solid var(--color-added-border);
	}

	.diff-removed > .node-content {
		background: var(--color-removed);
		border-left: 3px solid var(--color-removed-border);
	}

	.diff-modified > .node-content {
		background: var(--color-modified);
		border-left: 3px solid var(--color-modified-border);
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 0.625rem;
		cursor: pointer;
	}

	.toggle-icon {
		transition: transform 0.15s ease;
	}

	.toggle-icon.expanded {
		transform: rotate(90deg);
	}

	.toggle-placeholder {
		width: 1rem;
	}

	.key {
		color: #9333ea;
	}

	.colon {
		color: var(--color-text);
		margin-right: 0.25rem;
	}

	.bracket {
		color: var(--color-text-muted);
	}

	.collapsed-indicator {
		color: var(--color-text-muted);
		margin: 0 0.25rem;
	}

	.value-string {
		color: #16a34a;
	}

	.value-number {
		color: #2563eb;
	}

	.value-boolean {
		color: #dc2626;
	}

	.value-null {
		color: #6b7280;
		font-style: italic;
	}

	.diff-indicator {
		margin-left: 0.5rem;
		padding: 0 0.375rem;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.diff-indicator.added {
		background: var(--color-added-border);
		color: #166534;
	}

	.diff-indicator.removed {
		background: var(--color-removed-border);
		color: #991b1b;
	}

	.diff-indicator.modified,
	.diff-indicator.type_changed {
		background: var(--color-modified-border);
		color: #92400e;
	}

	.children {
		margin-left: 0;
	}

	.closing-bracket {
		padding-left: calc(var(--depth) * 1.5rem + 1.5rem);
	}
</style>
