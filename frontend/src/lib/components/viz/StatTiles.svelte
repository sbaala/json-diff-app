<script lang="ts">
	import { formatNumber } from '$lib/utils/vizScales';
	import type { KpiData } from '$lib/utils/vizPrep';

	let { data }: { data: KpiData } = $props();
</script>

<div class="kpi-row">
	{#each data.items as item}
		<div class="tile">
			<div class="tile-label" title={item.label}>{item.label}</div>
			<div class="tile-value">{formatNumber(item.value)}</div>
		</div>
	{/each}
</div>

<style>
	.kpi-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

	.tile {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1rem;
	}

	.tile-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-bottom: 0.35rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tile-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.1;
	}
</style>
