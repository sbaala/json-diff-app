/**
 * Intelligent visualization analyzer.
 *
 * Takes arbitrary parsed JSON and answers three questions:
 *   1. Which parts of it are chartable datasets? (extractDatasets)
 *   2. What kind of data is in each column?      (field classification)
 *   3. Which charts fit that shape, ranked?      (suggestCharts)
 */

export type FieldKind = 'number' | 'category' | 'temporal' | 'boolean' | 'other';

export interface Field {
	name: string;
	kind: FieldKind;
	uniqueCount: number;
	/** Fill ratio: fraction of rows where the field is present & non-null */
	coverage: number;
}

export type Row = Record<string, unknown>;

export interface Dataset {
	/** JSON path, e.g. "$", "$.users", "$.data.items" */
	path: string;
	label: string;
	rows: Row[];
	fields: Field[];
	/** True when derived from an object's key/value pairs rather than an array */
	fromObject: boolean;
}

export type ChartType =
	| 'bar'
	| 'hbar'
	| 'grouped-bar'
	| 'stacked-bar'
	| 'line'
	| 'area'
	| 'scatter'
	| 'histogram'
	| 'heatmap'
	| 'treemap'
	| 'kpi'
	| 'table';

export interface ChartMapping {
	x?: string;
	y: string[];
	series?: string;
}

export interface ChartSuggestion {
	id: string;
	type: ChartType;
	title: string;
	reason: string;
	tier: 'basic' | 'advanced';
	mapping: ChartMapping;
	score: number;
}

const MAX_DATASETS = 12;
const MAX_DEPTH = 5;
const MAX_ROWS = 2000;
const MAX_CATEGORY_UNIQUE = 50;

// ---------------------------------------------------------------------------
// Dataset extraction
// ---------------------------------------------------------------------------

export function extractDatasets(json: unknown): Dataset[] {
	const found: Dataset[] = [];
	walk(json, '$', 'root', 0, found);
	// Prefer larger, shallower datasets first
	found.sort((a, b) => a.path.split('.').length - b.path.split('.').length || b.rows.length - a.rows.length);
	return found.slice(0, MAX_DATASETS);
}

function walk(value: unknown, path: string, label: string, depth: number, out: Dataset[]) {
	if (depth > MAX_DEPTH || out.length >= MAX_DATASETS) return;

	if (Array.isArray(value)) {
		const ds = datasetFromArray(value, path, label);
		if (ds) out.push(ds);
		// Recurse into object elements to find nested tables (first few only)
		for (let i = 0; i < Math.min(value.length, 5); i++) {
			const el = value[i];
			if (el && typeof el === 'object' && !Array.isArray(el)) {
				for (const [k, v] of Object.entries(el)) {
					if (Array.isArray(v) || (v && typeof v === 'object')) {
						walk(v, `${path}[${i}].${k}`, k, depth + 1, out);
					}
				}
			}
		}
		return;
	}

	if (value && typeof value === 'object') {
		const obj = value as Row;
		const ds = datasetFromObject(obj, path, label);
		if (ds) out.push(ds);
		for (const [k, v] of Object.entries(obj)) {
			if (Array.isArray(v) || (v && typeof v === 'object')) {
				walk(v, `${path}.${k}`, k, depth + 1, out);
			}
		}
	}
}

/** Array of objects → table; array of primitives → {index, value} rows. */
function datasetFromArray(arr: unknown[], path: string, label: string): Dataset | null {
	if (arr.length < 2) return null;
	const sample = arr.slice(0, MAX_ROWS);
	const objectCount = sample.filter(
		(v) => v && typeof v === 'object' && !Array.isArray(v)
	).length;

	if (objectCount >= sample.length * 0.8) {
		const rows = sample
			.filter((v): v is Row => !!v && typeof v === 'object' && !Array.isArray(v))
			.map((r) => flattenRow(r));
		const fields = classifyFields(rows);
		if (fields.length === 0) return null;
		return { path, label, rows, fields, fromObject: false };
	}

	const primCount = sample.filter((v) => v === null || typeof v !== 'object').length;
	if (primCount === sample.length) {
		const rows = sample.map((v, i) => ({ index: i, value: v }));
		const fields = classifyFields(rows);
		// Only useful if values are numeric
		if (fields.find((f) => f.name === 'value')?.kind !== 'number') return null;
		return { path, label, rows, fields, fromObject: false };
	}
	return null;
}

/** Object whose values are all primitives → {key, value} rows. */
function datasetFromObject(obj: Row, path: string, label: string): Dataset | null {
	const entries = Object.entries(obj);
	if (entries.length < 2 || entries.length > 200) return null;
	if (!entries.every(([, v]) => v === null || typeof v !== 'object')) return null;
	const rows = entries.map(([key, value]) => ({ key, value }));
	const fields = classifyFields(rows);
	if (fields.find((f) => f.name === 'value')?.kind !== 'number') return null;
	return { path, label, rows, fields, fromObject: true };
}

