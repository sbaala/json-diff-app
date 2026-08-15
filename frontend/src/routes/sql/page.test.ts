import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import SqlPage from './+page.svelte';

/** The page's only editable field is the SQL input. */
function sqlBox(): HTMLTextAreaElement {
	return screen.getByPlaceholderText(/INSERT INTO users/i) as HTMLTextAreaElement;
}

function jsonBox(): HTMLTextAreaElement {
	return document.querySelector('#tool-output') as HTMLTextAreaElement;
}

async function type(sql: string) {
	const input = sqlBox();
	await fireEvent.input(input, { target: { value: sql } });
	return input;
}

describe('/sql page', () => {
	it('starts empty with a placeholder result', () => {
		render(SqlPage);
		expect(sqlBox().value).toBe('');
		expect(jsonBox().value).toMatch(/JSON will appear here/i);
	});

	it('converts pasted INSERTs to JSON as they arrive', async () => {
		render(SqlPage);
		await type("INSERT INTO users (id, name) VALUES (1, 'Ada'), (2, 'Grace');");

		expect(JSON.parse(jsonBox().value)).toEqual([
			{ id: 1, name: 'Ada' },
			{ id: 2, name: 'Grace' }
		]);
	});

	it('counts statements, rows and tables', async () => {
		render(SqlPage);
		await type(
			`INSERT INTO users (id) VALUES (1), (2);
			 INSERT INTO orders (id) VALUES (10);`
		);

		const stats = document.querySelector('.stats')?.textContent?.replace(/\s+/g, ' ') ?? '';
		expect(stats).toContain('2 statements');
		expect(stats).toContain('3 rows');
		expect(stats).toContain('2 tables');
	});

	it('renders the rows as a table, with a tab per table', async () => {
		render(SqlPage);
		await type(
			`INSERT INTO users (id, name) VALUES (1, 'Ada');
			 INSERT INTO orders (id, total) VALUES (10, 42.5);`
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Table' }));

		const tabs = screen.getAllByRole('tab');
		expect(tabs.map((tab) => tab.textContent?.trim().split(/\s+/)[0])).toEqual([
			'users',
			'orders'
		]);

		// The first table is shown by default.
		expect(screen.getByRole('columnheader', { name: 'name' })).toBeTruthy();
		expect(screen.getByRole('cell', { name: 'Ada' })).toBeTruthy();

		// Switching tabs swaps the columns and rows.
		await fireEvent.click(tabs[1]);
		expect(screen.getByRole('columnheader', { name: 'total' })).toBeTruthy();
		expect(screen.getByRole('cell', { name: '42.5' })).toBeTruthy();
	});

	it('reports parse issues with their line numbers', async () => {
		render(SqlPage);
		await type('CREATE TABLE t (a INT);\nINSERT INTO t (a) VALUES (1);');

		expect(screen.getByText(/Skipped a non-INSERT statement/)).toBeTruthy();
		expect(screen.getByText('line 1')).toBeTruthy();
		// The valid statement still converts.
		expect(JSON.parse(jsonBox().value)).toEqual([{ a: 1 }]);
	});

	it('honours the value options', async () => {
		render(SqlPage);
		await type("INSERT INTO t (a, b) VALUES (1, NULL);");

		await fireEvent.click(screen.getByLabelText(/Typed values/i));
		expect(JSON.parse(jsonBox().value)).toEqual([{ a: '1', b: null }]);

		await fireEvent.change(screen.getByLabelText('NULL / DEFAULT'), {
			target: { value: 'omit' }
		});
		expect(JSON.parse(jsonBox().value)).toEqual([{ a: '1' }]);
	});

	it('switches the JSON shape to grouped by table', async () => {
		render(SqlPage);
		await type("INSERT INTO users (id) VALUES (1);\nINSERT INTO orders (id) VALUES (9);");

		await fireEvent.change(screen.getByLabelText('Shape'), { target: { value: 'grouped' } });
		expect(JSON.parse(jsonBox().value)).toEqual({ users: [{ id: 1 }], orders: [{ id: 9 }] });
	});

	it('caps the rendered rows and grows on demand', async () => {
		const rows = Array.from({ length: 620 }, (_, i) => `(${i})`).join(',');
		render(SqlPage);
		await type(`INSERT INTO t (a) VALUES ${rows};`);
		await fireEvent.click(screen.getByRole('button', { name: 'Table' }));

		// 500 of 620 rendered, and the count reflects the full set.
		expect(document.querySelectorAll('tbody tr')).toHaveLength(500);
		expect(screen.getByText(/Showing 500 of/)).toBeTruthy();

		await fireEvent.click(screen.getByRole('button', { name: /Show all/ }));
		expect(document.querySelectorAll('tbody tr')).toHaveLength(620);
	});
});
