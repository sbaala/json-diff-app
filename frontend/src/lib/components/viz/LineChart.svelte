<script lang="ts">
	import { formatDate, formatNumber, linearScale, truncate } from '$lib/utils/vizScales';
	import type { LineData } from '$lib/utils/vizPrep';
	import ChartLegend from './ChartLegend.svelte';

	let { data, height = 380 }: { data: LineData; height?: number } = $props();

	let width = $state(640);
	let hover = $state<{ px: number; x: number; values: { name: string; y: number; py: number; si: number }[] } | null>(null);

	const PAD = { top: 18, right: 20, bottom: 34, left: 56 };

	const plot = $derived({
		x: PAD.left,
		y: PAD.top,
		w: Math.max(width - PAD.left - PAD.right, 50),
		h: Math.max(height - PAD.top - PAD.bottom, 50)
	});

	const allPoints = $derived(data.series.flatMap((s) => s.points));
	const xExtent = $derived.by(() => {
		const xs = allPoints.map((p) => p.x);
		return [Math.min(...xs), Math.max(...xs)] as [number, number];
	});
	const yExtent = $derived.by(() => {
		const ys = allPoints.map((p) => p.y);
		return [Math.min(0, ...ys), Math.max(...ys)] as [number, number];
	});

	const xScale = $derived(linearScale(xExtent[0], xExtent[1], plot.x, plot.x + plot.w, !data.xIsTime));
	const yScale = $derived(linearScale(yExtent[0], yExtent[1], plot.y + plot.h, plot.y));
	const xSpan = $derived(xExtent[1] - xExtent[0] || 1);

	const xTicks = $derived.by(() => {
		if (!data.xIsTime) return xScale.ticks;
		const count = Math.max(3, Math.min(7, Math.floor(plot.w / 90)));
		const step = xSpan / (count - 1);
		return Array.from({ length: count }, (_, i) => xExtent[0] + i * step);
	});

	function fmtX(v: number): string {
		return data.xIsTime ? formatDate(v, xSpan) : formatNumber(v);
	}

	function linePath(points: { x: number; y: number }[]): string {
		return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.x)},${yScale(p.y)}`).join('');
	}

	function areaPath(points: { x: number; y: number }[]): string {
		const zero = yScale(Math.max(0, yExtent[0]));
		return linePath(points) + `L${xScale(points[points.length - 1].x)},${zero}L${xScale(points[0].x)},${zero}Z`;
	}

	function onMove(e: MouseEvent) {
		const svg = (e.currentTarget as SVGElement).getBoundingClientRect();
		const px = e.clientX - svg.left;
		if (px < plot.x || px > plot.x + plot.w) {
			hover = null;
			return;
		}
		// Nearest x across series (they share an x domain)
		const xVal = xExtent[0] + ((px - plot.x) / plot.w) * xSpan;
		const values: NonNullable<typeof hover>['values'] = [];
		let snapX = xVal;
		data.series.forEach((s, si) => {
			if (s.points.length === 0) return;
			let best = s.points[0];
			for (const p of s.points) {
				if (Math.abs(p.x - xVal) < Math.abs(best.x - xVal)) best = p;
			}
			values.push({ name: s.name, y: best.y, py: yScale(best.y), si });
			snapX = best.x;
		});
		if (values.length === 0) {
			hover = null;
			return;
		}
		hover = { px: xScale(snapX), x: snapX, values };
	}
</script>

<div class="chart-root">
	<ChartLegend names={data.series.map((s) => s.name)} shape="line" />
	<div class="plot-wrap" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			role="img"
			aria-label="Line chart of {data.yLabel} over {data.xLabel}"
			onmousemove={onMove}
			onmouseleave={() => (hover = null)}
		>
			{#each yScale.ticks as t}
				<line x1={plot.x} y1={yScale(t)} x2={plot.x + plot.w} y2={yScale(t)} class="grid" />
				<text x={plot.x - 8} y={yScale(t) + 3.5} text-anchor="end" class="tick">{formatNumber(t)}</text>
			{/each}
			{#each xTicks as t}
				<text x={xScale(t)} y={plot.y + plot.h + 18} text-anchor="middle" class="tick">{fmtX(t)}</text>
			{/each}
			<line x1={plot.x} y1={plot.y + plot.h} x2={plot.x + plot.w} y2={plot.y + plot.h} class="axis" />

			{#each data.series as s, si}
				{#if s.points.length > 0}
					{#if data.area && data.series.length === 1}
						<path d={areaPath(s.points)} fill="var(--chart-{(si % 8) + 1})" opacity="0.18" />
					{/if}
					<path d={linePath(s.points)} fill="none" stroke="var(--chart-{(si % 8) + 1})" stroke-width="2" stroke-linejoin="round" />
					{#if s.points.length <= 30}
						{#each s.points as p}
							<circle cx={xScale(p.x)} cy={yScale(p.y)} r="3" fill="var(--chart-{(si % 8) + 1})" stroke="var(--color-surface)" stroke-width="1.5" />
						{/each}
					{/if}
				{/if}
			{/each}

			{#if hover}
				<line x1={hover.px} y1={plot.y} x2={hover.px} y2={plot.y + plot.h} class="crosshair" />
				{#each hover.values as v}
					<circle cx={hover.px} cy={v.py} r="4.5" fill="var(--chart-{(v.si % 8) + 1})" stroke="var(--color-surface)" stroke-width="2" />
				{/each}
			{/if}
		</svg>

		{#if hover}
			<div
				class="tooltip"
				style="left: {hover.px + (hover.px > width - 180 ? -170 : 14)}px; top: {plot.y + 6}px"
			>
				<div class="tooltip-title">{fmtX(hover.x)}</div>
				{#each hover.values as v}
					<div class="tooltip-row">
						<span class="dot" style="background: var(--chart-{(v.si % 8) + 1})"></span>
						{truncate(v.name, 18)}: <strong>{formatNumber(v.y)}</strong>
					</div>
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

	.axis {
		stroke: var(--chart-axis);
		stroke-width: 1;
	}

	.crosshair {
		stroke: var(--chart-axis);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.tick {
		fill: var(--color-text-muted);
		font-size: 11px;
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
		margin-bottom: 0.15rem;
		color: var(--color-text-muted);
	}

	.tooltip-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}
</style>
