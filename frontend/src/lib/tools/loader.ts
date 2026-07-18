// Map of tool IDs to their components
// Using any type for dynamic component loading as per Svelte patterns
const toolMap: Record<string, () => Promise<{ default: any }>> = {
	// ---- JSON & API tools ----
	'json-formatter': () => import('./json-tools/JSONFormatter.svelte'),
	'json-validator': () => import('./json-tools/JSONValidator.svelte'),
	'json-viewer': () => import('./json-tools/JSONViewer.svelte'),
	'json-comparator': () => import('./json-tools/JSONComparator.svelte'),
	'json-to-yaml': () => import('./json-tools/JSONToYaml.svelte'),
	'json-to-xml': () => import('./json-tools/JSONToXml.svelte'),
	'json-to-csv': () => import('./json-tools/JSONToCsv.svelte'),
	'jsonpath-extractor': () => import('./json-tools/JSONPathExtractor.svelte'),
	'jq-playground': () => import('./json-tools/JQPlayground.svelte'),
	'json-schema-generator': () => import('./json-tools/JSONSchemaGenerator.svelte'),
	'json-schema-validator': () => import('./json-tools/JSONSchemaValidator.svelte'),
	'graphql-formatter': () => import('./json-tools/GraphQLFormatter.svelte'),
	'swagger-validator': () => import('./json-tools/SwaggerValidator.svelte'),
	'openapi-viewer': () => import('./json-tools/OpenAPIViewer.svelte'),
	'mock-api-generator': () => import('./json-tools/MockAPIGenerator.svelte'),

	// ---- Text tools ----
	'case-converter': () => import('./text-tools/CaseConverter.svelte'),
	'text-reverse': () => import('./text-tools/TextReverser.svelte'),
	'word-counter': () => import('./text-tools/WordCounter.svelte'),
	'line-sorter': () => import('./text-tools/LineSorter.svelte'),
	'base64-encoder': () => import('./text-tools/Base64Encoder.svelte'),
	'base64-decoder': () => import('./text-tools/Base64Decoder.svelte'),
	'url-encoder': () => import('./text-tools/URLEncoder.svelte'),
	'html-encoder': () => import('./text-tools/HTMLEncoder.svelte'),
	'unicode-converter': () => import('./text-tools/UnicodeConverter.svelte'),
	'json-escape': () => import('./text-tools/JSONEscape.svelte'),
	'text-diff': () => import('./text-tools/TextDiff.svelte'),
	'whitespace-cleaner': () => import('./text-tools/WhitespaceCleaner.svelte'),
	'regex-tester': () => import('./text-tools/RegexTester.svelte'),

	// ---- Date tools ----
	'unix-timestamp': () => import('./date-tools/TimestampConverter.svelte'),
	'date-calculator': () => import('./date-tools/DateCalculator.svelte'),
	'cron-parser': () => import('./date-tools/CronParser.svelte'),
	'cron-builder': () => import('./date-tools/CronBuilder.svelte'),
	'timezone-converter': () => import('./date-tools/TimezoneConverter.svelte'),
	'business-day-calculator': () => import('./date-tools/BusinessDayCalculator.svelte'),
	'iso8601-converter': () => import('./date-tools/ISO8601Converter.svelte'),
	'relative-time': () => import('./date-tools/RelativeTime.svelte'),
	'timestamp-generator': () => import('./date-tools/TimestampGenerator.svelte'),

	// ---- JWT/Security tools ----
	'uuid-generator': () => import('./jwt-security-tools/UUIDGenerator.svelte'),
	'jwt-decoder': () => import('./jwt-security-tools/JWTDecoder.svelte'),
	'jwt-generator': () => import('./jwt-security-tools/JWTGenerator.svelte'),
	'jwt-validator': () => import('./jwt-security-tools/JWTValidator.svelte'),
	'hash-generator': () => import('./jwt-security-tools/HashGenerator.svelte'),
	'hmac-generator': () => import('./jwt-security-tools/HMACGenerator.svelte'),
	'secret-generator': () => import('./jwt-security-tools/SecretGenerator.svelte'),
	'oauth-pkce-generator': () => import('./jwt-security-tools/OAuthPKCEGenerator.svelte'),
	'oauth-url-builder': () => import('./jwt-security-tools/OAuthURLBuilder.svelte'),
	'password-generator': () => import('./jwt-security-tools/PasswordGenerator.svelte'),
	'ulid-generator': () => import('./jwt-security-tools/ULIDGenerator.svelte'),
	'bcrypt-generator': () => import('./jwt-security-tools/BcryptGenerator.svelte'),
	'aes-crypto': () => import('./jwt-security-tools/AESCrypto.svelte'),
	'qr-code-generator': () => import('./jwt-security-tools/QRCodeGenerator.svelte'),

	// ---- API Development tools ----
	'rest-client': () => import('./api-dev-tools/RestClient.svelte'),
	'http-header-builder': () => import('./api-dev-tools/HTTPHeaderBuilder.svelte'),
	'http-status-lookup': () => import('./api-dev-tools/HTTPStatusLookup.svelte'),
	'mime-type-lookup': () => import('./api-dev-tools/MIMETypeLookup.svelte'),
	'xml-formatter': () => import('./api-dev-tools/XMLFormatter.svelte'),
	'curl-converter': () => import('./api-dev-tools/CURLConverter.svelte'),
	'form-data-generator': () => import('./api-dev-tools/FormDataGenerator.svelte'),
	'cors-validator': () => import('./api-dev-tools/CORSValidator.svelte'),
	'postman-generator': () => import('./api-dev-tools/PostmanGenerator.svelte'),
	'request-response-diff': () => import('./api-dev-tools/RequestResponseDiff.svelte'),
	'graphql-client': () => import('./api-dev-tools/GraphQLClient.svelte'),
	'soap-builder': () => import('./api-dev-tools/SOAPBuilder.svelte'),
	'webhook-tester': () => import('./api-dev-tools/WebhookTester.svelte'),
	'api-rate-limiter': () => import('./api-dev-tools/APIRateLimiter.svelte')
};

export async function loadToolComponent(toolId: string): Promise<any | null> {
	const loader = toolMap[toolId];
	if (!loader) return null;

	try {
		const module = await loader();
		return module.default;
	} catch (e) {
		console.error(`Failed to load tool ${toolId}:`, e);
		return null;
	}
}

export function hasToolImplementation(toolId: string): boolean {
	return toolId in toolMap;
}
