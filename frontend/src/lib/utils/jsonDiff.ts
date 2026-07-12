// Client-side JSON diff utility for files < 3MB

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffLine {
	type: DiffType;
	path: string;
	key: string;
	leftValue?: unknown;
	rightValue?: unknown;
	depth: number;
	isOpen?: boolean;
	isClose?: boolean;
	line: string;
}

export interface InlineDiffResult {
	lines: DiffLine[];
	stats: {
		added: number;
		removed: number;
		modified: number;
		unchanged: number;
	};
}

function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (typeof value === 'string') return `"${value}"`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

function isObject(val: unknown): val is Record<string, unknown> {
	return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isArray(val: unknown): val is unknown[] {
	return Array.isArray(val);
}

export function computeInlineDiff(
	left: unknown,
	right: unknown,
	ignoreOrder: boolean = false
): InlineDiffResult {
	const lines: DiffLine[] = [];
	const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };

	function addLine(
		type: DiffType,
		path: string,
		key: string,
		depth: number,
		leftValue?: unknown,
		rightValue?: unknown,
		isOpen?: boolean,
		isClose?: boolean
	) {
		let line = '';
		const indent = '  '.repeat(depth);
		const displayKey = key ? `"${key}": ` : '';

		if (isOpen) {
			const bracket = isArray(leftValue ?? rightValue) ? '[' : '{';
			line = `${indent}${displayKey}${bracket}`;
		} else if (isClose) {
			const bracket = isArray(leftValue ?? rightValue) ? ']' : '}';
			line = `${indent}${bracket}`;
		} else {
			const value = type === 'removed' ? leftValue : rightValue;
			line = `${indent}${displayKey}${formatValue(value)}`;
		}

		lines.push({ type, path, key, leftValue, rightValue, depth, isOpen, isClose, line });

		if (!isOpen && !isClose) {
			stats[type]++;
		}
	}

	function diffValue(
		l: unknown,
		r: unknown,
		path: string,
		key: string,
		depth: number
	) {
		const lIsObj = isObject(l);
		const rIsObj = isObject(r);
		const lIsArr = isArray(l);
		const rIsArr = isArray(r);

		// Both are objects
		if (lIsObj && rIsObj) {
			addLine('unchanged', path, key, depth, l, r, true);
			diffObjects(l, r, path, depth + 1);
			addLine('unchanged', path, key, depth, l, r, false, true);
			return;
		}

		// Both are arrays
		if (lIsArr && rIsArr) {
			addLine('unchanged', path, key, depth, l, r, true);
			diffArrays(l, r, path, depth + 1, ignoreOrder);
			addLine('unchanged', path, key, depth, l, r, false, true);
			return;
		}

		// Type mismatch (one is object/array, other is primitive)
		if ((lIsObj || lIsArr) !== (rIsObj || rIsArr)) {
			// Remove old structure
			if (lIsObj) {
				addLine('removed', path, key, depth, l, undefined, true);
				diffObjects(l, {} as Record<string, unknown>, path, depth + 1);
				addLine('removed', path, key, depth, l, undefined, false, true);
			} else if (lIsArr) {
				addLine('removed', path, key, depth, l, undefined, true);
				diffArrays(l, [], path, depth + 1, ignoreOrder);
				addLine('removed', path, key, depth, l, undefined, false, true);
			} else if (l !== undefined) {
				addLine('removed', path, key, depth, l, undefined);
			}

			// Add new structure
			if (rIsObj) {
				addLine('added', path, key, depth, undefined, r, true);
				diffObjects({} as Record<string, unknown>, r, path, depth + 1);
				addLine('added', path, key, depth, undefined, r, false, true);
			} else if (rIsArr) {
				addLine('added', path, key, depth, undefined, r, true);
				diffArrays([], r, path, depth + 1, ignoreOrder);
				addLine('added', path, key, depth, undefined, r, false, true);
			} else if (r !== undefined) {
				addLine('added', path, key, depth, undefined, r);
			}
			return;
		}

		// Both are primitives
		if (l === r) {
			addLine('unchanged', path, key, depth, l, r);
		} else if (l !== undefined && r !== undefined) {
			addLine('removed', path, key, depth, l, undefined);
			addLine('added', path, key, depth, undefined, r);
		} else if (l !== undefined) {
			addLine('removed', path, key, depth, l, undefined);
		} else {
			addLine('added', path, key, depth, undefined, r);
		}
	}

	function diffObjects(
		l: Record<string, unknown>,
		r: Record<string, unknown>,
		basePath: string,
		depth: number
	) {
		const allKeys = new Set([...Object.keys(l), ...Object.keys(r)]);
		const sortedKeys = Array.from(allKeys).sort();

		for (const key of sortedKeys) {
			const path = basePath ? `${basePath}.${key}` : key;
			const hasLeft = key in l;
			const hasRight = key in r;

			if (hasLeft && hasRight) {
				diffValue(l[key], r[key], path, key, depth);
			} else if (hasLeft) {
				const val = l[key];
				if (isObject(val)) {
					addLine('removed', path, key, depth, val, undefined, true);
					diffObjects(val, {} as Record<string, unknown>, path, depth + 1);
					addLine('removed', path, key, depth, val, undefined, false, true);
				} else if (isArray(val)) {
					addLine('removed', path, key, depth, val, undefined, true);
					diffArrays(val, [], path, depth + 1, ignoreOrder);
					addLine('removed', path, key, depth, val, undefined, false, true);
				} else {
					addLine('removed', path, key, depth, val, undefined);
				}
			} else {
				const val = r[key];
				if (isObject(val)) {
					addLine('added', path, key, depth, undefined, val, true);
					diffObjects({} as Record<string, unknown>, val, path, depth + 1);
					addLine('added', path, key, depth, undefined, val, false, true);
				} else if (isArray(val)) {
					addLine('added', path, key, depth, undefined, val, true);
					diffArrays([], val, path, depth + 1, ignoreOrder);
					addLine('added', path, key, depth, undefined, val, false, true);
				} else {
					addLine('added', path, key, depth, undefined, val);
				}
			}
		}
	}

	function diffArrays(
		l: unknown[],
		r: unknown[],
		basePath: string,
		depth: number,
		ignoreOrder: boolean
	) {
		if (ignoreOrder) {
			// For ignore order, match items by value
			const lMatched = new Set<number>();
			const rMatched = new Set<number>();

			// Find matching items
			for (let i = 0; i < l.length; i++) {
				for (let j = 0; j < r.length; j++) {
					if (!rMatched.has(j) && JSON.stringify(l[i]) === JSON.stringify(r[j])) {
						lMatched.add(i);
						rMatched.add(j);
						break;
					}
				}
			}

			// Show removed items first
			for (let i = 0; i < l.length; i++) {
				if (!lMatched.has(i)) {
					const path = `${basePath}[${i}]`;
					const val = l[i];
					if (isObject(val)) {
						addLine('removed', path, '', depth, val, undefined, true);
						diffObjects(val, {} as Record<string, unknown>, path, depth + 1);
						addLine('removed', path, '', depth, val, undefined, false, true);
					} else if (isArray(val)) {
						addLine('removed', path, '', depth, val, undefined, true);
						diffArrays(val, [], path, depth + 1, ignoreOrder);
						addLine('removed', path, '', depth, val, undefined, false, true);
					} else {
						addLine('removed', path, '', depth, val, undefined);
					}
				}
			}

			// Show unchanged items
			for (let i = 0; i < l.length; i++) {
				if (lMatched.has(i)) {
					const path = `${basePath}[${i}]`;
					diffValue(l[i], l[i], path, '', depth);
				}
			}

			// Show added items
			for (let j = 0; j < r.length; j++) {
				if (!rMatched.has(j)) {
					const path = `${basePath}[${j}]`;
					const val = r[j];
					if (isObject(val)) {
						addLine('added', path, '', depth, undefined, val, true);
						diffObjects({} as Record<string, unknown>, val, path, depth + 1);
						addLine('added', path, '', depth, undefined, val, false, true);
					} else if (isArray(val)) {
						addLine('added', path, '', depth, undefined, val, true);
						diffArrays([], val, path, depth + 1, ignoreOrder);
						addLine('added', path, '', depth, undefined, val, false, true);
					} else {
						addLine('added', path, '', depth, undefined, val);
					}
				}
			}
		} else {
			// Order-sensitive comparison
			const maxLen = Math.max(l.length, r.length);
			for (let i = 0; i < maxLen; i++) {
				const path = `${basePath}[${i}]`;
				const hasLeft = i < l.length;
				const hasRight = i < r.length;

				if (hasLeft && hasRight) {
					diffValue(l[i], r[i], path, '', depth);
				} else if (hasLeft) {
					const val = l[i];
					if (isObject(val)) {
						addLine('removed', path, '', depth, val, undefined, true);
						diffObjects(val, {} as Record<string, unknown>, path, depth + 1);
						addLine('removed', path, '', depth, val, undefined, false, true);
					} else if (isArray(val)) {
						addLine('removed', path, '', depth, val, undefined, true);
						diffArrays(val, [], path, depth + 1, ignoreOrder);
						addLine('removed', path, '', depth, val, undefined, false, true);
					} else {
						addLine('removed', path, '', depth, val, undefined);
					}
				} else {
					const val = r[i];
					if (isObject(val)) {
						addLine('added', path, '', depth, undefined, val, true);
						diffObjects({} as Record<string, unknown>, val, path, depth + 1);
						addLine('added', path, '', depth, undefined, val, false, true);
					} else if (isArray(val)) {
						addLine('added', path, '', depth, undefined, val, true);
						diffArrays([], val, path, depth + 1, ignoreOrder);
						addLine('added', path, '', depth, undefined, val, false, true);
					} else {
						addLine('added', path, '', depth, undefined, val);
					}
				}
			}
		}
	}

	// Start diff
	if (isObject(left) && isObject(right)) {
		addLine('unchanged', '', '', 0, left, right, true);
		diffObjects(left, right, '', 1);
		addLine('unchanged', '', '', 0, left, right, false, true);
	} else if (isArray(left) && isArray(right)) {
		addLine('unchanged', '', '', 0, left, right, true);
		diffArrays(left, right, '', 1, ignoreOrder);
		addLine('unchanged', '', '', 0, left, right, false, true);
	} else {
		diffValue(left, right, '', '', 0);
	}

	return { lines, stats };
}
