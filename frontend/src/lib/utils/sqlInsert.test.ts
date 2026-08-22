import { describe, expect, it } from 'vitest';
import {
	SAMPLE_SQL,
	parseSqlInserts,
	statementToRecords,
	tableToCsv,
	toRecords,
	toRecordsByTable,
	toTables
} from './sqlInsert';

/** Records for the first statement of `sql`, with default options. */
function records(sql: string) {
	const result = parseSqlInserts(sql);
	return toRecords(result.statements);
}

describe('parseSqlInserts — single statement', () => {
	it('parses one row with a column list', () => {
		const result = parseSqlInserts(
			"INSERT INTO users (id, name, active) VALUES (1, 'Ada', TRUE);"
		);

		expect(result.issues).toEqual([]);
		expect(result.statements).toHaveLength(1);
		expect(result.rowCount).toBe(1);
		expect(result.tables).toEqual(['users']);

		const [statement] = result.statements;
		expect(statement.table).toBe('users');
		expect(statement.columns).toEqual(['id', 'name', 'active']);
		expect(statementToRecords(statement)).toEqual([{ id: 1, name: 'Ada', active: true }]);
	});

	it('works without the trailing semicolon', () => {
		expect(records("INSERT INTO t (a) VALUES ('x')")).toEqual([{ a: 'x' }]);
	});

	it('accepts INSERT with no INTO, and REPLACE INTO', () => {
		expect(records('INSERT t (a) VALUES (1)')).toEqual([{ a: 1 }]);
		expect(records('REPLACE INTO t (a) VALUES (1)')).toEqual([{ a: 1 }]);
	});

	it('accepts INSERT IGNORE and INSERT OR REPLACE', () => {
		expect(records('INSERT IGNORE INTO t (a) VALUES (1)')).toEqual([{ a: 1 }]);
		expect(records('INSERT OR REPLACE INTO t (a) VALUES (1)')).toEqual([{ a: 1 }]);
	});

	it('synthesises positional names when no column list is given', () => {
		const result = parseSqlInserts("INSERT INTO t VALUES (1, 'x');");
		expect(result.statements[0].columns).toEqual(['column_1', 'column_2']);
		expect(result.statements[0].synthesizedColumns).toBe(true);
		expect(toRecords(result.statements)).toEqual([{ column_1: 1, column_2: 'x' }]);
		expect(result.issues[0]).toMatchObject({ severity: 'warning', line: 1 });
	});
});

describe('parseSqlInserts — multiple rows and statements', () => {
	it('parses a multi-row VALUES list', () => {
		const result = parseSqlInserts(
			`INSERT INTO t (a, b) VALUES
				(1, 'one'),
				(2, 'two'),
				(3, 'three');`
		);

		expect(result.statements).toHaveLength(1);
		expect(result.rowCount).toBe(3);
		expect(toRecords(result.statements)).toEqual([
			{ a: 1, b: 'one' },
			{ a: 2, b: 'two' },
			{ a: 3, b: 'three' }
		]);
	});

	it('parses many statements across several tables', () => {
		const result = parseSqlInserts(
			`INSERT INTO users (id) VALUES (1);
			 INSERT INTO orders (id, user_id) VALUES (10, 1);
			 INSERT INTO users (id) VALUES (2);`
		);

		expect(result.statements).toHaveLength(3);
		expect(result.rowCount).toBe(3);
		expect(result.tables).toEqual(['users', 'orders']);
		expect(result.issues).toEqual([]);
	});

	it('reports the line each statement starts on', () => {
		const result = parseSqlInserts(
			['INSERT INTO a (x) VALUES (1);', '', 'INSERT INTO b (x) VALUES (2);'].join('\n')
		);
		expect(result.statements.map((s) => s.line)).toEqual([1, 3]);
	});

	it('tolerates extra and missing semicolons', () => {
		const result = parseSqlInserts(
			'INSERT INTO t (a) VALUES (1);;\n\n;INSERT INTO t (a) VALUES (2)'
		);
		expect(result.rowCount).toBe(2);
		expect(result.issues).toEqual([]);
	});
});

