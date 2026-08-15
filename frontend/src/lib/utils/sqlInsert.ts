/**
 * SQL `INSERT` → structured rows.
 *
 * Handles the shapes people actually paste out of dumps, migrations and logs:
 * a single statement, hundreds of them, one statement with a thousand tuples,
 * `INSERT INTO t SET a = 1` (MySQL), `REPLACE INTO`, and statements wrapped in
 * comments or trailed by `ON CONFLICT` / `ON DUPLICATE KEY UPDATE` /
 * `RETURNING` clauses.
 *
 * The parser is deliberately dialect-tolerant rather than dialect-correct: it
 * accepts backtick, double-quote and bracket identifiers, both `''` and `\'`
 * string escapes, and Postgres dollar quoting, because the input is pasted text
 * of unknown provenance. Anything it cannot classify as a literal is kept as
 * its SQL text (`kind: 'expression'`) instead of being dropped, so a value like
 * `NOW()` survives the round trip visibly.
 *
 * Nothing here touches the DOM or the network — the same functions back the web
 * page and the VS Code webview.
 */

export type SqlValueKind = 'string' | 'number' | 'boolean' | 'null' | 'default' | 'expression';

export interface SqlValue {
	kind: SqlValueKind;
	/** JSON-ready value. `NULL` and `DEFAULT` both land on `null`. */
	value: string | number | boolean | null;
	/** The literal exactly as written, so expressions stay inspectable. */
	raw: string;
}

export interface SqlInsertStatement {
	table: string;
	columns: string[];
	rows: SqlValue[][];
	/** True when the statement had no column list and names were synthesised. */
	synthesizedColumns: boolean;
	/** 1-based line the statement starts on, for issue reporting. */
	line: number;
}

export interface SqlParseIssue {
	severity: 'error' | 'warning';
	message: string;
	line: number;
}

export interface SqlParseResult {
	statements: SqlInsertStatement[];
	issues: SqlParseIssue[];
	/** Distinct table names, in the order first seen. */
	tables: string[];
	rowCount: number;
}

/* -------------------------------------------------------------------------- */
/* Scanner                                                                     */
/* -------------------------------------------------------------------------- */

const IDENT_CHAR = /[A-Za-z0-9_$]/;
const IDENT_START = /[A-Za-z_$]/;
const NUMBER_LITERAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const HEX_LITERAL = /^0[xX][0-9a-fA-F]+$/;
/** Charset/type introducers that may precede a quoted string. */
const STRING_PREFIX = /^(?:[NnEeBbXx]|_[A-Za-z0-9]+)$/;

class Scanner {
	pos = 0;
	/** Offsets of each line start, so line numbers cost a binary search. */
	private readonly lineStarts: number[] = [0];

	constructor(readonly src: string) {
		for (let i = 0; i < src.length; i++) {
			if (src[i] === '\n') this.lineStarts.push(i + 1);
		}
	}

	get eof(): boolean {
		return this.pos >= this.src.length;
	}

	peek(offset = 0): string {
		return this.src[this.pos + offset] ?? '';
	}

	lineAt(pos = this.pos): number {
		let low = 0;
		let high = this.lineStarts.length - 1;
		while (low < high) {
			const mid = (low + high + 1) >> 1;
			if (this.lineStarts[mid] <= pos) low = mid;
			else high = mid - 1;
		}
		return low + 1;
	}

