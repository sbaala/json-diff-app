// Frontend-only JSON Schema generation, validation, and mock data generation.

type JsonSchema = Record<string, any>;

export class SchemaService {
	// Infer a JSON Schema (draft-07) from an example JSON value
	static generate(value: unknown): JsonSchema {
		const schema = infer(value);
		schema.$schema = 'http://json-schema.org/draft-07/schema#';
		return schema;
	}

	// Validate data against a (subset of) JSON Schema. Returns list of errors.
	static validate(data: unknown, schema: JsonSchema, path = '$'): string[] {
		const errors: string[] = [];

		if (schema.type) {
			const actual = jsonType(data);
			const types = Array.isArray(schema.type) ? schema.type : [schema.type];
			if (!types.includes(actual) && !(actual === 'integer' && types.includes('number'))) {
				errors.push(`${path}: expected type ${types.join('|')}, got ${actual}`);
				return errors;
			}
		}

		if (schema.enum && !schema.enum.includes(data)) {
			errors.push(`${path}: value must be one of ${JSON.stringify(schema.enum)}`);
		}

		if (jsonType(data) === 'object' && schema.properties) {
			const obj = data as Record<string, unknown>;
			if (Array.isArray(schema.required)) {
				for (const key of schema.required) {
					if (!(key in obj)) errors.push(`${path}.${key}: required property missing`);
				}
			}
			for (const [key, propSchema] of Object.entries(schema.properties)) {
				if (key in obj) {
					errors.push(...this.validate(obj[key], propSchema as JsonSchema, `${path}.${key}`));
				}
			}
		}

		if (jsonType(data) === 'array' && schema.items) {
			(data as unknown[]).forEach((item, i) => {
				errors.push(...this.validate(item, schema.items, `${path}[${i}]`));
			});
			if (typeof schema.minItems === 'number' && (data as unknown[]).length < schema.minItems) {
				errors.push(`${path}: array shorter than minItems ${schema.minItems}`);
			}
		}

		if (jsonType(data) === 'string') {
			const s = data as string;
			if (typeof schema.minLength === 'number' && s.length < schema.minLength)
				errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
			if (typeof schema.maxLength === 'number' && s.length > schema.maxLength)
				errors.push(`${path}: string longer than maxLength ${schema.maxLength}`);
			if (schema.pattern && !new RegExp(schema.pattern).test(s))
				errors.push(`${path}: string does not match pattern ${schema.pattern}`);
		}

		if (jsonType(data) === 'number' || jsonType(data) === 'integer') {
			const n = data as number;
			if (typeof schema.minimum === 'number' && n < schema.minimum)
				errors.push(`${path}: value below minimum ${schema.minimum}`);
			if (typeof schema.maximum === 'number' && n > schema.maximum)
				errors.push(`${path}: value above maximum ${schema.maximum}`);
		}

		return errors;
	}

	// Generate mock data that conforms to a JSON Schema
	static mock(schema: JsonSchema): unknown {
		const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

		if (schema.enum) return schema.enum[0];
		if (schema.default !== undefined) return schema.default;
		if (schema.example !== undefined) return schema.example;

		switch (type) {
			case 'object': {
				const obj: Record<string, unknown> = {};
				const props = schema.properties || {};
				for (const [key, propSchema] of Object.entries(props)) {
					obj[key] = this.mock(propSchema as JsonSchema);
				}
				return obj;
			}
			case 'array': {
				const count = schema.minItems || 2;
				return Array.from({ length: count }, () => this.mock(schema.items || { type: 'string' }));
			}
			case 'string':
				return mockString(schema);
			case 'integer':
				return schema.minimum ?? 42;
			case 'number':
				return schema.minimum ?? 3.14;
			case 'boolean':
				return true;
			case 'null':
				return null;
			default:
				return 'sample';
		}
	}
}

function infer(value: unknown): JsonSchema {
	const type = jsonType(value);
	switch (type) {
		case 'object': {
			const obj = value as Record<string, unknown>;
			const properties: Record<string, JsonSchema> = {};
			const required: string[] = [];
			for (const [key, val] of Object.entries(obj)) {
				properties[key] = infer(val);
				required.push(key);
			}
			return { type: 'object', properties, ...(required.length ? { required } : {}) };
		}
		case 'array': {
			const arr = value as unknown[];
			if (arr.length === 0) return { type: 'array', items: {} };
			return { type: 'array', items: infer(arr[0]) };
		}
		case 'integer':
			return { type: 'integer' };
		case 'number':
			return { type: 'number' };
		case 'boolean':
			return { type: 'boolean' };
		case 'null':
			return { type: 'null' };
		default: {
			const s = value as string;
			const schema: JsonSchema = { type: 'string' };
			if (/^\S+@\S+\.\S+$/.test(s)) schema.format = 'email';
			else if (/^https?:\/\//.test(s)) schema.format = 'uri';
			else if (/^\d{4}-\d{2}-\d{2}/.test(s)) schema.format = 'date-time';
			return schema;
		}
	}
}

function mockString(schema: JsonSchema): string {
	switch (schema.format) {
		case 'email':
			return 'user@example.com';
		case 'uri':
			return 'https://example.com';
		case 'date-time':
			return new Date().toISOString();
		case 'uuid':
			return '00000000-0000-4000-8000-000000000000';
		default:
			return 'string';
	}
}

function jsonType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
	return typeof value;
}
