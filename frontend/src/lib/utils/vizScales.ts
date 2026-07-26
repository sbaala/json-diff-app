/**
 * Scale & formatting helpers for the SVG chart components.
 * Zero-dependency equivalents of the d3-scale bits the charts need.
 */

export interface LinearScale {
	(value: number): number;
	domain: [number, number];
	ticks: number[];
}

/** Nice tick values covering [min, max] (roughly `count` ticks). */
export function niceTicks(min: number, max: number, count = 5): number[] {
	if (min === max) {
		if (min === 0) return [0, 1];
		min = min > 0 ? 0 : min * 2;
		max = max > 0 ? max * 2 : 0;
	}
	const span = max - min;
	const step = Math.pow(10, Math.floor(Math.log10(span / count)));
	const err = (count * step) / span;
	let niceStep = step;
	if (err <= 0.15) niceStep = step * 10;
	else if (err <= 0.35) niceStep = step * 5;
	else if (err <= 0.75) niceStep = step * 2;
	const start = Math.ceil(min / niceStep) * niceStep;
	const ticks: number[] = [];
	for (let v = start; v <= max + niceStep * 1e-9; v += niceStep) {
		ticks.push(Math.abs(v) < niceStep * 1e-9 ? 0 : +v.toPrecision(12));
	}
	return ticks;
}

/** Linear scale mapping [d0,d1] → [r0,r1], domain padded to nice ticks. */
export function linearScale(
	d0: number,
	d1: number,
	r0: number,
	r1: number,
	nice = true
): LinearScale {
	let ticks = niceTicks(d0, d1);
	if (nice && ticks.length >= 2) {
		d0 = Math.min(d0, ticks[0]);
		d1 = Math.max(d1, ticks[ticks.length - 1]);
		ticks = ticks.filter((t) => t >= d0 && t <= d1);
	}
	const span = d1 - d0 || 1;
	const fn = ((v: number) => r0 + ((v - d0) / span) * (r1 - r0)) as LinearScale;
	fn.domain = [d0, d1];
	fn.ticks = ticks;
	return fn;
}

export interface BandScale {
	(key: string): number;
	bandwidth: number;
	domain: string[];
	step: number;
}

/** Band scale for categorical axes. */
export function bandScale(
	domain: string[],
	r0: number,
	r1: number,
	paddingRatio = 0.25
): BandScale {
	const n = Math.max(domain.length, 1);
	const step = (r1 - r0) / n;
	const bandwidth = step * (1 - paddingRatio);
	const offset = (step - bandwidth) / 2;
	const index = new Map(domain.map((d, i) => [d, i]));
	const fn = ((key: string) => r0 + (index.get(key) ?? 0) * step + offset) as BandScale;
	fn.bandwidth = bandwidth;
	fn.domain = domain;
	fn.step = step;
	return fn;
}

/** Compact number formatting for axis ticks and labels (1.2k, 3.4M …). */
export function formatNumber(v: number): string {
	if (!isFinite(v)) return String(v);
	const abs = Math.abs(v);
	if (abs >= 1e9) return trimZeros(v / 1e9) + 'B';
	if (abs >= 1e6) return trimZeros(v / 1e6) + 'M';
	if (abs >= 1e3) return trimZeros(v / 1e3) + 'k';
	if (abs > 0 && abs < 0.01) return v.toExponential(1);
	return trimZeros(v);
}

function trimZeros(v: number): string {
	return String(+v.toFixed(2));
}

/** Truncate long tick labels. */
export function truncate(s: string, max = 14): string {
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** Format a temporal value (epoch ms) for axis labels, span-aware. */
export function formatDate(ms: number, spanMs: number): string {
	const d = new Date(ms);
	if (spanMs > 2.5 * 365 * 86400e3) return String(d.getFullYear());
	if (spanMs > 60 * 86400e3)
		return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
	if (spanMs > 3 * 86400e3)
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
