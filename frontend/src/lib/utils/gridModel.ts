/**
 * Turns any JSON object/array into rows × columns for the grid inspector.
 * Arrays give one row per item; objects give one row per key. When most rows
 * are objects their keys become columns (optionally flattened to dotted
 * paths); anything else lands in a single value column.
 */

export interface GridColumn {
	id: string;
	label: string;
	path: string[];
	/** Shows the row's own value (non-object rows), not a key inside it. */
	isValue?: boolean;
}

export interface GridRow {
	key: string;
	value: unknown;
}

export interface GridModel {
	kind: 'array' | 'object';
	/** True when rows are objects spread into key columns. */
	keyed: boolean;
	rows: GridRow[];
	columns: GridColumn[];
	/** Columns dropped because of MAX_COLUMNS. */
	truncatedColumns: number;
}

export const KEY_COLUMN_ID = '$key';
const VALUE_COLUMN_ID = '$value';
const MAX_COLUMNS = 300;
const MAX_FLATTEN_DEPTH = 4;

export function isPlainObject(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function isContainer(v: unknown): boolean {
	return v !== null && typeof v === 'object';
}

/** Walks `path` from `root`; `found` is false if any segment is missing. */
export function resolvePath(root: unknown, path: string[]): { found: boolean; value: unknown } {
	let v = root;
	for (const k of path) {
		if (Array.isArray(v)) {
			const i = Number(k);
			if (!Number.isInteger(i) || i < 0 || i >= v.length) return { found: false, value: undefined };
			v = v[i];
		} else if (isPlainObject(v) && Object.hasOwn(v, k)) {
			v = v[k];
		} else {
			return { found: false, value: undefined };
		}
	}
	return { found: true, value: v };
}

export function buildGrid(data: unknown, flatten = false): GridModel {
	const kind = Array.isArray(data) ? 'array' : 'object';
	const rows: GridRow[] = Array.isArray(data)
		? data.map((value, i) => ({ key: String(i), value }))
		: isPlainObject(data)
			? Object.entries(data).map(([key, value]) => ({ key, value }))
			: [];

	const objectRows = rows.reduce((n, r) => n + (isPlainObject(r.value) ? 1 : 0), 0);
	const keyed = rows.length > 0 && objectRows * 2 >= rows.length;

	const columns: GridColumn[] = [];
	const seen = new Set<string>();
	let truncatedColumns = 0;

	function add(path: string[]) {
		const id = JSON.stringify(path);
		if (seen.has(id)) return;
		seen.add(id);
		if (columns.length >= MAX_COLUMNS) truncatedColumns++;
		else columns.push({ id, label: path.join('.'), path });
	}

	function walk(obj: Record<string, unknown>, prefix: string[], depth: number) {
		for (const [k, v] of Object.entries(obj)) {
			const path = [...prefix, k];
			if (flatten && isPlainObject(v) && Object.keys(v).length > 0 && depth < MAX_FLATTEN_DEPTH) {
				walk(v, path, depth + 1);
			} else {
				add(path);
			}
		}
	}

	if (keyed) {
		for (const r of rows) if (isPlainObject(r.value)) walk(r.value, [], 0);
		if (objectRows < rows.length) {
			columns.push({ id: VALUE_COLUMN_ID, label: '(value)', path: [], isValue: true });
		}
	} else {
		columns.push({ id: VALUE_COLUMN_ID, label: 'value', path: [], isValue: true });
	}

	return { kind, keyed, rows, columns, truncatedColumns };
}

export function getCell(model: GridModel, row: GridRow, col: GridColumn): unknown {
	if (col.isValue) return model.keyed && isPlainObject(row.value) ? undefined : row.value;
	let v = row.value;
	for (const k of col.path) {
		if (!isPlainObject(v) || !Object.hasOwn(v, k)) return undefined;
		v = v[k];
	}
	return v;
}

/** Short display text; nested values show as a size preview. */
export function formatCell(v: unknown): string {
	if (v === undefined) return '';
	if (v === null) return 'null';
	if (Array.isArray(v)) return `[${v.length} ${v.length === 1 ? 'item' : 'items'}]`;
	if (typeof v === 'object') {
		const n = Object.keys(v).length;
		return `{${n} ${n === 1 ? 'key' : 'keys'}}`;
	}
	return String(v);
}

/** Full text used for filtering, searching and CSV export. */
export function cellText(v: unknown): string {
	if (v === undefined) return '';
	if (v === null) return 'null';
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

function toNumber(v: unknown): number {
	if (typeof v === 'number') return v;
	if (typeof v === 'string' && v.trim() !== '') return Number(v);
	return NaN;
}

/**
 * Column filter syntax: plain text = contains; `=x` exact; `!=x` not equal;
 * `!x` does not contain; `>`, `<`, `>=`, `<=` compare numerically (or as
 * text, e.g. ISO dates). `=` alone matches empty cells, `!=` alone non-empty.
 */
export function parseFilter(raw: string): ((v: unknown) => boolean) | null {
	const s = raw.trim();
	if (!s) return null;
	const m = /^(>=|<=|!=|>|<|=|!)\s*(.*)$/.exec(s);
	if (!m) {
		const q = s.toLowerCase();
		return (v) => cellText(v).toLowerCase().includes(q);
	}
	const [, op, rest] = m;
	const q = rest.toLowerCase();
	switch (op) {
		case '=':
			return (v) => cellText(v).toLowerCase() === q;
		case '!=':
			return (v) => cellText(v).toLowerCase() !== q;
		case '!':
			return q ? (v) => !cellText(v).toLowerCase().includes(q) : null;
	}
	if (!rest) return null;
	const n = Number(rest);
	const cmp = (d: number) =>
		op === '>' ? d > 0 : op === '<' ? d < 0 : op === '>=' ? d >= 0 : d <= 0;
	if (!Number.isNaN(n)) {
		return (v) => {
			const x = toNumber(v);
			return !Number.isNaN(x) && cmp(x - n);
		};
	}
	return (v) => v !== undefined && v !== null && cmp(cellText(v).localeCompare(rest));
}

/** Sort order: numbers numerically, text naturally, empty/null last. */
export function compareCells(a: unknown, b: unknown): number {
	const ea = a === undefined || a === null;
	const eb = b === undefined || b === null;
	if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
	return cellText(a).localeCompare(cellText(b), undefined, { numeric: true });
}

function csvEscape(s: string): string {
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(model: GridModel, rowIdx: number[], columns: GridColumn[]): string {
	const header = [model.kind === 'array' ? '#' : 'key', ...columns.map((c) => c.label)];
	const lines = [header.map(csvEscape).join(',')];
	for (const i of rowIdx) {
		const row = model.rows[i];
		const cells = [row.key, ...columns.map((c) => cellText(getCell(model, row, c)))];
		lines.push(cells.map(csvEscape).join(','));
	}
	return lines.join('\n');
}