describe('parseSqlInserts — literals', () => {
	it('classifies the value types', () => {
		const [statement] = parseSqlInserts(
			`INSERT INTO t (s, i, f, neg, exp, hex, t, f2, n, d, e) VALUES
			 ('str', 42, 3.14, -7, 1.5e3, 0x1F, TRUE, false, NULL, DEFAULT, NOW());`
		).statements;

		expect(statement.rows[0].map((v) => v.kind)).toEqual([
			'string',
			'number',
			'number',
			'number',
			'number',
			'number',
			'boolean',
			'boolean',
			'null',
			'default',
			'expression'
		]);
		expect(statement.rows[0].map((v) => v.value)).toEqual([
			'str',
			42,
			3.14,
			-7,
			1500,
			31,
			true,
			false,
			null,
			null,
			'NOW()'
		]);
	});

	it("unescapes doubled quotes and backslash escapes", () => {
		expect(records("INSERT INTO t (a) VALUES ('It''s fine')")).toEqual([{ a: "It's fine" }]);
		expect(records("INSERT INTO t (a) VALUES ('It\\'s fine')")).toEqual([{ a: "It's fine" }]);
		expect(records("INSERT INTO t (a) VALUES ('line1\\nline2')")).toEqual([
			{ a: 'line1\nline2' }
		]);
		expect(records("INSERT INTO t (a) VALUES ('back\\\\slash')")).toEqual([
			{ a: 'back\\slash' }
		]);
	});

	it('keeps commas, parens and semicolons inside strings', () => {
		expect(records("INSERT INTO t (a) VALUES ('a, b (c); d')")).toEqual([{ a: 'a, b (c); d' }]);
	});

	it('handles charset prefixes and dollar quoting', () => {
		expect(records("INSERT INTO t (a) VALUES (N'wide')")).toEqual([{ a: 'wide' }]);
		expect(records("INSERT INTO t (a) VALUES (_utf8mb4'wide')")).toEqual([{ a: 'wide' }]);
		expect(records("INSERT INTO t (a) VALUES ($tag$it's raw$tag$)")).toEqual([
			{ a: "it's raw" }
		]);
	});

	it('keeps nested function calls whole as expressions', () => {
		expect(records("INSERT INTO t (a, b) VALUES (CONCAT('x', ','), 1)")).toEqual([
			{ a: "CONCAT('x', ',')", b: 1 }
		]);
	});

	it('treats string concatenation as an expression, not a literal', () => {
		expect(records("INSERT INTO t (a) VALUES ('x' || 'y')")).toEqual([{ a: "'x' || 'y'" }]);
	});

	it('reads an empty string and an empty tuple', () => {
		expect(records("INSERT INTO t (a) VALUES ('')")).toEqual([{ a: '' }]);
		expect(parseSqlInserts('INSERT INTO t () VALUES ()').rowCount).toBe(0);
	});
});

describe('parseSqlInserts — identifiers, comments and clauses', () => {
	it('unquotes backtick, double-quote and bracket identifiers', () => {
		expect(parseSqlInserts('INSERT INTO `my table` (`a b`) VALUES (1)').statements[0]).toMatchObject(
			{ table: 'my table', columns: ['a b'] }
		);
		expect(parseSqlInserts('INSERT INTO "T" ("A") VALUES (1)').statements[0]).toMatchObject({
			table: 'T',
			columns: ['A']
		});
		expect(parseSqlInserts('INSERT INTO [dbo].[T] ([A]) VALUES (1)').statements[0]).toMatchObject(
			{ table: 'dbo.T', columns: ['A'] }
		);
	});

	it('keeps schema-qualified table names', () => {
		expect(parseSqlInserts('INSERT INTO public.users (id) VALUES (1)').tables).toEqual([
			'public.users'
		]);
	});

	it('skips line, hash and block comments', () => {
		const result = parseSqlInserts(
			`-- leading note
			 /* block
			    comment */
			 INSERT INTO t (a) VALUES (1); # trailing note
			 INSERT INTO t (a) VALUES (2); -- another`
		);
		expect(result.rowCount).toBe(2);
		expect(result.issues).toEqual([]);
	});

	it('ignores ON CONFLICT, ON DUPLICATE KEY UPDATE and RETURNING tails', () => {
		const sql = `
			INSERT INTO t (a, b) VALUES (1, 2) ON CONFLICT (a) DO UPDATE SET b = 3;
			INSERT INTO t (a, b) VALUES (4, 5) ON DUPLICATE KEY UPDATE b = VALUES(b);
			INSERT INTO t (a, b) VALUES (6, 7) RETURNING a, b;`;

		const result = parseSqlInserts(sql);
		expect(result.issues).toEqual([]);
		expect(toRecords(result.statements)).toEqual([
			{ a: 1, b: 2 },
			{ a: 4, b: 5 },
			{ a: 6, b: 7 }
		]);
	});

	it('parses the MySQL SET form without inventing column names', () => {
		const result = parseSqlInserts("INSERT INTO t SET a = 1, b = 'x';");
		expect(result.issues).toEqual([]);
		expect(result.statements[0]).toMatchObject({
			columns: ['a', 'b'],
			synthesizedColumns: false
		});
		expect(toRecords(result.statements)).toEqual([{ a: 1, b: 'x' }]);
	});

	it('accepts a table alias and the VALUE keyword', () => {
		expect(records('INSERT INTO t AS x (a) VALUE (1)')).toEqual([{ a: 1 }]);
	});
});

