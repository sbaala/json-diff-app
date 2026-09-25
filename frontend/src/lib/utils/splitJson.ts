export interface JsonDocument {
	text: string;
	value: unknown;
}

/**
 * Split text holding several top-level JSON objects/arrays — concatenated,
 * newline-delimited (NDJSON) or comma-separated — into individual documents.
 * Returns null unless there are at least two and every one parses, so callers
 * can fall back to reporting the original parse error.
 */
export function splitJsonDocuments(input: string): JsonDocument[] | null {
	const docs: JsonDocument[] = [];
	const len = input.length;
	let i = 0;

	while (i < len) {
		const ch = input[i];
		if (ch === ',' || /\s/.test(ch)) {
			i++;
			continue;
		}
		if (ch !== '{' && ch !== '[') return null;

		const start = i;
		let depth = 0;
		let inString = false;
		for (; i < len; i++) {
			const c = input[i];
			if (inString) {
				if (c === '\\') i++;
				else if (c === '"') inString = false;
			} else if (c === '"') {
				inString = true;
			} else if (c === '{' || c === '[') {
				depth++;
			} else if (c === '}' || c === ']') {
				depth--;
				if (depth === 0) break;
			}
		}
		if (depth !== 0) return null;

		const text = input.slice(start, ++i);
		try {
			docs.push({ text, value: JSON.parse(text) });
		} catch {
			return null;
		}
	}

	return docs.length >= 2 ? docs : null;
}
