import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import SideBySideDiff from './SideBySideDiff.svelte';
import { computeInlineDiff } from '../utils/jsonDiff';

function panelRows(container: HTMLElement, side: 'left' | 'right') {
	return Array.from(container.querySelectorAll(`.diff-panel.${side} .row`));
}

function codeText(row: Element): string {
	return row.querySelector('.code')?.textContent ?? '';
}

describe('SideBySideDiff', () => {
	it('aligns both panels row-for-row and pairs a changed primitive on one row', () => {
		const diff = computeInlineDiff({ a: 1, b: { x: 1 }, c: 3 }, { a: 2, b: { x: 1 }, d: 4 });
		const { container } = render(SideBySideDiff, { props: { diffResult: diff } });

		const left = panelRows(container, 'left');
		const right = panelRows(container, 'right');
		expect(left.length).toBe(right.length);
		expect(left.length).toBe(8);

		// "a" changed: removed on the left and added on the right share a row
		const aRow = left.findIndex((r) => codeText(r).includes('"a": 1'));
		expect(codeText(right[aRow])).toContain('"a": 2');
		expect(left[aRow].classList.contains('removed')).toBe(true);
		expect(right[aRow].classList.contains('added')).toBe(true);

		// "c" only exists on the left: right side is an empty, unnumbered cell
		const cRow = left.findIndex((r) => codeText(r).includes('"c": 3'));
		expect(right[cRow].classList.contains('empty')).toBe(true);
		expect(right[cRow].querySelector('.num')?.textContent).toBe('');

		// "d" only exists on the right
		const dRow = right.findIndex((r) => codeText(r).includes('"d": 4'));
		expect(left[dRow].classList.contains('empty')).toBe(true);

		// Two hunks: the "a" change, and the adjacent c/d rows
		expect(container.querySelector('.diff-counter')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'1 of 2'
		);
	});

	it('adds trailing commas between siblings only', () => {
		const value = { a: 1, b: { x: 1 } };
		const diff = computeInlineDiff(value, value);
		const { container } = render(SideBySideDiff, { props: { diffResult: diff } });

		expect(panelRows(container, 'left').map(codeText)).toEqual([
			'{',
			'  "a": 1,',
			'  "b": {',
			'    "x": 1',
			'  }',
			'}'
		]);
	});

	it('renders only a window of rows for large diffs and pads the rest', () => {
		const big = Object.fromEntries(Array.from({ length: 20000 }, (_, i) => [`k${i}`, i]));
		const diff = computeInlineDiff(big, { ...big, k5: -1 });
		const { container } = render(SideBySideDiff, { props: { diffResult: diff } });

		const rendered = panelRows(container, 'left').length;
		expect(rendered).toBeGreaterThan(0);
		expect(rendered).toBeLessThan(200);

		const rows = container.querySelector<HTMLElement>('.diff-panel.left .rows');
		const padBottom = parseInt(rows?.style.paddingBottom ?? '0', 10);
		// The k5 change is a removed+added pair sharing one row, so rows = lines - 1;
		// everything outside the rendered window is padding
		const totalRows = diff.lines.length - 1;
		expect(padBottom).toBe((totalRows - rendered) * 22);
	});
});
