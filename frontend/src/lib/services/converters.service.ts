// Frontend-only data-format converters: YAML, XML, CSV, and JSONPath.
// All parsing/serialization is done client-side without external libraries.

export class ConvertersService {
	// ---------- YAML ----------
	static jsonToYaml(obj: unknown, indent = 0): string {
		const pad = '  '.repeat(indent);

		if (obj === null) return 'null';
		if (typeof obj === 'string') {
			return needsQuote(obj) ? JSON.stringify(obj) : obj;
		}
		if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

		if (Array.isArray(obj)) {
			if (obj.length === 0) return '[]';
			return obj
				.map((item) => {
					const val = this.jsonToYaml(item, indent + 1);
					if (val.includes('\n')) {
						return `${pad}-\n${val}`;
					}
					return `${pad}- ${val}`;
				})
				.join('\n');
		}

		if (typeof obj === 'object') {
			const entries = Object.entries(obj as Record<string, unknown>);
			if (entries.length === 0) return '{}';
			return entries
				.map(([key, value]) => {
					const isComplex =
						value !== null && typeof value === 'object' && Object.keys(value).length > 0;
					if (isComplex) {
						return `${pad}${key}:\n${this.jsonToYaml(value, indent + 1)}`;
					}
					return `${pad}${key}: ${this.jsonToYaml(value, indent + 1)}`;
				})
				.join('\n');
		}

		return String(obj);
	}

