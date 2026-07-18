export class JsonService {
	static format(input: string, indent: number = 2): string {
		try {
			const parsed = JSON.parse(input);
			return JSON.stringify(parsed, null, indent);
		} catch (e) {
			throw new Error(`Invalid JSON: ${(e as Error).message}`);
		}
	}

	static minify(input: string): string {
		try {
			const parsed = JSON.parse(input);
			return JSON.stringify(parsed);
		} catch (e) {
			throw new Error(`Invalid JSON: ${(e as Error).message}`);
		}
	}

	static parse(input: string): { valid: boolean; data?: unknown; error?: string } {
		try {
			const data = JSON.parse(input);
			return { valid: true, data };
		} catch (e) {
			return { valid: false, error: (e as Error).message };
		}
	}

	static stringify(obj: unknown, indent: number = 2): string {
		try {
			return JSON.stringify(obj, null, indent);
		} catch (e) {
			throw new Error(`Cannot stringify: ${(e as Error).message}`);
		}
	}

	static sortKeys(obj: unknown, deep: boolean = true): unknown {
		if (Array.isArray(obj)) {
			return deep ? obj.map((item) => this.sortKeys(item, true)) : obj;
		}

		if (obj !== null && typeof obj === 'object') {
			const sorted: Record<string, unknown> = {};
			Object.keys(obj as Record<string, unknown>)
				.sort()
				.forEach((key) => {
					const value = (obj as Record<string, unknown>)[key];
					sorted[key] = deep ? this.sortKeys(value, true) : value;
				});
			return sorted;
		}

		return obj;
	}

	static getStatistics(obj: unknown): {
		type: string;
		size: number;
		depth: number;
		keys: number;
		values: number;
	} {
		const getDepth = (val: unknown): number => {
			if (Array.isArray(val)) {
				return val.length === 0 ? 0 : 1 + Math.max(...val.map(getDepth));
			}
			if (val !== null && typeof val === 'object') {
				const keys = Object.keys(val as Record<string, unknown>);
				return keys.length === 0 ? 0 : 1 + Math.max(...keys.map((k) => getDepth((val as Record<string, unknown>)[k])));
			}
			return 0;
		};

		const countKeys = (val: unknown): number => {
			if (Array.isArray(val)) {
				return val.reduce((sum, item) => sum + countKeys(item), 0);
			}
			if (val !== null && typeof val === 'object') {
				return Object.keys(val as Record<string, unknown>).reduce(
					(sum, key) => sum + 1 + countKeys((val as Record<string, unknown>)[key]),
					0
				);
			}
			return 1;
		};

		return {
			type: Array.isArray(obj) ? 'array' : typeof obj === 'object' ? 'object' : typeof obj,
			size: JSON.stringify(obj).length,
			depth: getDepth(obj),
			keys: countKeys(obj),
			values: Array.isArray(obj) ? obj.length : typeof obj === 'object' && obj !== null ? Object.keys(obj as object).length : 1
		};
	}
}