/** Flatten one level of nested objects into dotted columns (a.b). */
function flattenRow(row: Row): Row {
	const flat: Row = {};
	for (const [k, v] of Object.entries(row)) {
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			for (const [k2, v2] of Object.entries(v as Row)) {
				if (v2 === null || typeof v2 !== 'object') flat[`${k}.${k2}`] = v2;
			}
		} else if (!Array.isArray(v)) {
			flat[k] = v;
		}
	}
	return flat;
}

// ---------------------------------------------------------------------------
// Field classification
// ---------------------------------------------------------------------------

const DATE_KEY_HINT = /(date|time|timestamp|created|updated|_at$|^day$|^month$|^year$)/i;
const ISO_DATE = /^\d{4}-\d{2}(-\d{2})?([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const SLASH_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;

function classifyFields(rows: Row[]): Field[] {
	const names = new Set<string>();
	for (const r of rows) for (const k of Object.keys(r)) names.add(k);

	const fields: Field[] = [];
	for (const name of names) {
		const present = rows.map((r) => r[name]).filter((v) => v !== undefined && v !== null);
		if (present.length === 0) continue;
		const coverage = present.length / rows.length;
		if (coverage < 0.5) continue;

		const unique = new Set(present.map((v) => String(v)));
		const kind = classifyValues(name, present);
		fields.push({ name, kind, uniqueCount: unique.size, coverage });
	}
	return fields;
}

function classifyValues(name: string, values: unknown[]): FieldKind {
	const n = values.length;
	let numbers = 0;
	let bools = 0;
	let dateStrings = 0;
	let strings = 0;

	for (const v of values) {
		if (typeof v === 'boolean') bools++;
		else if (typeof v === 'number' && isFinite(v)) numbers++;
		else if (typeof v === 'string') {
			const s = v.trim();
			if (ISO_DATE.test(s) || SLASH_DATE.test(s)) dateStrings++;
			else if (s !== '' && !isNaN(Number(s))) numbers++;
			else strings++;
		}
	}

	if (bools / n > 0.9) return 'boolean';
	if (dateStrings / n > 0.9) return 'temporal';
	if (numbers / n > 0.9) {
		// Numeric but named like a date and in epoch range → temporal
		if (DATE_KEY_HINT.test(name)) {
			const nums = values.map(Number).filter(isFinite);
			const min = Math.min(...nums);
			if (min > 1e11) return 'temporal'; // epoch millis
		}
		return 'number';
	}
	if (strings + dateStrings + numbers + bools === 0) return 'other';
	const unique = new Set(values.map((v) => String(v))).size;
	if (unique <= MAX_CATEGORY_UNIQUE || unique <= values.length * 0.6) return 'category';
	return 'other';
}

/** Coerce a raw cell to a number (handles numeric strings). */
export function toNumber(v: unknown): number | null {
	if (typeof v === 'number') return isFinite(v) ? v : null;
	if (typeof v === 'boolean') return v ? 1 : 0;
	if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
	return null;
}

/** Coerce a raw cell to epoch millis. */
export function toEpoch(v: unknown): number | null {
	if (typeof v === 'number') return v > 1e11 ? v : v > 1e9 ? v * 1000 : null;
	if (typeof v === 'string') {
		const t = Date.parse(v);
		return isNaN(t) ? null : t;
	}
	return null;
}

// ---------------------------------------------------------------------------
// Chart suggestions
// ---------------------------------------------------------------------------

export function suggestCharts(ds: Dataset): ChartSuggestion[] {
	const numeric = ds.fields.filter((f) => f.kind === 'number');
	const categorical = ds.fields.filter(
		(f) => f.kind === 'category' || f.kind === 'boolean'
	);
	const temporal = ds.fields.filter((f) => f.kind === 'temporal');
	const out: ChartSuggestion[] = [];
	const n = ds.rows.length;

	const cat = pickCategory(categorical, n);
	const time = temporal[0];

	// Measures that share an axis must share a scale (never dual-axis): keep
	// only numerics within 2 orders of magnitude of the primary one.
	const magnitude = (f: Field) =>
		Math.max(...ds.rows.map((r) => Math.abs(toNumber(r[f.name]) ?? 0)), 1e-9);
	const primaryMag = numeric.length > 0 ? magnitude(numeric[0]) : 1;
	const comparable = numeric.filter((f) => {
		const ratio = magnitude(f) / primaryMag;
		return ratio > 0.01 && ratio < 100;
	});

	// --- Basic ---------------------------------------------------------------
	if (cat && numeric.length >= 1) {
		const long = cat.uniqueCount > 12;
		out.push(sug(long ? 'hbar' : 'bar', 'basic', {
			title: `${numeric[0].name} by ${cat.name}`,
			reason: `"${cat.name}" is categorical (${cat.uniqueCount} groups) with numeric "${numeric[0].name}" — magnitude comparison`,
			mapping: { x: cat.name, y: [numeric[0].name] },
			score: 90
		}));
	}

	if (time && numeric.length >= 1) {
		out.push(sug('line', 'basic', {
			title: `${numeric[0].name} over ${time.name}`,
			reason: `"${time.name}" is temporal — trend over time (values summed per ${time.name})`,
			mapping: { x: time.name, y: [numeric[0].name] },
			score: 95
		}));
		if (numeric.length === 1) {
			out.push(sug('area', 'basic', {
				title: `${numeric[0].name} over ${time.name} (area)`,
				reason: 'Single series over time — area emphasizes cumulative magnitude',
				mapping: { x: time.name, y: [numeric[0].name] },
				score: 70
			}));
		}
	}

	if (ds.fromObject && n <= 8 && numeric.length >= 1) {
		out.push(sug('kpi', 'basic', {
			title: 'Key metrics',
			reason: `${n} named numbers — reads best as stat tiles, not a chart`,
			mapping: { x: 'key', y: ['value'] },
			score: 85
		}));
	}

	if (cat && comparable.length >= 2) {
		const ys = comparable.slice(0, 4).map((f) => f.name);
		out.push(sug('grouped-bar', 'basic', {
			title: `${ys.join(', ')} by ${cat.name}`,
			reason: `${ys.length} same-scale measures across "${cat.name}" — side-by-side comparison`,
			mapping: { x: cat.name, y: ys },
			score: 75
		}));
		out.push(sug('stacked-bar', 'basic', {
			title: `Composition of ${cat.name}`,
			reason: 'Same measures, stacked — part-to-whole per group',
			mapping: { x: cat.name, y: ys },
			score: 65
		}));
	}

	// Two categoricals + numeric → pivoted stacked bar
	const cat2 = categorical.filter((f) => f !== cat && f.uniqueCount <= 8)[0];
	if (cat && cat2 && numeric.length >= 1) {
		out.push(sug('stacked-bar', 'basic', {
			title: `${numeric[0].name} by ${cat.name}, split by ${cat2.name}`,
			reason: `Second category "${cat2.name}" (${cat2.uniqueCount} values) works as stack series`,
			mapping: { x: cat.name, y: [numeric[0].name], series: cat2.name },
			score: 72
		}));
	}

	// --- Advanced ------------------------------------------------------------
	if (numeric.length >= 2) {
		out.push(sug('scatter', 'advanced', {
			title: `${numeric[0].name} vs ${numeric[1].name}`,
			reason: 'Two numeric fields — correlation / distribution of points',
			mapping: { x: numeric[0].name, y: [numeric[1].name], series: cat && cat.uniqueCount <= 4 ? cat.name : undefined },
			score: 68
		}));
	}

	if (numeric.length >= 1 && n >= 10) {
		out.push(sug('histogram', 'advanced', {
			title: `Distribution of ${numeric[0].name}`,
			reason: `${n} values of "${numeric[0].name}" — binned frequency distribution`,
			mapping: { y: [numeric[0].name] },
			score: 60
		}));
	}

	if (cat && cat2 && numeric.length >= 1) {
		out.push(sug('heatmap', 'advanced', {
			title: `${numeric[0].name}: ${cat.name} × ${cat2.name}`,
			reason: 'Two categorical dimensions + a measure — matrix of magnitude',
			mapping: { x: cat.name, series: cat2.name, y: [numeric[0].name] },
			score: 66
		}));
	}

	if (cat && numeric.length >= 1 && cat.uniqueCount >= 3) {
		out.push(sug('treemap', 'advanced', {
			title: `Share of ${numeric[0].name} by ${cat.name}`,
			reason: 'Part-to-whole weight per category as nested area',
			mapping: { x: cat.name, y: [numeric[0].name] },
			score: 58
		}));
	}

	if (time && comparable.length >= 2) {
		out.push(sug('line', 'advanced', {
			title: `${comparable.length} measures over ${time.name}`,
			reason: `${comparable.length} same-scale measures share the time axis — multi-line comparison`,
			mapping: { x: time.name, y: comparable.slice(0, 6).map((f) => f.name) },
			score: 64
		}));
	}

	// Always offer the raw table
	out.push(sug('table', 'basic', {
		title: 'Data table',
		reason: 'Full fidelity — every field, every row',
		mapping: { y: [] },
		score: 10
	}));

	// De-dup by (type + mapping), rank by score
	const seen = new Set<string>();
	return out
		.filter((s) => {
			const key = s.type + JSON.stringify(s.mapping);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.sort((a, b) => b.score - a.score);
}

let sugId = 0;
function sug(
	type: ChartType,
	tier: 'basic' | 'advanced',
	rest: { title: string; reason: string; mapping: ChartMapping; score: number }
): ChartSuggestion {
	return { id: `s${sugId++}`, type, tier, ...rest };
}

/** Best categorical axis: prefer moderate cardinality, high coverage. */
function pickCategory(cats: Field[], rowCount: number): Field | undefined {
	return [...cats]
		.filter((f) => f.uniqueCount >= 2 && f.uniqueCount <= Math.min(MAX_CATEGORY_UNIQUE, rowCount))
		.sort((a, b) => score(b) - score(a))[0];

	function score(f: Field): number {
		// Sweet spot around 4–12 unique values; penalize near-unique ids
		const ratio = f.uniqueCount / rowCount;
		return (f.uniqueCount >= 3 && f.uniqueCount <= 12 ? 2 : 1) - (ratio > 0.9 ? 2 : 0) + f.coverage;
	}
}
