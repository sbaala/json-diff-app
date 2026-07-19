import { describe, expect, it } from 'vitest';
import { extractDatasets, suggestCharts } from './vizAnalyzer';
import { prepareChart } from './vizPrep';

const sales = [
	{ month: '2026-01', region: 'North', revenue: 100, units: 10 },
	{ month: '2026-01', region: 'South', revenue: 200, units: 20 },
	{ month: '2026-02', region: 'North', revenue: 150, units: 15 },
	{ month: '2026-02', region: 'South', revenue: 250, units: 25 }
];

describe('extractDatasets', () => {
	it('finds a root array of objects', () => {
		const ds = extractDatasets(sales);
		expect(ds).toHaveLength(1);
		expect(ds[0].rows).toHaveLength(4);
		const kinds = Object.fromEntries(ds[0].fields.map((f) => [f.name, f.kind]));
		expect(kinds).toEqual({
			month: 'temporal',
			region: 'category',
			revenue: 'number',
			units: 'number'
		});
	});

	it('finds nested arrays and key/value metric objects', () => {
		const json = {
			metrics: { revenue: 5, users: 10 },
			data: { items: sales }
		};
		const ds = extractDatasets(json);
		const paths = ds.map((d) => d.path);
		expect(paths).toContain('$.metrics');
		expect(paths).toContain('$.data.items');
	});

	it('handles arrays of numbers', () => {
		const ds = extractDatasets({ readings: [1, 5, 3, 8, 2] });
		expect(ds).toHaveLength(1);
		expect(ds[0].fields.find((f) => f.name === 'value')?.kind).toBe('number');
	});

	it('treats numeric strings as numbers', () => {
		const ds = extractDatasets([
			{ name: 'a', score: '12' },
			{ name: 'b', score: '9' }
		]);
		expect(ds[0].fields.find((f) => f.name === 'score')?.kind).toBe('number');
	});

	it('flattens one level of nested objects', () => {
		const ds = extractDatasets([
			{ name: 'a', stats: { wins: 3 } },
			{ name: 'b', stats: { wins: 5 } }
		]);
		expect(ds[0].fields.map((f) => f.name)).toContain('stats.wins');
	});

	it('returns nothing for unchartable JSON', () => {
		expect(extractDatasets({ a: 'x' })).toHaveLength(0);
		expect(extractDatasets('hello')).toHaveLength(0);
	});
});

describe('suggestCharts', () => {
	it('suggests line for temporal data and bar for categorical', () => {
		const [ds] = extractDatasets(sales);
		const types = suggestCharts(ds).map((s) => s.type);
		expect(types).toContain('line');
		expect(types).toContain('bar');
		expect(types).toContain('table');
	});

	it('suggests kpi tiles for small metric objects', () => {
		const [ds] = extractDatasets({ revenue: 5, users: 10, churn: 1 });
		expect(suggestCharts(ds).map((s) => s.type)).toContain('kpi');
	});

	it('ranks suggestions by score descending', () => {
		const [ds] = extractDatasets(sales);
		const scores = suggestCharts(ds).map((s) => s.score);
		expect(scores).toEqual([...scores].sort((a, b) => b - a));
	});
});

describe('prepareChart', () => {
	it('aggregates duplicate categories by sum for bars', () => {
		const [ds] = extractDatasets(sales);
		const p = prepareChart('bar', ds, { x: 'region', y: ['revenue'] });
		expect(p.kind).toBe('bar');
		if (p.kind === 'bar') {
			expect(p.data.categories).toEqual(['North', 'South']);
			expect(p.data.series[0].values).toEqual([250, 450]);
		}
	});

	it('pivots a series field into stacked series', () => {
		const [ds] = extractDatasets(sales);
		const p = prepareChart('stacked-bar', ds, { x: 'month', y: ['revenue'], series: 'region' });
		if (p.kind === 'bar') {
			expect(p.data.series.map((s) => s.name)).toEqual(['North', 'South']);
			expect(p.data.stacked).toBe(true);
		} else {
			expect.fail('expected bar data');
		}
	});

	it('builds sorted time series for line charts', () => {
		const [ds] = extractDatasets(sales);
		const p = prepareChart('line', ds, { x: 'month', y: ['revenue'] });
		if (p.kind === 'line') {
			const xs = p.data.series[0].points.map((pt) => pt.x);
			expect(xs).toEqual([...xs].sort((a, b) => a - b));
			expect(p.data.xIsTime).toBe(true);
		} else {
			expect.fail('expected line data');
		}
	});

	it('builds a heatmap matrix with sums and extent', () => {
		const [ds] = extractDatasets(sales);
		const p = prepareChart('heatmap', ds, { x: 'month', y: ['revenue'], series: 'region' });
		if (p.kind === 'heatmap') {
			expect(p.data.xCats).toEqual(['2026-01', '2026-02']);
			expect(p.data.yCats).toEqual(['North', 'South']);
			expect(p.data.matrix[0][0]).toBe(100);
			expect(p.data.min).toBe(100);
			expect(p.data.max).toBe(250);
		} else {
			expect.fail('expected heatmap data');
		}
	});

	it('bins numeric values into a histogram', () => {
		const rows = Array.from({ length: 50 }, (_, i) => ({ v: i }));
		const [ds] = extractDatasets(rows);
		const p = prepareChart('histogram', ds, { y: ['v'] });
		if (p.kind === 'bar') {
			const total = p.data.series[0].values.reduce((a, b) => a + b, 0);
			expect(total).toBe(50);
		} else {
			expect.fail('expected binned bar data');
		}
	});

	it('folds treemap tail into Other beyond 8 slots', () => {
		const rows = Array.from({ length: 12 }, (_, i) => ({ cat: `c${i}`, v: 100 - i }));
		const [ds] = extractDatasets(rows);
		const p = prepareChart('treemap', ds, { x: 'cat', y: ['v'] });
		if (p.kind === 'treemap') {
			expect(p.data.items).toHaveLength(8);
			expect(p.data.items[7].label).toBe('Other');
		} else {
			expect.fail('expected treemap data');
		}
	});

	it('returns a friendly error instead of throwing', () => {
		const [ds] = extractDatasets(sales);
		const p = prepareChart('bar', ds, { y: [] });
		expect(p.kind).toBe('error');
	});
});
