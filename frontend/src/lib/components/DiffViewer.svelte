<script lang="ts">
	import type { AnnotatedNode } from '$lib/types';
	import DiffNode from './DiffNode.svelte';

	interface Props {
		leftTree: AnnotatedNode | null;
		rightTree: AnnotatedNode | null;
	}

	let { leftTree, rightTree }: Props = $props();
</script>

<div class="diff-viewer">
	<div class="diff-panel left">
		<div class="panel-header">
			<span>Original (Left)</span>
		</div>
		<div class="panel-content">
			{#if leftTree}
				<DiffNode node={leftTree} side="left" depth={0} />
			{:else}
				<div class="empty-state">No data to display</div>
			{/if}
		</div>
	</div>

	<div class="diff-panel right">
		<div class="panel-header">
			<span>Modified (Right)</span>
		</div>
		<div class="panel-content">
			{#if rightTree}
				<DiffNode node={rightTree} side="right" depth={0} />
			{:else}
				<div class="empty-state">No data to display</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.diff-viewer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		height: 100%;
	}

	.diff-panel {
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.panel-header {
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		font-weight: 600;
	}

	.left .panel-header {
		border-left: 3px solid var(--color-error);
	}

	.right .panel-header {
		border-left: 3px solid var(--color-success);
	}

	.panel-content {
		flex: 1;
		padding: 1rem;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}

	.empty-state {
		color: var(--color-text-muted);
		text-align: center;
		padding: 2rem;
	}
</style>
