<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'curl-converter',
		name: 'cURL Converter',
		description: 'Convert cURL to HTTP, JavaScript, Python, etc',
		category: 'api-dev',
		icon: 'arrow-right-left',
		keywords: ['curl', 'convert', 'http', 'code', 'request']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let targetLanguage = $state<'javascript' | 'python' | 'http' | 'bash'>('javascript');

	interface ParsedCURL {
		method: string;
		url: string;
		headers: Record<string, string>;
		data?: string;
	}

	function parseCURL(curlString: string): ParsedCURL | null {
		const urlMatch = curlString.match(/"([^"]+)"|\s(['`][^'`]+['`]|https?:\/\/[^\s]+)/);
		if (!urlMatch) return null;

		const url = urlMatch[1] || urlMatch[2]?.replace(/['"]/g, '');

		const methodMatch = curlString.match(/-X\s+(\w+)/);
		const method = methodMatch ? methodMatch[1] : 'GET';

		const headers: Record<string, string> = {};
		const headerRegex = /-H\s+["']([^:]+):\s*([^"']+)["']/g;
		let match;
		while ((match = headerRegex.exec(curlString))) {
			headers[match[1].trim()] = match[2].trim();
		}

		const dataMatch = curlString.match(/-d\s+["']([^"']+)["']/);
		const data = dataMatch ? dataMatch[1] : undefined;

		return { method, url: url || '', headers, data };
	}

	function generateOutput() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}

		try {
			const parsed = parseCURL(input);
			if (!parsed) {
				throw new Error('Invalid cURL format');
			}

			let result = '';

			if (targetLanguage === 'javascript') {
				result = generateJavaScript(parsed);
			} else if (targetLanguage === 'python') {
				result = generatePython(parsed);
			} else if (targetLanguage === 'http') {
				result = generateHTTP(parsed);
			} else if (targetLanguage === 'bash') {
				result = generateBash(parsed);
			}

			output = result;
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function generateJavaScript(curl: ParsedCURL): string {
		const headers = JSON.stringify(curl.headers, null, 2);
		let code = `fetch('${curl.url}', {\n`;
		code += `  method: '${curl.method}',\n`;
		code += `  headers: ${headers},\n`;
		if (curl.data) {
			code += `  body: '${curl.data}'\n`;
		}
		code += '});';
		return code;
	}

	function generatePython(curl: ParsedCURL): string {
		const headers = JSON.stringify(curl.headers, null, 2);
		let code = 'import requests\n\n';
		code += `headers = ${headers}\n`;
		if (curl.data) {
			code += `data = '${curl.data}'\n`;
			code += `response = requests.${curl.method.toLowerCase()}('${curl.url}', headers=headers, data=data)\n`;
		} else {
			code += `response = requests.${curl.method.toLowerCase()}('${curl.url}', headers=headers)\n`;
		}
		code += 'print(response.text)';
		return code;
	}

	function generateHTTP(curl: ParsedCURL): string {
		const url = new URL(curl.url);
		let http = `${curl.method} ${url.pathname}${url.search} HTTP/1.1\n`;
		http += `Host: ${url.hostname}\n`;
		for (const [key, value] of Object.entries(curl.headers)) {
			http += `${key}: ${value}\n`;
		}
		http += '\n';
		if (curl.data) {
			http += curl.data;
		}
		return http;
	}

	function generateBash(curl: ParsedCURL): string {
		let bash = `curl -X ${curl.method} \\\n`;
		for (const [key, value] of Object.entries(curl.headers)) {
			bash += `  -H "${key}: ${value}" \\\n`;
		}
		if (curl.data) {
			bash += `  -d '${curl.data}' \\\n`;
		}
		bash += `  '${curl.url}'`;
		return bash;
	}

	function handleInput() {
		generateOutput();
	}

	function handleLanguageChange(e: Event) {
		targetLanguage = (e.target as HTMLSelectElement).value as typeof targetLanguage;
		generateOutput();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input =
			'curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer token123" -d \'{"name": "John"}\' https://api.example.com/users';
		generateOutput();
	}
</script>

<div class="tool-wrapper">
	<ToolContainer
		{tool}
		bind:input
		bind:output
		bind:error
		onClear={handleClear}
		onSample={handleSample}
	/>

	<div class="tool-controls">
		<label for="language">Convert to:</label>
		<select id="language" value={targetLanguage} onchange={handleLanguageChange}>
			<option value="javascript">JavaScript (Fetch)</option>
			<option value="python">Python (Requests)</option>
			<option value="http">HTTP Request</option>
			<option value="bash">Bash Script</option>
		</select>
	</div>
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.tool-controls {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		border-top: 1px solid var(--color-border);
		align-items: center;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select {
		flex: 1;
		max-width: 300px;
		padding: 8px 12px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
</style>
