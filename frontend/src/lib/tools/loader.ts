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

	// JWT/Security tools
	'uuid-generator': () => import('./jwt-security-tools/UUIDGenerator.svelte')
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