	/** Consume whitespace and `--` / `#` / block comments. */
	skipTrivia(): void {
		while (!this.eof) {
			const c = this.peek();
			if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') {
				this.pos++;
				continue;
			}
			if ((c === '-' && this.peek(1) === '-') || c === '#') {
				while (!this.eof && this.peek() !== '\n') this.pos++;
				continue;
			}
			if (c === '/' && this.peek(1) === '*') {
				this.pos += 2;
				while (!this.eof && !(this.peek() === '*' && this.peek(1) === '/')) this.pos++;
				this.pos = Math.min(this.pos + 2, this.src.length);
				continue;
			}
			return;
		}
	}

	/** Case-insensitive keyword match on a word boundary. Consumes on success. */
	matchKeyword(word: string): boolean {
		this.skipTrivia();
		const end = this.pos + word.length;
		if (this.src.slice(this.pos, end).toUpperCase() !== word) return false;
		if (IDENT_CHAR.test(this.src[end] ?? '')) return false;
		this.pos = end;
		return true;
	}

	/** The next bare word, uppercased, without consuming anything. */
	peekWord(): string {
		const save = this.pos;
		this.skipTrivia();
		let end = this.pos;
		while (end < this.src.length && IDENT_CHAR.test(this.src[end])) end++;
		const word = this.src.slice(this.pos, end).toUpperCase();
		this.pos = save;
		return word;
	}

	/** Advance past a quoted run, honouring doubled and backslash escapes. */
	private skipQuoted(quote: string): void {
		this.pos++; // opening quote
		while (!this.eof) {
			const c = this.peek();
			if (c === '\\' && quote !== '[') {
				this.pos += 2;
				continue;
			}
			if (quote === '[' ? c === ']' : c === quote) {
				if (quote !== '[' && this.peek(1) === quote) {
					this.pos += 2;
					continue;
				}
				this.pos++;
				return;
			}
			this.pos++;
		}
	}

	/** Postgres `$tag$ … $tag$`. Returns false when this `$` is not a quote. */
	private skipDollarQuoted(): boolean {
		const match = /^\$[A-Za-z_]?[A-Za-z0-9_]*\$/.exec(this.src.slice(this.pos));
		if (!match) return false;
		const tag = match[0];
		const close = this.src.indexOf(tag, this.pos + tag.length);
		this.pos = close === -1 ? this.src.length : close + tag.length;
		return true;
	}

	/** Advance past whatever literal or delimited run starts here. */
	skipAtomic(): boolean {
		const c = this.peek();
		if (c === "'" || c === '"' || c === '`' || c === '[') {
			this.skipQuoted(c);
			return true;
		}
		if (c === '$') return this.skipDollarQuoted();
		return false;
	}

	/** One identifier part: bare, or delimited by backtick / quote / bracket. */
	readNamePart(): string | null {
		this.skipTrivia();
		const c = this.peek();
		if (c === '`' || c === '"' || c === '[') {
			const start = this.pos;
			this.skipQuoted(c);
			const body = this.src.slice(start + 1, this.pos - 1);
			return c === '[' ? body : body.split(c + c).join(c);
		}
		if (!IDENT_START.test(c)) return null;
		const start = this.pos;
		while (!this.eof && IDENT_CHAR.test(this.peek())) this.pos++;
		return this.src.slice(start, this.pos);
	}

	/** A possibly schema-qualified name, e.g. `public."my table"`. */
	readQualifiedName(): string | null {
		const parts: string[] = [];
		for (;;) {
			const part = this.readNamePart();
			if (part === null) break;
			parts.push(part);
			const save = this.pos;
			this.skipTrivia();
			if (this.peek() === '.') {
				this.pos++;
				continue;
			}
			this.pos = save;
			break;
		}
		return parts.length ? parts.join('.') : null;
	}

	/** Skip forward to just past the next top-level `;` (or to EOF). */
	skipToStatementEnd(): void {
		let depth = 0;
		while (!this.eof) {
			this.skipTrivia();
			if (this.eof) return;
			if (this.skipAtomic()) continue;
			const c = this.peek();
			if (c === '(') depth++;
			else if (c === ')') depth = Math.max(0, depth - 1);
			else if (c === ';' && depth === 0) {
				this.pos++;
				return;
			}
			this.pos++;
		}
	}
}

/* -------------------------------------------------------------------------- */
/* Literals                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Resolve SQL string escapes. `''` is universal; the backslash forms are
 * MySQL's. Postgres text containing a literal backslash is the cost of
 * accepting both, and it is the rarer paste.
 */
function unescapeStringBody(body: string, quote: string): string {
	if (!body.includes('\\') && !body.includes(quote + quote)) return body;

	let out = '';
	for (let i = 0; i < body.length; i++) {
		const c = body[i];
		if (c === quote && body[i + 1] === quote) {
			out += quote;
			i++;
			continue;
		}
		if (c !== '\\' || i === body.length - 1) {
			out += c;
			continue;
		}
		const next = body[++i];
		switch (next) {
			case 'n':
				out += '\n';
				break;
			case 't':
				out += '\t';
				break;
			case 'r':
				out += '\r';
				break;
			case 'b':
				out += '\b';
				break;
			case '0':
				out += '\0';
				break;
			case 'Z':
				out += '\x1a';
				break;
			// MySQL leaves the backslash in place for LIKE wildcards.
			case '%':
			case '_':
				out += '\\' + next;
				break;
			default:
				out += next;
		}
	}
	return out;
}

