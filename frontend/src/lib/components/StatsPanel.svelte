<script lang="ts">
	import type { CompareResponse, StatisticsResponse } from '$lib/types';

	interface Props {
		compareResult: CompareResponse | null;
		statistics: StatisticsResponse | null;
	}

	let { compareResult, statistics }: Props = $props();
</script>

<div class="stats-panel">
	{#if compareResult}
		<div class="stats-section">
			<h3>Comparison Results</h3>
			<div class="stat-grid">
				<div class="stat-item" class:success={compareResult.is_equal}>
					<span class="stat-label">Status</span>
					<span class="stat-value">{compareResult.is_equal ? 'Equal' : 'Different'}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Total Differences</span>
					<span class="stat-value">{compareResult.diff_count}</span>
				</div>
			</div>
		</div>

		<div class="stats-section">
			<h3>Difference Breakdown</h3>
			<div class="diff-breakdown">
				<div class="breakdown-item added">
					<span class="breakdown-icon">+</span>
					<span class="breakdown-label">Added</span>
					<span class="breakdown-value">{compareResult.added_count}</span>
				</div>
				<div class="breakdown-item removed">
					<span class="breakdown-icon">-</span>
					<span class="breakdown-label">Removed</span>
					<span class="breakdown-value">{compareResult.removed_count}</span>
				</div>
				<div class="breakdown-item modified">
					<span class="breakdown-icon">~</span>
					<span class="breakdown-label">Modified</span>
					<span class="breakdown-value">{compareResult.modified_count}</span>
				</div>
			</div>
		</div>
	{/if}

	{#if statistics}
		<div class="stats-section">
			<h3>Document Statistics</h3>
			<div class="comparison-table">
				<div class="table-header">
					<span></span>
					<span>Left</span>
					<span>Right</span>
				</div>
				<div class="table-row">
					<span>Total Keys</span>
					<span>{statistics.total_keys_left}</span>
					<span>{statistics.total_keys_right}</span>
				</div>
				<div class="table-row">
					<span>Depth</span>
					<span>{statistics.depth_left}</span>
					<span>{statistics.depth_right}</span>
				</div>
				<div class="table-row">
					<span>Objects</span>
					<span>{statistics.object_count_left}</span>
					<span>{statistics.object_count_right}</span>
				</div>
				<div class="table-row">
					<span>Arrays</span>
					<span>{statistics.array_count_left}</span>
					<span>{statistics.array_count_right}</span>
				</div>
			</div>
		</div>
	{/if}

	{#if !compareResult && !statistics}
		<div class="empty-state">
			<p>Enter JSON data and click Compare to see results</p>
		</div>
	{/if}
</div>

<style>
	.stats-panel {
		padding: 1rem;
	}

	.stats-section {
		margin-bottom: 1.5rem;
	}

	.stats-section h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		padding: 0.75rem;
		background: var(--color-bg);
		border-radius: var(--radius);
	}

	.stat-item.success {
		background: var(--color-added);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.diff-breakdown {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.breakdown-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius);
	}

	.breakdown-item.added {
		background: var(--color-added);
	}

	.breakdown-item.removed {
		background: var(--color-removed);
	}

	.breakdown-item.modified {
		background: var(--color-modified);
	}

	.breakdown-icon {
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-weight: 600;
	}

	.added .breakdown-icon {
		background: var(--color-success);
		color: white;
	}

	.removed .breakdown-icon {
		background: var(--color-error);
		color: white;
	}

	.modified .breakdown-icon {
		background: var(--color-warning);
		color: white;
	}

	.breakdown-label {
		flex: 1;
		font-weight: 500;
	}

	.breakdown-value {
		font-weight: 600;
		font-size: 1.125rem;
	}

	.comparison-table {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
	}

	.table-header {
		background: var(--color-bg);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.table-row {
		border-top: 1px solid var(--color-border);
	}

	.table-row span:first-child {
		font-weight: 500;
	}

	.table-row span:not(:first-child) {
		text-align: center;
		color: var(--color-text-muted);
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-muted);
	}
</style>
