<script lang="ts">
	let { names, shape = 'square' }: { names: string[]; shape?: 'square' | 'line' | 'dot' } =
		$props();
</script>

{#if names.length > 1}
	<div class="legend" role="list">
		{#each names as name, i}
			<span class="legend-item" role="listitem">
				{#if shape === 'line'}
					<span class="swatch line" style="background: var(--chart-{(i % 8) + 1})"></span>
				{:else if shape === 'dot'}
					<span class="swatch dot" style="background: var(--chart-{(i % 8) + 1})"></span>
				{:else}
					<span class="swatch" style="background: var(--chart-{(i % 8) + 1})"></span>
				{/if}
				<span class="name">{name}</span>
			</span>
		{/each}
	</div>
{/if}

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		padding: 0.5rem 0.25rem 0;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.swatch.line {
		width: 14px;
		height: 3px;
		border-radius: 2px;
	}

	.swatch.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
	}

	.name {
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
