import { describe, it, expect } from 'vitest';
import {
	buildGrid,
	getCell,
	parseFilter,
	compareCells,
	resolvePath,
	toCsv,
	formatCell
} from './gridModel';

const team = [
	{ name: 'Alice', role: 'CEO', pay: { base: 10 } },
	{ name: 'Bob', role: 'CTO', age: 40 },
	'stray'
];

describe('buildGrid', () => {
	it('spreads object rows into columns with a value column for the rest', () => {
		const m = buildGrid(team);
		expect(m.kind).toBe('array');
		expect(m.keyed).toBe(true);
		expect(m.columns.map((c) => c.label)).toEqual(['name', 'role', 'pay', 'age', '(value)']);
		const value = m.columns.at(-1)!;
		expect(getCell(m, m.rows[0], value)).toBeUndefined();
		expect(getCell(m, m.rows[2], value)).toBe('stray');
	});

	it('flattens nested objects to dotted columns', () => {
		const m = buildGrid(team, true);
		const pay = m.columns.find((c) => c.label === 'pay.base')!;
		expect(getCell(m, m.rows[0], pay)).toBe(10);
		expect(getCell(m, m.rows[1], pay)).toBeUndefined();
	});

	it('uses key/value rows for objects of primitives', () => {
		const m = buildGrid({ city: 'SF', lat: 1 });
		expect(m.keyed).toBe(false);
		expect(m.rows.map((r) => r.key)).toEqual(['city', 'lat']);
		expect(m.columns.map((c) => c.label)).toEqual(['value']);
	});

	it('uses object keys as row keys for maps of records', () => {
		const m = buildGrid({ a: { x: 1 }, b: { x: 2, y: 3 } });
		expect(m.kind).toBe('object');
		expect(m.columns.map((c) => c.label)).toEqual(['x', 'y']);
	});
});

describe('parseFilter', () => {
	const f = (s: string) => parseFilter(s)!;
	it('matches contains, exact and negation', () => {
		expect(f('li')('Alice')).toBe(true);
		expect(f('=alice')('Alice')).toBe(true);
		expect(f('=ali')('Alice')).toBe(false);
		expect(f('!ali')('Alice')).toBe(false);
		expect(f('!=bob')('Alice')).toBe(true);
		expect(f('=')(undefined)).toBe(true);
		expect(parseFilter('  ')).toBeNull();
	});

	it('compares numbers and text', () => {
		expect(f('>10')(29.99)).toBe(true);
		expect(f('<=10')('9')).toBe(true);
		expect(f('>10')('abc')).toBe(false);
		expect(f('>2026-01')('2026-03-04T10:30:00Z')).toBe(true);
		expect(f('>2026-01')(null)).toBe(false);
	});
});

describe('helpers', () => {
	it('sorts empties last and numbers numerically', () => {
		expect([3, null, 10, 2].sort(compareCells)).toEqual([2, 3, 10, null]);
		expect(['a10', 'a9'].sort(compareCells)).toEqual(['a9', 'a10']);
	});

	it('resolves paths through objects and arrays', () => {
		const data = { products: [{ id: 'x' }] };
		expect(resolvePath(data, ['products', '0', 'id'])).toEqual({ found: true, value: 'x' });
		expect(resolvePath(data, ['products', '5']).found).toBe(false);
		expect(resolvePath(data, ['toString']).found).toBe(false);
	});

	it('exports CSV with escaping', () => {
		const m = buildGrid([{ a: 'x,y', b: { c: 1 } }]);
		expect(toCsv(m, [0], m.columns)).toBe('#,a,b\n0,"x,y","{""c"":1}"');
	});

	it('formats nested previews', () => {
		expect(formatCell([1, 2])).toBe('[2 items]');
		expect(formatCell({ a: 1 })).toBe('{1 key}');
		expect(formatCell(undefined)).toBe('');
	});
});
