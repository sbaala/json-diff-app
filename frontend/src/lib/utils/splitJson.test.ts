import { describe, it, expect } from 'vitest';
import { splitJsonDocuments } from './splitJson';

describe('splitJsonDocuments', () => {
	it('splits concatenated objects', () => {
		const docs = splitJsonDocuments('{"a":1}{"b":2}');
		expect(docs?.map((d) => d.value)).toEqual([{ a: 1 }, { b: 2 }]);
	});

	it('splits NDJSON and comma-separated documents', () => {
		expect(splitJsonDocuments('{"a":1}\n{"b":2}\n[3]\n')?.length).toBe(3);
		expect(splitJsonDocuments('{"a":1},\n{"b":2}')?.length).toBe(2);
	});

	it('ignores braces and escaped quotes inside strings', () => {
		const docs = splitJsonDocuments('{"s":"}{\\"]"} {"t":"["}');
		expect(docs?.map((d) => d.value)).toEqual([{ s: '}{"]' }, { t: '[' }]);
	});

	it('keeps the original text of each document', () => {
		const docs = splitJsonDocuments('{\n  "a": 1\n}\n\n{"b":2}');
		expect(docs?.[0].text).toBe('{\n  "a": 1\n}');
	});

	it('returns null for a single document', () => {
		expect(splitJsonDocuments('{"a":1}')).toBeNull();
	});

	it('returns null when any document is invalid', () => {
		expect(splitJsonDocuments('{"a":1}{"b":}')).toBeNull();
		expect(splitJsonDocuments('{"a":1}{"b":2')).toBeNull();
		expect(splitJsonDocuments('{"a":1} garbage')).toBeNull();
	});
});
