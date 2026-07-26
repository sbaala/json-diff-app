<script lang="ts">
	import type { Dataset } from '$lib/utils/vizAnalyzer';

	let { dataset, maxRows = 200 }: { dataset: Dataset; maxRows?: number } = $props();

	const columns = $derived(dataset.fields.map((f) => f.name));
	const rows = $derived(dataset.rows.slice(0, maxRows));

	function cell(v: unknown): string {
		if (v === undefined || v === null) return '—';
		return String(v);
	}
</script>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				{#each columns as c}<th>{c}</th>{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row}
				<tr>
					{#each columns as c}
						<td class:num={typeof row[c] === 'number'}>{cell(row[c])}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if dataset.rows.length > maxRows}
		<div class="truncated">Showing first {maxRows} of {dataset.rows.length} rows</div>
	{/if}
</div>

<style>
	.table-wrap {
		overflow: auto;
		max-height: 480px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	th {
		position: sticky;
		top: 0;
		background: var(--color-surface);
		color: var(--color-text-muted);
		text-align: left;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		font-weight: 600;
		white-space: nowrap;
	}

	td {
		padding: 0.4rem 0.75rem;
		border-bottom: 1px solid var(--chart-grid);
		color: var(--color-text);
		max-width: 240px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	td.num {
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.truncated {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
</style>
