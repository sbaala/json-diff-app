<script lang="ts">
	import { formatNumber, linearScale } from '$lib/utils/vizScales';
	import type { ScatterData } from '$lib/utils/vizPrep';
	import ChartLegend from './ChartLegend.svelte';

	let { data, height = 380 }: { data: ScatterData; height?: number } = $props();

	let width = $state(640);
	let tooltip = $state<{ x: number; y: number; lines: string[] } | null>(null);

	const PAD = { top: 18, right: 20, bottom: 44, left: 60 };

	const plot = $derived({
		x: PAD.left,
		y: PAD.top,
		w: Math.max(width - PAD.left - PAD.right, 50),
		h: Math.max(height - PAD.top - PAD.bottom, 50)
	});

	const xScale = $derived.by(() => {
		const xs = data.points.map((p) => p.x);
		return linearScale(Math.min(...xs), Math.max(...xs), plot.x, plot.x + plot.w);
	});
	const yScale = $derived.by(() => {
		const ys = data.points.map((p) => p.y);
		return linearScale(Math.min(...ys), Math.max(...ys), plot.y + plot.h, plot.y);
	});

	function showTip(e: MouseEvent, p: (typeof data.points)[number]) {
		const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();
		const lines = [
			...(p.label ? [p.label] : []),
			`${data.xLabel}: ${formatNumber(p.x)}`,
			`${data.yLabel}: ${formatNumber(p.y)}`
		];
		if (data.seriesNames.length > 1) lines.unshift(data.seriesNames[p.seriesIdx] ?? '');
		tooltip = { x: e.clientX - rect.left, y: e.clientY - rect.top, lines };
	}
</script>

<div class="chart-root">
	<ChartLegend names={data.seriesNames} shape="dot" />
	<div class="plot-wrap" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-label="Scatter plot of {data.yLabel} vs {data.xLabel}">
			{#each yScale.ticks as t}
				<line x1={plot.x} y1={yScale(t)} x2={plot.x + plot.w} y2={yScale(t)} class="grid" />
				<text x={plot.x - 8} y={yScale(t) + 3.5} text-anchor="end" class="tick">{formatNumber(t)}</text>
			{/each}
			{#each xScale.ticks as t}
				<line x1={xScale(t)} y1={plot.y} x2={xScale(t)} y2={plot.y + plot.h} class="grid" />
				<text x={xScale(t)} y={plot.y + plot.h + 16} text-anchor="middle" class="tick">{formatNumber(t)}</text>
			{/each}

			<text x={plot.x + plot.w / 2} y={height - 4} text-anchor="middle" class="axis-label">{data.xLabel}</text>
			<text x={12} y={plot.y + plot.h / 2} text-anchor="middle" class="axis-label" transform="rotate(-90 12 {plot.y + plot.h / 2})">{data.yLabel}</text>

			{#each data.points as p}
				<circle
					cx={xScale(p.x)}
					cy={yScale(p.y)}
					r="4.5"
					fill="var(--chart-{(p.seriesIdx % 8) + 1})"
					fill-opacity="0.8"
					stroke="var(--color-surface)"
					stroke-width="1"
					class="pt"
					role="presentation"
					onmousemove={(e) => showTip(e, p)}
					onmouseleave={() => (tooltip = null)}
				/>
			{/each}
		</svg>

		{#if tooltip}
			<div class="tooltip" style="left: {tooltip.x + 12}px; top: {tooltip.y - 10}px">
				{#each tooltip.lines as line, i}
					<div class:tooltip-title={i === 0}>{line}</div>
				{/each}
			</div>
		{/if}
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

	.grid {
		stroke: var(--chart-grid);
		stroke-width: 1;
	}

	.tick {
		fill: var(--color-text-muted);
		font-size: 11px;
	}

	.axis-label {
		fill: var(--color-text-muted);
		font-size: 11px;
		font-weight: 600;
	}

	.pt {
		cursor: pointer;
	}

	.pt:hover {
		stroke-width: 2;
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

	.tooltip-title {
		font-weight: 600;
	}
</style>
