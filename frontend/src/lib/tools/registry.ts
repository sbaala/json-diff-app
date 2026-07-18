import type { ToolMetadata, ToolCategory, CategoryInfo } from '$lib/types';

export const TOOL_CATEGORIES: Record<ToolCategory, CategoryInfo> = {
	'json-api': {
		id: 'json-api',
		name: 'JSON & API Tools',
		description: 'Parse, validate, and transform JSON structures',
		icon: 'code',
		color: '--color-category-json'
	},
	'text-utils': {
		id: 'text-utils',
		name: 'Text Utilities',
		description: 'Text manipulation and encoding tools',
		icon: 'type',
		color: '--color-category-text'
	},
	'date-time': {
		id: 'date-time',
		name: 'Date & Time',
		description: 'Timestamp, timezone, and date utilities',
		icon: 'calendar',
		color: '--color-category-date'
	},
	'jwt-security': {
		id: 'jwt-security',
		name: 'JWT & Security',
		description: 'Cryptography, hashing, and token tools',
		icon: 'lock',
		color: '--color-category-jwt'
	},
	'api-dev': {
		id: 'api-dev',
		name: 'API Development',
		description: 'REST, GraphQL, and API utilities',
		icon: 'zap',
		color: '--color-category-api'
	}
};

export const TOOLS: ToolMetadata[] = [
	// JSON & API Tools (15 tools)
	{
		id: 'json-formatter',
		name: 'JSON Formatter',
		description: 'Beautify, minify, and sort JSON with custom formatting',
		category: 'json-api',
		icon: 'sparkles',
		keywords: ['format', 'beautify', 'minify', 'indent', 'pretty'],
		featured: true
	},
	{
		id: 'json-validator',
		name: 'JSON Validator',
		description: 'Validate JSON syntax and structure',
		category: 'json-api',
		icon: 'check-circle',
		keywords: ['validate', 'check', 'syntax', 'error']
	},
	{
		id: 'json-viewer',
		name: 'JSON Viewer',
		description: 'View JSON in tree structure with search and filtering',
		category: 'json-api',
		icon: 'tree',
		keywords: ['view', 'tree', 'structure', 'explore'],
		featured: true
	},
	{
		id: 'json-comparator',
		name: 'JSON Comparator',
		description: 'Compare two JSON objects and highlight differences',
		category: 'json-api',
		icon: 'diff',
		keywords: ['compare', 'diff', 'difference', 'merge']
	},
	{
		id: 'json-to-yaml',
		name: 'JSON ↔ YAML',
		description: 'Convert between JSON and YAML formats',
		category: 'json-api',
		icon: 'arrow-right-left',
		keywords: ['convert', 'yaml', 'transform']
	},
	{
		id: 'json-to-xml',
		name: 'JSON ↔ XML',
		description: 'Convert between JSON and XML formats',
		category: 'json-api',
		icon: 'arrow-right-left',
		keywords: ['convert', 'xml', 'transform']
	},
	{
		id: 'json-to-csv',
		name: 'JSON ↔ CSV',
		description: 'Convert between JSON and CSV formats',
		category: 'json-api',
		icon: 'arrow-right-left',
		keywords: ['convert', 'csv', 'spreadsheet', 'table']
	},
	{
		id: 'jsonpath-extractor',
		name: 'JSONPath Extractor',
		description: 'Extract data from JSON using JSONPath expressions',
		category: 'json-api',
		icon: 'filter',
		keywords: ['jsonpath', 'extract', 'query', 'path']
	},
	{
		id: 'jq-playground',
		name: 'jq Playground',
		description: 'Test jq filter expressions on JSON data',
		category: 'json-api',
		icon: 'zap',
		keywords: ['jq', 'filter', 'query', 'playground']
	},
	{
		id: 'json-schema-generator',
		name: 'JSON Schema Generator',
		description: 'Generate JSON Schema from JSON data',
		category: 'json-api',
		icon: 'layers',
		keywords: ['schema', 'generate', 'structure', 'type']
	},
	{
		id: 'json-schema-validator',
		name: 'JSON Schema Validator',
		description: 'Validate JSON against a schema',
		category: 'json-api',
		icon: 'shield-check',
		keywords: ['schema', 'validate', 'check']
	},
	{
		id: 'graphql-formatter',
		name: 'GraphQL Formatter',
		description: 'Format and beautify GraphQL queries',
		category: 'json-api',
		icon: 'code',
		keywords: ['graphql', 'format', 'query']
	},
	{
		id: 'swagger-validator',
		name: 'Swagger/OpenAPI Validator',
		description: 'Validate OpenAPI/Swagger specifications',
		category: 'json-api',
		icon: 'check-circle',
		keywords: ['swagger', 'openapi', 'api', 'validate']
	},
	{
		id: 'openapi-viewer',
		name: 'OpenAPI Viewer',
		description: 'View and browse OpenAPI specifications',
		category: 'json-api',
		icon: 'book-open',
		keywords: ['openapi', 'swagger', 'api', 'documentation']
	},
	{
		id: 'mock-api-generator',
		name: 'Mock API Generator',
		description: 'Generate mock API responses from schemas',
		category: 'json-api',
		icon: 'wand',
		keywords: ['mock', 'generate', 'fake', 'dummy']
	},

	// Text Utilities (13 tools)
	{
		id: 'base64-encoder',
		name: 'Base64 Encoder',
		description: 'Encode text to Base64',
		category: 'text-utils',
		icon: 'encoding',
		keywords: ['base64', 'encode', 'text']
	},
	{
		id: 'base64-decoder',
		name: 'Base64 Decoder',
		description: 'Decode Base64 to text',
		category: 'text-utils',
		icon: 'encoding',
		keywords: ['base64', 'decode', 'text']
	},
	{
		id: 'url-encoder',
		name: 'URL Encoder',
		description: 'Encode/decode URL components',
		category: 'text-utils',
		icon: 'link',
		keywords: ['url', 'encode', 'uri', 'percent']
	},
	{
		id: 'html-encoder',
		name: 'HTML Entity Encoder',
		description: 'Encode/decode HTML entities',
		category: 'text-utils',
		icon: 'code',
		keywords: ['html', 'entity', 'encode', 'decode']
	},
	{
		id: 'unicode-converter',
		name: 'Unicode Converter',
		description: 'Convert between Unicode and character representations',
		category: 'text-utils',
		icon: 'globe',
		keywords: ['unicode', 'character', 'code', 'convert']
	},
	{
		id: 'json-escape',
		name: 'JSON Escape/Unescape',
		description: 'Escape or unescape JSON strings',
		category: 'text-utils',
		icon: 'quote',
		keywords: ['json', 'escape', 'unescape', 'string']
	},
	{
		id: 'text-diff',
		name: 'Text Diff',
		description: 'Compare and highlight differences in text',
		category: 'text-utils',
		icon: 'diff',
		keywords: ['diff', 'compare', 'text', 'difference'],
		featured: true
	},
	{
		id: 'case-converter',
		name: 'Case Converter',
		description: 'Convert text between different cases (camelCase, snake_case, etc)',
		category: 'text-utils',
		icon: 'type',
		keywords: ['case', 'camel', 'snake', 'kebab', 'pascal']
	},
	{
		id: 'text-reverse',
		name: 'Text Reverser',
		description: 'Reverse text, words, or lines',
		category: 'text-utils',
		icon: 'arrow-left-right',
		keywords: ['reverse', 'text', 'word', 'line']
	},
	{
		id: 'word-counter',
		name: 'Word Counter',
		description: 'Count words, characters, lines, and more',
		category: 'text-utils',
		icon: 'bar-chart-2',
		keywords: ['count', 'word', 'character', 'line', 'statistics']
	},
	{
		id: 'line-sorter',
		name: 'Line Sorter',
		description: 'Sort, remove duplicates, and filter lines',
		category: 'text-utils',
		icon: 'sort-asc',
		keywords: ['sort', 'line', 'duplicate', 'filter']
	},
	{
		id: 'whitespace-cleaner',
		name: 'Whitespace Cleaner',
		description: 'Remove, trim, or normalize whitespace',
		category: 'text-utils',
		icon: 'eraser',
		keywords: ['whitespace', 'trim', 'clean', 'space']
	},
	{
		id: 'regex-tester',
		name: 'Regex Tester',
		description: 'Test and debug regular expressions',
		category: 'text-utils',
		icon: 'search',
		keywords: ['regex', 'regular', 'expression', 'test', 'match']
	},

	// Date & Time (9 tools)
	{
		id: 'unix-timestamp',
		name: 'Unix Timestamp Converter',
		description: 'Convert between Unix timestamps and dates',
		category: 'date-time',
		icon: 'clock',
		keywords: ['timestamp', 'unix', 'epoch', 'date']
	},
	{
		id: 'timezone-converter',
		name: 'Timezone Converter',
		description: 'Convert times between different timezones',
		category: 'date-time',
		icon: 'globe',
		keywords: ['timezone', 'time', 'utc', 'zone']
	},
	{
		id: 'date-calculator',
		name: 'Date Calculator',
		description: 'Calculate differences and add/subtract days',
		category: 'date-time',
		icon: 'calculator',
		keywords: ['date', 'calculate', 'difference', 'days']
	},
	{
		id: 'business-day-calculator',
		name: 'Business Day Calculator',
		description: 'Calculate business days excluding weekends and holidays',
		category: 'date-time',
		icon: 'briefcase',
		keywords: ['business', 'day', 'weekend', 'holiday']
	},
	{
		id: 'cron-builder',
		name: 'Cron Builder',
		description: 'Build and test cron expressions visually',
		category: 'date-time',
		icon: 'settings',
		keywords: ['cron', 'schedule', 'expression', 'build']
	},
	{
		id: 'cron-parser',
		name: 'Cron Parser',
		description: 'Parse and explain cron expressions',
		category: 'date-time',
		icon: 'info',
		keywords: ['cron', 'parse', 'explain', 'expression']
	},
	{
		id: 'iso8601-converter',
		name: 'ISO8601 Converter',
		description: 'Convert dates to/from ISO 8601 format',
		category: 'date-time',
		icon: 'calendar',
		keywords: ['iso8601', 'date', 'format', 'convert']
	},
	{
		id: 'relative-time',
		name: 'Relative Time',
		description: 'Convert dates to relative times (2 hours ago, etc)',
		category: 'date-time',
		icon: 'clock',
		keywords: ['relative', 'time', 'ago', 'humanize']
	},
	{
		id: 'timestamp-generator',
		name: 'Timestamp Generator',
		description: 'Generate Unix timestamps in various formats',
		category: 'date-time',
		icon: 'plus',
		keywords: ['timestamp', 'generate', 'unix', 'epoch']
	},

	// JWT & Security (13 tools)
	{
		id: 'jwt-decoder',
		name: 'JWT Decoder',
		description: 'Decode and inspect JWT tokens',
		category: 'jwt-security',
		icon: 'unlock',
		keywords: ['jwt', 'decode', 'token', 'inspect'],
		featured: true
	},
	{
		id: 'jwt-validator',
		name: 'JWT Validator',
		description: 'Validate JWT tokens with signature verification',
		category: 'jwt-security',
		icon: 'shield-check',
		keywords: ['jwt', 'validate', 'token', 'signature']
	},
	{
		id: 'jwt-generator',
		name: 'JWT Generator',
		description: 'Generate and sign JWT tokens',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['jwt', 'generate', 'token', 'sign']
	},
	{
		id: 'oauth-url-builder',
		name: 'OAuth URL Builder',
		description: 'Build OAuth authorization URLs',
		category: 'jwt-security',
		icon: 'share-2',
		keywords: ['oauth', 'url', 'authorize', 'builder']
	},
	{
		id: 'oauth-pkce-generator',
		name: 'OAuth PKCE Generator',
		description: 'Generate PKCE code challenge and verifier',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['oauth', 'pkce', 'code', 'challenge']
	},
	{
		id: 'uuid-generator',
		name: 'UUID Generator',
		description: 'Generate UUIDs (v1, v4, v5)',
		category: 'jwt-security',
		icon: 'hash',
		keywords: ['uuid', 'generate', 'unique', 'identifier']
	},
	{
		id: 'ulid-generator',
		name: 'ULID Generator',
		description: 'Generate ULIDs (sortable unique identifiers)',
		category: 'jwt-security',
		icon: 'hash',
		keywords: ['ulid', 'generate', 'unique', 'sortable']
	},
	{
		id: 'hash-generator',
		name: 'Hash Generator',
		description: 'Generate hashes (MD5, SHA1, SHA256, SHA512)',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['hash', 'md5', 'sha', 'generate', 'checksum']
	},
	{
		id: 'hmac-generator',
		name: 'HMAC Generator',
		description: 'Generate HMAC signatures with various algorithms',
		category: 'jwt-security',
		icon: 'key',
		keywords: ['hmac', 'signature', 'generate', 'hash']
	},
	{
		id: 'bcrypt-generator',
		name: 'Password Hash Generator',
		description: 'Generate salted password hashes (PBKDF2)',
		category: 'jwt-security',
		icon: 'lock',
		keywords: ['bcrypt', 'password', 'hash', 'generate', 'pbkdf2']
	},
	{
		id: 'password-generator',
		name: 'Password Generator',
		description: 'Generate secure random passwords with strength meter',
		category: 'jwt-security',
		icon: 'lock',
		keywords: ['password', 'generate', 'random', 'secure', 'strength']
	},
	{
		id: 'aes-crypto',
		name: 'AES Encrypt/Decrypt',
		description: 'Encrypt and decrypt data with AES',
		category: 'jwt-security',
		icon: 'lock',
		keywords: ['aes', 'encrypt', 'decrypt', 'crypto']
	},
	{
		id: 'secret-generator',
		name: 'Secret Generator',
		description: 'Generate random secrets and API keys',
		category: 'jwt-security',
		icon: 'shield',
		keywords: ['secret', 'generate', 'random', 'key', 'api']
	},
	{
		id: 'qr-code-generator',
		name: 'QR Code Generator',
		description: 'Generate QR codes from text or URLs',
		category: 'jwt-security',
		icon: 'square',
		keywords: ['qr', 'code', 'generate', 'barcode']
	},

	// API Development (14 tools)
	{
		id: 'rest-client',
		name: 'REST Client',
		description: 'Test API endpoints with request builder',
		category: 'api-dev',
		icon: 'globe',
		keywords: ['rest', 'api', 'http', 'request', 'client'],
		featured: true
	},
	{
		id: 'http-header-builder',
		name: 'HTTP Header Builder',
		description: 'Build and generate HTTP headers',
		category: 'api-dev',
		icon: 'layers',
		keywords: ['header', 'http', 'request', 'builder']
	},
	{
		id: 'curl-converter',
		name: 'cURL Converter',
		description: 'Convert cURL to HTTP, JavaScript, Python, etc',
		category: 'api-dev',
		icon: 'arrow-right-left',
		keywords: ['curl', 'convert', 'http', 'code', 'request']
	},
	{
		id: 'postman-generator',
		name: 'Postman Collection Generator',
		description: 'Generate Postman collections from API specs',
		category: 'api-dev',
		icon: 'download',
		keywords: ['postman', 'collection', 'generate', 'export']
	},
	{
		id: 'http-status-lookup',
		name: 'HTTP Status Lookup',
		description: 'Look up HTTP status codes and meanings',
		category: 'api-dev',
		icon: 'info',
		keywords: ['http', 'status', 'code', 'lookup', 'error']
	},
	{
		id: 'mime-type-lookup',
		name: 'MIME Type Lookup',
		description: 'Look up MIME types by file extension',
		category: 'api-dev',
		icon: 'file',
		keywords: ['mime', 'type', 'content', 'extension']
	},
	{
		id: 'request-response-diff',
		name: 'Request/Response Diff',
		description: 'Compare API request and response payloads',
		category: 'api-dev',
		icon: 'diff',
		keywords: ['diff', 'request', 'response', 'compare']
	},
	{
		id: 'graphql-client',
		name: 'GraphQL Client',
		description: 'Test GraphQL queries and mutations',
		category: 'api-dev',
		icon: 'zap',
		keywords: ['graphql', 'query', 'mutation', 'client']
	},
	{
		id: 'xml-formatter',
		name: 'XML Formatter',
		description: 'Format and beautify XML',
		category: 'api-dev',
		icon: 'code',
		keywords: ['xml', 'format', 'beautify', 'minify']
	},
	{
		id: 'soap-builder',
		name: 'SOAP Request Builder',
		description: 'Build SOAP XML requests',
		category: 'api-dev',
		icon: 'layers',
		keywords: ['soap', 'xml', 'request', 'builder']
	},
	{
		id: 'webhook-tester',
		name: 'Webhook Tester',
		description: 'Test webhooks and inspect payloads',
		category: 'api-dev',
		icon: 'send',
		keywords: ['webhook', 'test', 'payload', 'inspector']
	},
	{
		id: 'api-rate-limiter',
		name: 'API Rate Limiter Calculator',
		description: 'Calculate and simulate API rate limiting',
		category: 'api-dev',
		icon: 'zap',
		keywords: ['rate', 'limit', 'throttle', 'calculator']
	},
	{
		id: 'cors-validator',
		name: 'CORS Validator',
		description: 'Validate CORS headers and configuration',
		category: 'api-dev',
		icon: 'shield-check',
		keywords: ['cors', 'validate', 'headers', 'origin']
	},
	{
		id: 'form-data-generator',
		name: 'Form Data Generator',
		description: 'Generate form data and multipart payloads',
		category: 'api-dev',
		icon: 'form',
		keywords: ['form', 'data', 'multipart', 'generate']
	}
];

export function getToolsByCategory(category: ToolCategory): ToolMetadata[] {
	return TOOLS.filter((t) => t.category === category);
}

export function searchTools(query: string): ToolMetadata[] {
	const q = query.toLowerCase();
	return TOOLS.filter(
		(t) =>
			t.name.toLowerCase().includes(q) ||
			t.description.toLowerCase().includes(q) ||
			t.keywords.some((k) => k.toLowerCase().includes(q))
	);
}

export function getFeaturedTools(): ToolMetadata[] {
	return TOOLS.filter((t) => t.featured);
}
