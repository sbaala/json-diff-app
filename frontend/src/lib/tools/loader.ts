// Map of tool IDs to their components
// Using any type for dynamic component loading as per Svelte patterns
const toolMap: Record<string, () => Promise<{ default: any }>> = {
	// Text tools
	'case-converter': () => import('./text-tools/CaseConverter.svelte'),
	'text-reverse': () => import('./text-tools/TextReverser.svelte'),
	'word-counter': () => import('./text-tools/WordCounter.svelte'),
	'line-sorter': () => import('./text-tools/LineSorter.svelte'),
	'base64-encoder': () => import('./text-tools/Base64Encoder.svelte'),
	'url-encoder': () => import('./text-tools/URLEncoder.svelte'),

	// Date tools
	'unix-timestamp': () => import('./date-tools/TimestampConverter.svelte'),
	'date-calculator': () => import('./date-tools/DateCalculator.svelte'),
	'cron-parser': () => import('./date-tools/CronParser.svelte'),

	// JWT/Security tools (Phase 3)
	'uuid-generator': () => import('./jwt-security-tools/UUIDGenerator.svelte'),
	'jwt-decoder': () => import('./jwt-security-tools/JWTDecoder.svelte'),
	'jwt-generator': () => import('./jwt-security-tools/JWTGenerator.svelte'),
	'hash-generator': () => import('./jwt-security-tools/HashGenerator.svelte'),
	'hmac-generator': () => import('./jwt-security-tools/HMACGenerator.svelte'),
	'secret-generator': () => import('./jwt-security-tools/SecretGenerator.svelte'),
	'oauth-pkce-generator': () => import('./jwt-security-tools/OAuthPKCEGenerator.svelte'),
	'password-generator': () => import('./jwt-security-tools/PasswordGenerator.svelte'),

	// API Development tools (Phase 4)
	'http-header-builder': () => import('./api-dev-tools/HTTPHeaderBuilder.svelte'),
	'http-status-lookup': () => import('./api-dev-tools/HTTPStatusLookup.svelte'),
	'mime-type-lookup': () => import('./api-dev-tools/MIMETypeLookup.svelte'),
	'xml-formatter': () => import('./api-dev-tools/XMLFormatter.svelte'),
	'curl-converter': () => import('./api-dev-tools/CURLConverter.svelte'),
	'form-data-generator': () => import('./api-dev-tools/FormDataGenerator.svelte'),
	'cors-validator': () => import('./api-dev-tools/CORSValidator.svelte')
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
