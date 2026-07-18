export class TextService {
	static toUpperCase(str: string): string {
		return str.toUpperCase();
	}

	static toLowerCase(str: string): string {
		return str.toLowerCase();
	}

	static toTitleCase(str: string): string {
		return str.replace(/\b\w/g, (char) => char.toUpperCase());
	}

	static toCamelCase(str: string): string {
		return str
			.toLowerCase()
			.replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
	}

	static toSnakeCase(str: string): string {
		return str
			.replace(/([a-z])([A-Z])/g, '$1_$2')
			.replace(/[\s-]+/g, '_')
			.toLowerCase();
	}

	static toKebabCase(str: string): string {
		return str
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.replace(/[\s_]+/g, '-')
			.toLowerCase();
	}

	static toPascalCase(str: string): string {
		return str
			.split(/[\s-_]+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join('');
	}

	static reverse(str: string): string {
		return str.split('').reverse().join('');
	}

	static reverseLines(str: string): string {
		return str.split('\n').reverse().join('\n');
	}

	static reverseWords(str: string): string {
		return str.split(/\s+/).reverse().join(' ');
	}

	static countWords(str: string): number {
		const trimmed = str.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).length;
	}

	static countLines(str: string): number {
		if (!str) return 0;
		return str.split('\n').length;
	}

	static countCharacters(str: string, includeSpaces: boolean = true): number {
		return includeSpaces ? str.length : str.replace(/\s/g, '').length;
	}

	static wordFrequency(str: string): Record<string, number> {
		const words = str.toLowerCase().match(/\b\w+\b/g) || [];
		const frequency: Record<string, number> = {};

		words.forEach((word) => {
			frequency[word] = (frequency[word] || 0) + 1;
		});

		return frequency;
	}

	static removeDuplicateLines(str: string): string {
		const lines = str.split('\n');
		const unique = [...new Set(lines)];
		return unique.join('\n');
	}

	static sortLines(str: string, descending: boolean = false): string {
		const lines = str.split('\n');
		lines.sort();
		if (descending) lines.reverse();
		return lines.join('\n');
	}

	static trimLines(str: string): string {
		return str
			.split('\n')
			.map((line) => line.trim())
			.join('\n');
	}

	static removeBlankLines(str: string): string {
		return str
			.split('\n')
			.filter((line) => line.trim() !== '')
			.join('\n');
	}

	static slugify(str: string): string {
		return str
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-');
	}

	static statistics(str: string): {
		characters: number;
		charactersNoSpaces: number;
		words: number;
		lines: number;
		paragraphs: number;
	} {
		const lines = str.split('\n');
		const paragraphs = str.split(/\n\s*\n/).filter((p) => p.trim() !== '').length;

		return {
			characters: str.length,
			charactersNoSpaces: str.replace(/\s/g, '').length,
			words: this.countWords(str),
			lines: lines.length,
			paragraphs: Math.max(1, paragraphs)
		};
	}
}
