<script lang="ts">
	import type { DiffItem } from '$lib/types';

	interface Props {
		differences: DiffItem[];
	}

	let { differences }: Props = $props();

	function getDiffTypeLabel(type: string): string {
		switch (type) {
			case 'added':
				return 'Added';
			case 'removed':
				return 'Removed';
			case 'modified':
				return 'Modified';
			case 'type_changed':
				return 'Type Changed';
			default:
				return type;
		}
	}

	function formatValue(value: unknown): string {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'string') return `"${value}"`;
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function truncate(str: string, length: number): string {
		if (str.length <= length) return str;
		return str.slice(0, length) + '...';
	}
</script>

<div class="diff-list">
	<div class="list-header">
		<h3>All Differences ({differences.length})</h3>
	</div>

	{#if differences.length === 0}
		<div class="empty-state">No differences found</div>
	{:else}
		<div class="list-content">
			{#each differences as diff}
				<div class="diff-item {diff.diff_type}">
					<div class="diff-header">
						<span class="diff-type-badge {diff.diff_type}">{getDiffTypeLabel(diff.diff_type)}</span>
						<span class="diff-path">{diff.path}</span>
					</div>
					<div class="diff-values">
						{#if diff.diff_type === 'added'}
							<div class="value-row added">
								<span class="value-label">+</span>
								<span class="value-content">{truncate(formatValue(diff.right_value), 100)}</span>
								<span class="type-badge">{diff.right_type}</span>
							</div>
						{:else if diff.diff_type === 'removed'}
							<div class="value-row removed">
								<span class="value-label">-</span>
								<span class="value-content">{truncate(formatValue(diff.left_value), 100)}</span>
								<span class="type-badge">{diff.left_type}</span>
							</div>
						{:else}
							<div class="value-row removed">
								<span class="value-label">-</span>
								<span class="value-content">{truncate(formatValue(diff.left_value), 100)}</span>
								<span class="type-badge">{diff.left_type}</span>
							</div>
							<div class="value-row added">
								<span class="value-label">+</span>
								<span class="value-content">{truncate(formatValue(diff.right_value), 100)}</span>
								<span class="type-badge">{diff.right_type}</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.diff-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-surface);
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.list-header {
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.list-header h3 {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.list-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.diff-item {
		margin-bottom: 0.5rem;
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.diff-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
	}

	.diff-type-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.diff-type-badge.added {
		background: var(--color-added);
		color: #166534;
	}

	.diff-type-badge.removed {
		background: var(--color-removed);
		color: #991b1b;
	}

	.diff-type-badge.modified,
	.diff-type-badge.type_changed {
		background: var(--color-modified);
		color: #92400e;
	}

	.diff-path {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.diff-values {
		padding: 0.5rem 0.75rem;
	}

	.value-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		margin-bottom: 0.25rem;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.value-row.added {
		background: var(--color-added);
	}

	.value-row.removed {
		background: var(--color-removed);
	}

	.value-label {
		font-weight: 600;
		width: 1rem;
	}

	.value-row.added .value-label {
		color: var(--color-success);
	}

	.value-row.removed .value-label {
		color: var(--color-error);
	}

	.value-content {
		flex: 1;
		word-break: break-all;
	}

	.type-badge {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		color: var(--color-text-muted);
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: var(--color-text-muted);
	}
</style>
