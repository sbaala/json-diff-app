<script lang="ts">
	import { formatNumber, truncate } from '$lib/utils/vizScales';
	import type { TreemapData } from '$lib/utils/vizPrep';

	let { data, height = 380 }: { data: TreemapData; height?: number } = $props();

	let width = $state(640);
	let tooltip = $state<{ x: number; y: number; lines: string[] } | null>(null);

	interface Cell {
		x: number;
		y: number;
		w: number;
		h: number;
		label: string;
		value: number;
		idx: number;
	}

	// Squarified treemap layout (Bruls et al.) — keeps cells near square.
	const cells = $derived.by(() => {
		const total = data.items.reduce((s, i) => s + i.value, 0);
		const W = Math.max(width, 50);
		const H = Math.max(height, 50);
		const scaled = data.items.map((it, idx) => ({ ...it, idx, area: (it.value / total) * W * H }));

		const out: Cell[] = [];
		let x = 0, y = 0, w = W, h = H;
		let row: typeof scaled = [];
		let i = 0;

		const worst = (r: typeof scaled, len: number) => {
			const sum = r.reduce((s, c) => s + c.area, 0);
			const s2 = sum * sum;
			const l2 = len * len;
			let max = 0;
			for (const c of r) max = Math.max(max, (l2 * c.area) / s2, s2 / (l2 * c.area));
			return max;
		};

		const layoutRow = (r: typeof scaled) => {
			const sum = r.reduce((s, c) => s + c.area, 0);
			const horiz = w >= h; // lay the row along the shorter side
			const len = horiz ? h : w;
			const thickness = sum / len;
			let offset = 0;
			for (const c of r) {
				const cellLen = c.area / thickness;
				if (horiz) out.push({ x, y: y + offset, w: thickness, h: cellLen, label: c.label, value: c.value, idx: c.idx });
				else out.push({ x: x + offset, y, w: cellLen, h: thickness, label: c.label, value: c.value, idx: c.idx });
				offset += cellLen;
			}
			if (horiz) {
				x += thickness;
				w -= thickness;
			} else {
				y += thickness;
				h -= thickness;
			}
		};

		while (i < scaled.length) {
			const len = Math.min(w, h);
			const next = scaled[i];
			if (row.length === 0 || worst([...row, next], len) <= worst(row, len)) {
				row.push(next);
				i++;
			} else {
				layoutRow(row);
				row = [];
			}
		}
		if (row.length > 0) layoutRow(row);
		return out;
	});

	const total = $derived(data.items.reduce((s, i) => s + i.value, 0));

	function showTip(e: MouseEvent, c: Cell) {
		const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();
		tooltip = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
			lines: [c.label, `${data.valueLabel}: ${formatNumber(c.value)}`, `${((c.value / total) * 100).toFixed(1)}% of total`]
		};
	}
</script>

<div class="chart-root">
	<div class="plot-wrap" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-label="Treemap of {data.valueLabel}">
			{#each cells as c}
				<rect
					x={c.x + 1}
					y={c.y + 1}
					width={Math.max(c.w - 2, 1)}
					height={Math.max(c.h - 2, 1)}
					rx="4"
					fill="var(--chart-{(c.idx % 8) + 1})"
					fill-opacity="0.85"
					class="cell"
					role="presentation"
					onmousemove={(e) => showTip(e, c)}
					onmouseleave={() => (tooltip = null)}
				/>
				{#if c.w > 70 && c.h > 36}
					<text x={c.x + 9} y={c.y + 20} class="cell-label">{truncate(c.label, Math.floor(c.w / 8))}</text>
					<text x={c.x + 9} y={c.y + 36} class="cell-value">{formatNumber(c.value)} · {((c.value / total) * 100).toFixed(0)}%</text>
				{/if}
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

	.cell:hover {
		fill-opacity: 1;
	}

	.cell-label {
		fill: #fff;
		font-size: 12px;
		font-weight: 600;
		pointer-events: none;
		paint-order: stroke;
		stroke: rgba(0, 0, 0, 0.35);
		stroke-width: 2px;
	}

	.cell-value {
		fill: #fff;
		font-size: 11px;
		pointer-events: none;
		paint-order: stroke;
		stroke: rgba(0, 0, 0, 0.35);
		stroke-width: 2px;
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