	static yamlToJson(yaml: string): unknown {
		const lines = yaml.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
		let index = 0;

		const parseBlock = (minIndent: number): unknown => {
			const getIndent = (line: string) => line.length - line.trimStart().length;

			// Detect array vs object at this level
			if (index < lines.length && lines[index].trim().startsWith('- ')) {
				const arr: unknown[] = [];
				while (index < lines.length) {
					const line = lines[index];
					const ind = getIndent(line);
					if (ind < minIndent || !line.trim().startsWith('- ')) break;
					const content = line.trim().substring(2);
					index++;
					if (content.includes(':') && !content.startsWith('"')) {
						// Inline object start — reparse as object member
						index--;
						lines[index] = ' '.repeat(ind + 2) + content;
						arr.push(parseBlock(ind + 2));
					} else {
						arr.push(parseScalar(content));
					}
				}
				return arr;
			}

			const obj: Record<string, unknown> = {};
			while (index < lines.length) {
				const line = lines[index];
				const ind = getIndent(line);
				if (ind < minIndent) break;
				const trimmed = line.trim();
				const colonIdx = trimmed.indexOf(':');
				if (colonIdx === -1) {
					index++;
					continue;
				}
				const key = trimmed.substring(0, colonIdx).trim();
				const rest = trimmed.substring(colonIdx + 1).trim();
				index++;
				if (rest === '') {
					const childIndent = index < lines.length ? getIndent(lines[index]) : minIndent;
					if (childIndent > ind) {
						obj[key] = parseBlock(childIndent);
					} else {
						obj[key] = null;
					}
				} else {
					obj[key] = parseScalar(rest);
				}
			}
			return obj;
		};

		const parseScalar = (val: string): unknown => {
			if (val === 'null' || val === '~') return null;
			if (val === 'true') return true;
			if (val === 'false') return false;
			if (val === '[]') return [];
			if (val === '{}') return {};
			if (/^-?\d+$/.test(val)) return parseInt(val, 10);
			if (/^-?\d*\.\d+$/.test(val)) return parseFloat(val);
			if (val.startsWith('"') || val.startsWith("'")) {
				try {
					return JSON.parse(val.replace(/'/g, '"'));
				} catch {
					return val.slice(1, -1);
				}
			}
			return val;
		};

		return parseBlock(0);
	}

	// ---------- XML ----------
	static jsonToXml(obj: unknown, rootName = 'root', indent = 0): string {
		const pad = '  '.repeat(indent);

		const serialize = (value: unknown, name: string, level: number): string => {
			const p = '  '.repeat(level);
			if (value === null || value === undefined) {
				return `${p}<${name}/>`;
			}
			if (Array.isArray(value)) {
				return value.map((item) => serialize(item, name, level)).join('\n');
			}
			if (typeof value === 'object') {
				const inner = Object.entries(value as Record<string, unknown>)
					.map(([k, v]) => serialize(v, k, level + 1))
					.join('\n');
				return `${p}<${name}>\n${inner}\n${p}</${name}>`;
			}
			return `${p}<${name}>${escapeXml(String(value))}</${name}>`;
		};

		return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(obj, rootName, indent)}`;
	}

	static xmlToJson(xml: string): unknown {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xml, 'text/xml');
		if (doc.getElementsByTagName('parsererror').length > 0) {
			throw new Error('Invalid XML');
		}

		const elementToObj = (el: Element): unknown => {
			const children = Array.from(el.children);
			if (children.length === 0) {
				return el.textContent?.trim() || '';
			}
			const obj: Record<string, unknown> = {};
			for (const child of children) {
				const key = child.nodeName;
				const value = elementToObj(child);
				if (key in obj) {
					if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
					(obj[key] as unknown[]).push(value);
				} else {
					obj[key] = value;
				}
			}
			return obj;
		};

		return { [doc.documentElement.nodeName]: elementToObj(doc.documentElement) };
	}

	// ---------- CSV ----------
	static jsonToCsv(obj: unknown): string {
		let rows: Record<string, unknown>[];
		if (Array.isArray(obj)) {
			rows = obj as Record<string, unknown>[];
		} else {
			rows = [obj as Record<string, unknown>];
		}
		if (rows.length === 0) return '';

		const headers = Array.from(
			rows.reduce((set, row) => {
				Object.keys(row || {}).forEach((k) => set.add(k));
				return set;
			}, new Set<string>())
		);

		const escape = (val: unknown): string => {
			if (val === null || val === undefined) return '';
			const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
			if (str.includes(',') || str.includes('"') || str.includes('\n')) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		const headerLine = headers.join(',');
		const dataLines = rows.map((row) =>
			headers.map((h) => escape(row?.[h])).join(',')
		);
		return [headerLine, ...dataLines].join('\n');
	}

	static csvToJson(csv: string): unknown[] {
		const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
		if (lines.length === 0) return [];

		const parseLine = (line: string): string[] => {
			const result: string[] = [];
			let current = '';
			let inQuotes = false;
			for (let i = 0; i < line.length; i++) {
				const char = line[i];
				if (char === '"') {
					if (inQuotes && line[i + 1] === '"') {
						current += '"';
						i++;
					} else {
						inQuotes = !inQuotes;
					}
				} else if (char === ',' && !inQuotes) {
					result.push(current);
					current = '';
				} else {
					current += char;
				}
			}
			result.push(current);
			return result;
		};

		const headers = parseLine(lines[0]);
		return lines.slice(1).map((line) => {
			const values = parseLine(line);
			const obj: Record<string, unknown> = {};
			headers.forEach((h, i) => {
				const val = values[i] ?? '';
				if (/^-?\d+$/.test(val)) obj[h] = parseInt(val, 10);
				else if (/^-?\d*\.\d+$/.test(val)) obj[h] = parseFloat(val);
				else if (val === 'true') obj[h] = true;
				else if (val === 'false') obj[h] = false;
				else obj[h] = val;
			});
			return obj;
		});
	}

	// ---------- JSONPath (subset) ----------
	// Supports: $, .key, ['key'], [index], [*], .. (recursive descent), * wildcard
	static jsonPath(obj: unknown, path: string): unknown[] {
		if (!path.startsWith('$')) throw new Error('JSONPath must start with $');

		let tokens = path
			.replace(/\['([^']+)'\]/g, '.$1')
			.replace(/\[(\d+)\]/g, '.$1')
			.replace(/\[\*\]/g, '.*');

		const parts = tokens.split('.').slice(1); // drop leading $
		let current: unknown[] = [obj];

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part === '') {
				// recursive descent (..)
				const next: unknown[] = [];
				const collect = (val: unknown) => {
					if (val && typeof val === 'object') {
						next.push(val);
						Object.values(val).forEach(collect);
					}
				};
				current.forEach(collect);
				current = next;
				continue;
			}
			if (part === '*') {
				const next: unknown[] = [];
				current.forEach((val) => {
					if (Array.isArray(val)) next.push(...val);
					else if (val && typeof val === 'object') next.push(...Object.values(val));
				});
				current = next;
				continue;
			}
			const next: unknown[] = [];
			current.forEach((val) => {
				if (val && typeof val === 'object') {
					const target = (val as Record<string, unknown>)[part];
					if (target !== undefined) next.push(target);
				}
			});
			current = next;
		}

		return current;
	}
}

function needsQuote(str: string): boolean {
	return (
		str === '' ||
		/^[\d\s]|[:#\[\]{},&*!|>'"%@`]/.test(str) ||
		/^(true|false|null|yes|no)$/i.test(str) ||
		str.includes('\n') ||
		str.trim() !== str
	);
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