describe('parseSqlInserts — issues', () => {
	it('skips non-INSERT statements but keeps the INSERTs around them', () => {
		const result = parseSqlInserts(
			`CREATE TABLE t (a INT);
			 INSERT INTO t (a) VALUES (1);
			 UPDATE t SET a = 2 WHERE a = 1;`
		);

		expect(result.rowCount).toBe(1);
		expect(result.issues.map((i) => i.message)).toEqual([
			'Skipped a non-INSERT statement (CREATE).',
			'Skipped a non-INSERT statement (UPDATE).'
		]);
		expect(result.issues.every((i) => i.severity === 'warning')).toBe(true);
	});

	it('explains an INSERT … SELECT it cannot convert', () => {
		const result = parseSqlInserts('INSERT INTO t (a) SELECT a FROM other;');
		expect(result.statements).toEqual([]);
		expect(result.issues[0].message).toContain('SELECT');
	});

	it('flags rows whose width does not match the column list', () => {
		const result = parseSqlInserts('INSERT INTO t (a, b) VALUES (1, 2), (3);');
		expect(result.rowCount).toBe(2);
		expect(result.issues.some((i) => i.message.includes('do not match'))).toBe(true);
		// The short row simply has no value for the missing column.
		expect(toRecords(result.statements)).toEqual([{ a: 1, b: 2 }, { a: 3 }]);
	});

	it('widens the column list when a row is longer than declared', () => {
		const result = parseSqlInserts('INSERT INTO t (a) VALUES (1, 2);');
		expect(result.statements[0].columns).toEqual(['a', 'column_2']);
		expect(toRecords(result.statements)).toEqual([{ a: 1, column_2: 2 }]);
	});

	it('reports a missing table name and an empty VALUES list', () => {
		expect(parseSqlInserts('INSERT INTO VALUES (1);').issues[0].severity).toBe('error');
		expect(parseSqlInserts('INSERT INTO t (a) VALUES;').issues[0].severity).toBe('error');
	});

	it('terminates on truncated input instead of hanging', () => {
		for (const sql of [
			'INSERT INTO t (a) VALUES (1',
			"INSERT INTO t (a) VALUES ('unclosed",
			'INSERT INTO t (a',
			'INSERT INTO',
			'INSERT'
		]) {
			expect(() => parseSqlInserts(sql)).not.toThrow();
		}
	});

	it('returns an empty result for blank input', () => {
		const result = parseSqlInserts('   \n -- nothing here \n ');
		expect(result).toMatchObject({ statements: [], issues: [], tables: [], rowCount: 0 });
	});
});

describe('conversion options', () => {
	const sql = "INSERT INTO t (n, b, s, nul, def, expr) VALUES (1, TRUE, 'x', NULL, DEFAULT, NOW());";

	it('stringifies every value when typedValues is off', () => {
		const [row] = toRecords(parseSqlInserts(sql).statements, { typedValues: false });
		expect(row).toMatchObject({ n: '1', b: 'true', s: 'x' });
	});

	it('omits or labels nulls on request', () => {
		const statements = parseSqlInserts(sql).statements;
		expect(toRecords(statements, { nulls: 'omit' })[0]).not.toHaveProperty('nul');
		expect(toRecords(statements, { nulls: 'string' })[0]).toMatchObject({
			nul: 'NULL',
			def: 'DEFAULT'
		});
	});

	it('can null out expressions instead of keeping their SQL text', () => {
		expect(toRecords(parseSqlInserts(sql).statements, { keepExpressions: false })[0].expr).toBe(
			null
		);
	});

	it('can stamp each record with its source table', () => {
		const result = parseSqlInserts('INSERT INTO t (a) VALUES (1);');
		expect(toRecords(result.statements, { includeTable: true })).toEqual([
			{ _table: 't', a: 1 }
		]);
	});
});

