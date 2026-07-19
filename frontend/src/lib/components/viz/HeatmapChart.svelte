<script lang="ts">
	import { formatNumber, truncate } from '$lib/utils/vizScales';
	import type { HeatmapData } from '$lib/utils/vizPrep';

	let { data, height = 380 }: { data: HeatmapData; height?: number } = $props();

	let width = $state(640);
	let tooltip = $state<{ x: number; y: number; lines: string[] } | null>(null);

	const PAD = { top: 10, right: 16, bottom: 60, left: 110 };

	const plot = $derived({
		x: PAD.left,
		y: PAD.top,
		w: Math.max(width - PAD.left - PAD.right, 50),
		h: Math.max(height - PAD.top - PAD.bottom, 50)
	});

	const cellW = $derived(plot.w / data.xCats.length);
	const cellH = $derived(plot.h / data.yCats.length);
	const showCellText = $derived(cellW > 44 && cellH > 22);

	// Sequential ramp: single hue (--chart-1) composited over the surface via
	// opacity — magnitude reads as more-is-more-saturated on every theme.
	function alpha(v: number): number {
		const span = data.max - data.min || 1;
		return 0.12 + 0.83 * ((v - data.min) / span);
	}

	function showTip(e: MouseEvent, xi: number, yi: number, v: number) {
		const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();
		tooltip = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
			lines: [
				`${data.xLabel}: ${data.xCats[xi]}`,
				`${data.yLabel}: ${data.yCats[yi]}`,
				`${data.valueLabel}: ${formatNumber(v)}`
			]
		};
	}
</script>

<div class="chart-root">
	<div class="plot-wrap" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-label="Heatmap of {data.valueLabel} by {data.xLabel} and {data.yLabel}">
			{#each data.yCats as yc, yi}
				<text x={plot.x - 8} y={plot.y + yi * cellH + cellH / 2 + 3.5} text-anchor="end" class="tick">
					{truncate(yc, 15)}
				</text>
				{#each data.xCats as xc, xi}
					{@const v = data.matrix[yi]?.[xi]}
					{#if v !== null && v !== undefined}
						<rect
							x={plot.x + xi * cellW + 1}
							y={plot.y + yi * cellH + 1}
							width={Math.max(cellW - 2, 1)}
							height={Math.max(cellH - 2, 1)}
							rx="3"
							fill="var(--chart-1)"
							fill-opacity={alpha(v)}
							class="cell"
							role="presentation"
							onmousemove={(e) => showTip(e, xi, yi, v)}
							onmouseleave={() => (tooltip = null)}
						/>
						{#if showCellText}
							<text
								x={plot.x + xi * cellW + cellW / 2}
								y={plot.y + yi * cellH + cellH / 2 + 3.5}
								text-anchor="middle"
								class="cell-text"
							>
								{formatNumber(v)}
							</text>
						{/if}
					{:else}
						<rect
							x={plot.x + xi * cellW + 1}
							y={plot.y + yi * cellH + 1}
							width={Math.max(cellW - 2, 1)}
							height={Math.max(cellH - 2, 1)}
							rx="3"
							fill="var(--chart-grid)"
						/>
					{/if}
				{/each}
			{/each}

			{#each data.xCats as xc, xi}
				<text
					x={plot.x + xi * cellW + cellW / 2}
					y={plot.y + plot.h + 14}
					text-anchor="end"
					class="tick"
					transform="rotate(-30 {plot.x + xi * cellW + cellW / 2} {plot.y + plot.h + 14})"
				>
					{truncate(xc, 12)}
				</text>
			{/each}
		</svg>

		{#if tooltip}
			<div class="tooltip" style="left: {tooltip.x + 12}px; top: {tooltip.y - 10}px">
				{#each tooltip.lines as line}<div>{line}</div>{/each}
			</div>
		{/if}
	</div>

	<div class="ramp-legend">
		<span class="tick-text">{formatNumber(data.min)}</span>
		<span class="ramp"></span>
		<span class="tick-text">{formatNumber(data.max)}</span>
		<span class="ramp-label">{data.valueLabel}</span>
	</div>
</div>

<style>
	.chart-root {
		width: 100%;
	}

	.plot-wrap {
		position: relative;
		width: 100%;
	}

	.tick {
		fill: var(--color-text-muted);
		font-size: 11px;
	}

	.cell:hover {
		stroke: var(--color-text);
		stroke-width: 1.5;
	}

	.cell-text {
		fill: var(--color-text);
		font-size: 10px;
		pointer-events: none;
	}

	.ramp-legend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.25rem 0;
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.ramp {
		width: 120px;
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(
			to right,
			color-mix(in srgb, var(--chart-1) 12%, transparent),
			var(--chart-1)
		);
	}

	.ramp-label {
		margin-left: 0.5rem;
		font-weight: 600;
	}

	.tick-text {
		font-variant-numeric: tabular-nums;
	}

	.tooltip {
		position: absolute;
		pointer-events: none;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		font-size: 0.75rem;
		color: var(--color-text);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
		white-space: nowrap;
		z-index: 5;
	}
</style>
