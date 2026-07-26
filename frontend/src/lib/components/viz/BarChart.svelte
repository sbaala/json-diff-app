<script lang="ts">
	import { bandScale, formatNumber, linearScale, truncate } from '$lib/utils/vizScales';
	import type { BarData as Data } from '$lib/utils/vizPrep';
	import ChartLegend from './ChartLegend.svelte';

	let { data, height = 380 }: { data: Data; height?: number } = $props();

	let width = $state(640);
	let tooltip = $state<{ x: number; y: number; title: string; lines: string[] } | null>(null);

	const PAD = { top: 18, right: 16, bottom: 46, left: 56 };
	const HPAD = { top: 12, right: 40, bottom: 34, left: 120 };

	const plot = $derived.by(() => {
		const p = data.horizontal ? HPAD : PAD;
		return { x: p.left, y: p.top, w: Math.max(width - p.left - p.right, 50), h: Math.max(height - p.top - p.bottom, 50) };
	});

	// Value extent across series (stacked → per-category totals)
	const extent = $derived.by(() => {
		let min = 0;
		let max = 0;
		if (data.stacked) {
			data.categories.forEach((_, ci) => {
				let pos = 0;
				let neg = 0;
				for (const s of data.series) {
					const v = s.values[ci] ?? 0;
					if (v >= 0) pos += v;
					else neg += v;
				}
				max = Math.max(max, pos);
				min = Math.min(min, neg);
			});
		} else {
			for (const s of data.series) {
				for (const v of s.values) {
					max = Math.max(max, v);
					min = Math.min(min, v);
				}
			}
		}
		return { min, max: max === min ? min + 1 : max };
	});

	const vScale = $derived(
		data.horizontal
			? linearScale(extent.min, extent.max, plot.x, plot.x + plot.w)
			: linearScale(extent.min, extent.max, plot.y + plot.h, plot.y)
	);
	const cScale = $derived(
		data.horizontal
			? bandScale(data.categories, plot.y, plot.y + plot.h, 0.3)
			: bandScale(data.categories, plot.x, plot.x + plot.w, 0.3)
	);
	const grouped = $derived(!data.stacked && data.series.length > 1);
	const innerStep = $derived(cScale.bandwidth / (grouped ? data.series.length : 1));

	const totalBars = $derived(data.categories.length * data.series.length);
	const showValueLabels = $derived(!data.stacked && totalBars <= 12);
	const rotateTicks = $derived(!data.horizontal && data.categories.length > 8);

	interface BarRect {
		x: number; y: number; w: number; h: number;
		si: number; ci: number; value: number; roundEnd: boolean;
	}

	const bars = $derived.by(() => {
		const out: BarRect[] = [];
		const zero = vScale(0);
		data.categories.forEach((_, ci) => {
			let posBase = 0;
			let negBase = 0;
			data.series.forEach((s, si) => {
				const v = s.values[ci] ?? 0;
				const c0 = cScale(data.categories[ci]);
				if (data.horizontal) {
					const y = c0 + (grouped ? si * innerStep : 0);
					const h = grouped ? Math.max(innerStep - 2, 1) : cScale.bandwidth;
					let x0: number, x1: number;
					if (data.stacked) {
						const base = v >= 0 ? posBase : negBase;
						x0 = vScale(base);
						x1 = vScale(base + v);
						if (v >= 0) posBase += v; else negBase += v;
					} else {
						x0 = zero;
						x1 = vScale(v);
					}
					const gap = data.stacked && si > 0 ? 1 : 0;
					out.push({
						x: Math.min(x0, x1) + gap, y, w: Math.max(Math.abs(x1 - x0) - gap, 0), h,
						si, ci, value: v, roundEnd: !data.stacked || si === data.series.length - 1
					});
				} else {
					const x = c0 + (grouped ? si * innerStep : 0);
					const w = grouped ? Math.max(innerStep - 2, 1) : cScale.bandwidth;
					let y0: number, y1: number;
					if (data.stacked) {
						const base = v >= 0 ? posBase : negBase;
						y0 = vScale(base);
						y1 = vScale(base + v);
						if (v >= 0) posBase += v; else negBase += v;
					} else {
						y0 = zero;
						y1 = vScale(v);
					}
					const gap = data.stacked && si > 0 ? 1 : 0;
					out.push({
						x, y: Math.min(y0, y1) + gap, w, h: Math.max(Math.abs(y1 - y0) - gap, 0),
						si, ci, value: v, roundEnd: !data.stacked || si === data.series.length - 1
					});
				}
			});
		});
		return out;
	});

	// Rounded corners at the data end only (4px), anchored flat at the baseline
	function barPath(b: BarRect): string {
		const r = Math.min(3.5, b.w / 2, b.h / 2);
		if (!b.roundEnd || r <= 0.5) {
			return `M${b.x},${b.y}h${b.w}v${b.h}h${-b.w}Z`;
		}
		if (data.horizontal) {
			// round right end (positive) — good enough for negatives too (rare)
			return `M${b.x},${b.y}h${b.w - r}a${r},${r} 0 0 1 ${r},${r}v${b.h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(b.w - r)}Z`;
		}
		return `M${b.x},${b.y + r}a${r},${r} 0 0 1 ${r},${-r}h${b.w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${b.h - r}h${-b.w}Z`;
	}

	function showTip(e: MouseEvent, b: BarRect) {
		const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();
		tooltip = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
			title: data.categories[b.ci],
			lines: [`${data.series[b.si].name}: ${formatNumber(b.value)}`]
		};
	}