/**
 * The string value of `text` when it is exactly one string literal, else null.
 * Accepts a charset/type prefix (`N'x'`, `_utf8'x'`) and dollar quoting.
 */
function asStringLiteral(text: string): string | null {
	const dollar = /^\$([A-Za-z_]?[A-Za-z0-9_]*)\$([\s\S]*)\$\1\$$/.exec(text);
	if (dollar) return dollar[2];

	const quoteIndex = text.search(/['"]/);
	if (quoteIndex === -1) return null;
	if (quoteIndex > 0 && !STRING_PREFIX.test(text.slice(0, quoteIndex))) return null;

	const quote = text[quoteIndex];
	if (!text.endsWith(quote) || text.length - quoteIndex < 2) return null;

	const body = text.slice(quoteIndex + 1, -1);
	// A bare closing quote inside the body means this is a concatenation or an
	// expression (`'a' || b`), not one literal.
	let i = 0;
	while (i < body.length) {
		if (body[i] === '\\') {
			i += 2;
			continue;
		}
		if (body[i] === quote) {
			if (body[i + 1] !== quote) return null;
			i += 2;
			continue;
		}
		i++;
	}
	return unescapeStringBody(body, quote);
}

function classifyValue(raw: string): SqlValue {
	const text = raw.trim();
	if (!text) return { kind: 'null', value: null, raw: text };

	const upper = text.toUpperCase();
	if (upper === 'NULL') return { kind: 'null', value: null, raw: text };
	if (upper === 'DEFAULT') return { kind: 'default', value: null, raw: text };
	if (upper === 'TRUE') return { kind: 'boolean', value: true, raw: text };
	if (upper === 'FALSE') return { kind: 'boolean', value: false, raw: text };

	if (NUMBER_LITERAL.test(text)) {
		const num = Number(text);
		if (Number.isFinite(num)) return { kind: 'number', value: num, raw: text };
	}
	if (HEX_LITERAL.test(text)) {
		const num = Number.parseInt(text.slice(2), 16);
		if (Number.isFinite(num)) return { kind: 'number', value: num, raw: text };
	}

	const str = asStringLiteral(text);
	if (str !== null) return { kind: 'string', value: str, raw: text };

	return { kind: 'expression', value: text, raw: text };
}

/* -------------------------------------------------------------------------- */
/* Parser                                                                      */
/* -------------------------------------------------------------------------- */

/** Statement-level modifiers between `INSERT` and `INTO`. */
const INSERT_MODIFIERS = ['LOW_PRIORITY', 'DELAYED', 'HIGH_PRIORITY', 'IGNORE'];
const OR_ACTIONS = ['REPLACE', 'ROLLBACK', 'ABORT', 'FAIL', 'IGNORE'];
/**
 * Words that begin the clause after the table, so finding one where the table
 * name belongs means the table is missing — `INSERT INTO VALUES (1)`. Without
 * this the clause keyword is silently accepted as the table name.
 */
const NOT_A_TABLE_NAME = new Set(['VALUES', 'VALUE', 'SET', 'SELECT', 'WITH', 'DEFAULT']);

/** Read one value, stopping at a top-level `,`, `)` or `;`. */
function readValue(scanner: Scanner): SqlValue {
	scanner.skipTrivia();
	const start = scanner.pos;
	let end = scanner.pos;
	let depth = 0;

	for (;;) {
		scanner.skipTrivia();
		if (scanner.eof) break;
		const c = scanner.peek();
		if (depth === 0 && (c === ',' || c === ')' || c === ';')) break;
		if (scanner.skipAtomic()) {
			end = scanner.pos;
			continue;
		}
		if (c === '(') depth++;
		else if (c === ')') depth--;
		scanner.pos++;
		end = scanner.pos;
	}

	return classifyValue(scanner.src.slice(start, end));
}

/** Read a `( … )` tuple of values. Returns null when not positioned on `(`. */
function readTuple(scanner: Scanner): SqlValue[] | null {
	scanner.skipTrivia();
	if (scanner.peek() !== '(') return null;
	scanner.pos++;

	const values: SqlValue[] = [];
	for (;;) {
		scanner.skipTrivia();
		if (scanner.eof) break;
		if (scanner.peek() === ')') {
			scanner.pos++;
			break;
		}
		const before = scanner.pos;
		values.push(readValue(scanner));
		scanner.skipTrivia();
		if (scanner.peek() === ',') {
			scanner.pos++;
			continue;
		}
		if (scanner.peek() === ')') {
			scanner.pos++;
			break;
		}
		// Nothing consumed and no delimiter: malformed input. Step over one
		// character so the loop cannot spin.
		if (scanner.pos === before) scanner.pos++;
	}
	return values;
}

/** Read a `( col, col )` column list. Returns null when not positioned on `(`. */
function readColumnList(scanner: Scanner): string[] | null {
	scanner.skipTrivia();
	if (scanner.peek() !== '(') return null;
	scanner.pos++;

	const columns: string[] = [];
	for (;;) {
		scanner.skipTrivia();
		if (scanner.eof) break;
		if (scanner.peek() === ')') {
			scanner.pos++;
			break;
		}
		const name = scanner.readNamePart();
		if (name === null) {
			scanner.pos++;
			continue;
		}
		columns.push(name);
		scanner.skipTrivia();
		if (scanner.peek() === ',') scanner.pos++;
	}
	return columns;
}

/** MySQL's `INSERT INTO t SET a = 1, b = 'x'` form: one row of assignments. */
function readAssignments(scanner: Scanner): { columns: string[]; row: SqlValue[] } {
	const columns: string[] = [];
	const row: SqlValue[] = [];

	for (;;) {
		scanner.skipTrivia();
		const name = scanner.readNamePart();
		if (name === null) break;

		scanner.skipTrivia();
		if (scanner.peek() !== '=') break;
		scanner.pos++;

		columns.push(name);
		row.push(readValue(scanner));

		scanner.skipTrivia();
		if (scanner.peek() === ',') {
			scanner.pos++;
			continue;
		}
		break;
	}
	return { columns, row };
}

/**
 * Parse every `INSERT` (and MySQL `REPLACE`) statement in `sql`.
 *
 * Never throws: unparseable statements become issues and parsing continues with
 * the next one, so one bad line in a dump still yields the other rows.
 */
export function parseSqlInserts(sql: string): SqlParseResult {
	const scanner = new Scanner(sql);
	const statements: SqlInsertStatement[] = [];
	const issues: SqlParseIssue[] = [];

	while (true) {
		scanner.skipTrivia();
		if (scanner.eof) break;
		if (scanner.peek() === ';') {
			scanner.pos++;
			continue;
		}

		const line = scanner.lineAt();
		const leadWord = scanner.peekWord();

		if (!scanner.matchKeyword('INSERT') && !scanner.matchKeyword('REPLACE')) {
			scanner.skipToStatementEnd();
			issues.push({
				severity: 'warning',
				line,
				message: leadWord
					? `Skipped a non-INSERT statement (${leadWord}).`
					: 'Skipped text that is not a statement.'
			});
			continue;
		}

		// INSERT [LOW_PRIORITY|DELAYED|HIGH_PRIORITY] [IGNORE] / INSERT OR REPLACE
		for (;;) {
			if (INSERT_MODIFIERS.some((word) => scanner.matchKeyword(word))) continue;
			const save = scanner.pos;
			if (scanner.matchKeyword('OR')) {
				if (OR_ACTIONS.some((word) => scanner.matchKeyword(word))) continue;
				scanner.pos = save;
			}
			break;
		}
		scanner.matchKeyword('INTO');

		const table = NOT_A_TABLE_NAME.has(scanner.peekWord()) ? null : scanner.readQualifiedName();
		if (!table) {
			issues.push({ severity: 'error', line, message: 'INSERT without a table name.' });
			scanner.skipToStatementEnd();
			continue;
		}

		// Optional table alias (`INSERT INTO t AS x …`).
		const beforeAlias = scanner.pos;
		if (scanner.matchKeyword('AS') && scanner.readNamePart() === null) {
			scanner.pos = beforeAlias;
		}

		const declared = readColumnList(scanner);
		let columns = declared ?? [];
		/** False only when the names have to be invented from tuple positions. */
		let named = columns.length > 0;
		const rows: SqlValue[][] = [];

		if (scanner.matchKeyword('VALUES') || scanner.matchKeyword('VALUE')) {
			for (;;) {
				const tuple = readTuple(scanner);
				if (tuple === null) break;
				rows.push(tuple);
				scanner.skipTrivia();
				if (scanner.peek() === ',') {
					scanner.pos++;
					continue;
				}
				break;
			}
			if (!rows.length) {
				issues.push({ severity: 'error', line, message: `No value tuples after VALUES in "${table}".` });
			}
		} else if (scanner.matchKeyword('SET')) {
			const { columns: setColumns, row } = readAssignments(scanner);
			if (!row.length) {
				issues.push({ severity: 'error', line, message: `No assignments after SET in "${table}".` });
			} else {
				columns = setColumns;
				named = true;
				rows.push(row);
			}
		} else {
			const word = scanner.peekWord();
			const detail = word === 'SELECT' || word === 'WITH' || word === 'TABLE'
				? `it inserts the result of a ${word} instead of literal values`
				: 'no VALUES or SET clause was found';
			issues.push({
				severity: 'warning',
				line,
				message: `Skipped INSERT into "${table}": ${detail}.`
			});
			scanner.skipToStatementEnd();
			continue;
		}

		// Trailing clauses (ON CONFLICT, ON DUPLICATE KEY UPDATE, RETURNING…).
		scanner.skipToStatementEnd();

		// `VALUES ()` parses cleanly but carries no data; dropping the empty
		// tuples keeps them out of the row count and the synthesised width.
		const populated = rows.filter((row) => row.length > 0);
		if (populated.length !== rows.length) {
			issues.push({
				severity: populated.length ? 'warning' : 'error',
				line,
				message: `Ignored ${rows.length - populated.length} empty value tuple(s) in "${table}".`
			});
		}
		if (!populated.length) continue;

		// Reduced rather than spread into Math.max: a dump can carry more tuples
		// than an argument list holds.
		const width = populated.reduce((widest, row) => Math.max(widest, row.length), columns.length);
		const synthesizedColumns = !named;
		if (synthesizedColumns) {
			columns = Array.from({ length: width }, (_, i) => `column_${i + 1}`);
			issues.push({
				severity: 'warning',
				line,
				message: `"${table}" has no column list — using positional names (column_1…column_${width}).`
			});
		} else if (width > columns.length) {
			for (let i = columns.length; i < width; i++) columns.push(`column_${i + 1}`);
		}

		const ragged = populated.filter((row) => row.length !== columns.length).length;
		if (ragged) {
			issues.push({
				severity: 'warning',
				line,
				message: `${ragged} of ${populated.length} row(s) in "${table}" do not match the ${columns.length} column(s).`
			});
		}

		statements.push({ table, columns, rows: populated, synthesizedColumns, line });
	}

	const tables: string[] = [];
	let rowCount = 0;
	for (const statement of statements) {
		if (!tables.includes(statement.table)) tables.push(statement.table);
		rowCount += statement.rows.length;
	}

	return { statements, issues, tables, rowCount };
}

/* -------------------------------------------------------------------------- */
/* Output shapes                                                               */
/* -------------------------------------------------------------------------- */

export interface SqlConvertOptions {
	/** Numbers/booleans as JSON natives (default), or every value as a string. */
	typedValues?: boolean;
	/** How `NULL` and `DEFAULT` are represented. */
	nulls?: 'null' | 'omit' | 'string';
	/** Keep `NOW()` & friends as their SQL text (default), or null them out. */
	keepExpressions?: boolean;
	/** Add the source table as `_table` on every record. */
	includeTable?: boolean;
}

const DEFAULTS: Required<SqlConvertOptions> = {
	typedValues: true,
	nulls: 'null',
	keepExpressions: true,
	includeTable: false
};

/** The JSON value for one cell, or `undefined` when it should be omitted. */
function cellValue(value: SqlValue, options: Required<SqlConvertOptions>): unknown {
	if (value.kind === 'null' || value.kind === 'default') {
		if (options.nulls === 'omit') return undefined;
		if (options.nulls === 'string') return value.kind === 'default' ? 'DEFAULT' : 'NULL';
		return null;
	}
	if (value.kind === 'expression') {
		return options.keepExpressions ? value.raw : null;
	}
	if (!options.typedValues) return String(value.value);
	return value.value;
}

/** One statement's rows as records keyed by column name. */
export function statementToRecords(
	statement: SqlInsertStatement,
	options: SqlConvertOptions = {}
): Record<string, unknown>[] {
	const resolved = { ...DEFAULTS, ...options };

	return statement.rows.map((row) => {
		const record: Record<string, unknown> = {};
		if (resolved.includeTable) record._table = statement.table;

		row.forEach((value, index) => {
			const key = statement.columns[index] ?? `column_${index + 1}`;
			const cell = cellValue(value, resolved);
			if (cell !== undefined) record[key] = cell;
		});
		return record;
	});
}

/** Every row from every statement, flattened in source order. */
export function toRecords(
	statements: SqlInsertStatement[],
	options: SqlConvertOptions = {}
): Record<string, unknown>[] {
	return statements.flatMap((statement) => statementToRecords(statement, options));
}

/** Rows keyed by table name; statements touching the same table merge. */
export function toRecordsByTable(
	statements: SqlInsertStatement[],
	options: SqlConvertOptions = {}
): Record<string, Record<string, unknown>[]> {
	const grouped: Record<string, Record<string, unknown>[]> = {};
	for (const statement of statements) {
		const target = (grouped[statement.table] ??= []);
		for (const record of statementToRecords(statement, options)) target.push(record);
	}
	return grouped;
}

export interface SqlTable {
	table: string;
	/** Union of the columns of every statement that targets this table. */
	columns: string[];
	rows: Record<string, unknown>[];
}

/**
 * One entry per table, with a column union wide enough for every row — the
 * shape a grid needs.
 */
export function toTables(
	statements: SqlInsertStatement[],
	options: SqlConvertOptions = {}
): SqlTable[] {
	const tables: SqlTable[] = [];
	const byName = new Map<string, SqlTable>();

	for (const statement of statements) {
		let table = byName.get(statement.table);
		if (!table) {
			table = { table: statement.table, columns: [], rows: [] };
			byName.set(statement.table, table);
			tables.push(table);
		}
		for (const column of statement.columns) {
			if (!table.columns.includes(column)) table.columns.push(column);
		}
		for (const record of statementToRecords(statement, options)) table.rows.push(record);
	}

	return tables;
}

/** RFC 4180 CSV for one table, quoting only the fields that need it. */
export function tableToCsv(table: SqlTable): string {
	const cell = (value: unknown): string => {
		if (value === null || value === undefined) return '';
		const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
		return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
	};

	const lines = [table.columns.map(cell).join(',')];
	for (const row of table.rows) {
		lines.push(table.columns.map((column) => cell(row[column])).join(','));
	}
	return lines.join('\n');
}

/** Generated `INSERT` statements for the sample button and tests. */
export const SAMPLE_SQL = `-- Single statement, one row
INSERT INTO users (id, email, full_name, is_active, created_at)
VALUES (1, 'ada@example.com', 'Ada Lovelace', TRUE, '2026-01-14 09:30:00');

-- One statement, many rows
INSERT INTO users (id, email, full_name, is_active, created_at) VALUES
  (2, 'grace@example.com', 'Grace Hopper', TRUE, '2026-02-02 11:05:00'),
  (3, 'alan@example.com', 'Alan Turing', FALSE, NULL),
  (4, 'katherine@example.com', 'Katherine Johnson', TRUE, NOW());

-- Different table, escaped quotes, negative and decimal numbers
INSERT INTO \`orders\` (id, user_id, item, qty, unit_price, note) VALUES
  (900, 1, 'Difference Engine', 1, 12500.00, 'It''s fragile'),
  (901, 2, 'COBOL Manual', 3, -19.99, NULL);

-- MySQL SET form, and a statement with a trailing clause
INSERT INTO settings SET user_id = 1, theme = 'dark', density = 2;
INSERT INTO settings (user_id, theme, density) VALUES (2, 'light', 1)
  ON DUPLICATE KEY UPDATE theme = VALUES(theme);
`;