describe('output shapes', () => {
	const result = parseSqlInserts(
		`INSERT INTO users (id, name) VALUES (1, 'Ada');
		 INSERT INTO orders (id) VALUES (10);
		 INSERT INTO users (id, email) VALUES (2, 'g@x.io');`
	);

	it('groups records by table, merging repeated statements', () => {
		const grouped = toRecordsByTable(result.statements);
		expect(Object.keys(grouped)).toEqual(['users', 'orders']);
		expect(grouped.users).toHaveLength(2);
		expect(grouped.orders).toHaveLength(1);
	});

	it('unions columns per table for the grid', () => {
		const tables = toTables(result.statements);
		expect(tables.map((t) => t.table)).toEqual(['users', 'orders']);
		expect(tables[0].columns).toEqual(['id', 'name', 'email']);
		expect(tables[0].rows).toEqual([{ id: 1, name: 'Ada' }, { id: 2, email: 'g@x.io' }]);
	});

	it('writes CSV with the table column order, quoting only where needed', () => {
		const [users] = toTables(
			parseSqlInserts("INSERT INTO users (id, note) VALUES (1, 'a,b'), (2, NULL);").statements
		);
		expect(tableToCsv(users)).toBe('id,note\n1,"a,b"\n2,');
	});

	it('handles multiple INSERT statements with multiple rows for the same table', () => {
		const result = parseSqlInserts(
			`INSERT INTO users (id, name) VALUES (1, 'Ada'), (2, 'Bob');
			 INSERT INTO users (id, email) VALUES (3, 'c@x.io'), (4, 'd@x.io');`
		);

		expect(result.rowCount).toBe(4);
		expect(result.statements).toHaveLength(2);

		const grouped = toRecordsByTable(result.statements);
		expect(grouped.users).toHaveLength(4);
		expect(grouped.users).toEqual([
			{ id: 1, name: 'Ada' },
			{ id: 2, name: 'Bob' },
			{ id: 3, email: 'c@x.io' },
			{ id: 4, email: 'd@x.io' }
		]);

		const tables = toTables(result.statements);
		expect(tables).toHaveLength(1);
		expect(tables[0].columns).toEqual(['id', 'name', 'email']);
		expect(tables[0].rows).toHaveLength(4);
		expect(tables[0].rows).toEqual([
			{ id: 1, name: 'Ada' },
			{ id: 2, name: 'Bob' },
			{ id: 3, email: 'c@x.io' },
			{ id: 4, email: 'd@x.io' }
		]);
	});

	it('handles multiple rows with inconsistent column widths in toTables', () => {
		const result = parseSqlInserts(
			`INSERT INTO data (a, b, c) VALUES (1, 2, 3), (4, 5);
			 INSERT INTO data (a, d) VALUES (7, 8), (9, 10);`
		);

		const tables = toTables(result.statements);
		expect(tables).toHaveLength(1);
		// Should merge all columns: a, b, c, d
		expect(tables[0].columns).toEqual(['a', 'b', 'c', 'd']);
		expect(tables[0].rows).toHaveLength(4);
	});

	it('trims spaces around values in multiple records', () => {
		const result = parseSqlInserts(
			`INSERT INTO users ( id , name ) VALUES ( 1 , ' Ada ' ) , ( 2 , ' Bob ' );`
		);

		expect(result.rowCount).toBe(2);
		const records = toRecords(result.statements);

		// String values should have leading/trailing spaces trimmed
		expect(records).toEqual([
			{ id: 1, name: 'Ada' },
			{ id: 2, name: 'Bob' }
		]);

		// Test with numbers
		const result2 = parseSqlInserts(
			`INSERT INTO data ( n , count ) VALUES ( 42 , 100 ) , ( 99 , 200 );`
		);
		const records2 = toRecords(result2.statements);
		expect(records2).toEqual([
			{ n: 42, count: 100 },
			{ n: 99, count: 200 }
		]);
	});
});

describe('SAMPLE_SQL', () => {
	it('parses into four tables with no errors', () => {
		const result = parseSqlInserts(SAMPLE_SQL);
		expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
		expect(result.tables).toEqual(['users', 'orders', 'settings']);
		expect(result.rowCount).toBe(8);
		expect(toTables(result.statements)[1].rows[0]).toMatchObject({
			item: 'Difference Engine',
			unit_price: 12500,
			note: "It's fragile"
		});
	});
});