</script>

<div class="chart-root">
	<ChartLegend names={data.series.map((s) => s.name)} />
	<div class="plot-wrap" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-label="Bar chart of {data.yLabel} by {data.xLabel}">
			<!-- gridlines + value axis -->
			{#each vScale.ticks as t}
				{#if data.horizontal}
					<line x1={vScale(t)} y1={plot.y} x2={vScale(t)} y2={plot.y + plot.h} class="grid" />
					<text x={vScale(t)} y={plot.y + plot.h + 16} text-anchor="middle" class="tick">{formatNumber(t)}</text>
				{:else}
					<line x1={plot.x} y1={vScale(t)} x2={plot.x + plot.w} y2={vScale(t)} class="grid" />
					<text x={plot.x - 8} y={vScale(t) + 3.5} text-anchor="end" class="tick">{formatNumber(t)}</text>
				{/if}
			{/each}

			<!-- category axis labels -->
			{#each data.categories as c}
				{#if data.horizontal}
					<text x={plot.x - 8} y={cScale(c) + cScale.bandwidth / 2 + 3.5} text-anchor="end" class="tick">
						{truncate(c, 16)}
					</text>
				{:else if rotateTicks}
					<text
						x={cScale(c) + cScale.bandwidth / 2}
						y={plot.y + plot.h + 12}
						text-anchor="end"
						class="tick"
						transform="rotate(-35 {cScale(c) + cScale.bandwidth / 2} {plot.y + plot.h + 12})"
					>
						{truncate(c, 12)}
					</text>
				{:else}
					<text x={cScale(c) + cScale.bandwidth / 2} y={plot.y + plot.h + 16} text-anchor="middle" class="tick">
						{truncate(c, 12)}
					</text>
				{/if}
			{/each}

			<!-- baseline -->
			{#if data.horizontal}
				<line x1={vScale(0)} y1={plot.y} x2={vScale(0)} y2={plot.y + plot.h} class="axis" />
			{:else}
				<line x1={plot.x} y1={vScale(0)} x2={plot.x + plot.w} y2={vScale(0)} class="axis" />
			{/if}

			<!-- bars -->
			{#each bars as b}
				<path
					d={barPath(b)}
					fill="var(--chart-{(b.si % 8) + 1})"
					class="bar"
					role="presentation"
					onmousemove={(e) => showTip(e, b)}
					onmouseleave={() => (tooltip = null)}
				/>
			{/each}

			<!-- direct value labels for small charts -->
			{#if showValueLabels}
				{#each bars as b}
					{#if data.horizontal}
						<text x={b.x + b.w + 6} y={b.y + b.h / 2 + 3.5} class="value-label">{formatNumber(b.value)}</text>
					{:else}
						<text x={b.x + b.w / 2} y={b.y - 5} text-anchor="middle" class="value-label">{formatNumber(b.value)}</text>
					{/if}
				{/each}
			{/if}
		</svg>

		{#if tooltip}
			<div class="tooltip" style="left: {tooltip.x + 12}px; top: {tooltip.y - 10}px">
				<div class="tooltip-title">{tooltip.title}</div>
				{#each tooltip.lines as line}<div>{line}</div>{/each}
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

	.tick {
		fill: var(--color-text-muted);
		font-size: 11px;
	}

	.value-label {
		fill: var(--color-text);
		font-size: 11px;
		font-weight: 600;
	}

	.bar:hover {
		filter: brightness(1.15);
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
	}
</style>
