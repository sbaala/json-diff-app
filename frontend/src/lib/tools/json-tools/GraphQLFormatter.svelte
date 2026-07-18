<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'graphql-formatter',
		name: 'GraphQL Formatter',
		description: 'Format and beautify GraphQL queries',
		category: 'json-api',
		icon: 'code',
		keywords: ['graphql', 'format', 'query']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);

	function format() {
		if (!input.trim()) {
			output = '';
			error = null;
			return;
		}
		try {
			// Tokenize: braces, parens, and words. Re-indent by brace depth.
			const compact = input.replace(/\s+/g, ' ').trim();
			let result = '';
			let indent = 0;
			const pad = () => '  '.repeat(indent);

			for (let i = 0; i < compact.length; i++) {
				const c = compact[i];
				if (c === '{') {
					result = result.replace(/ $/, '');
					result += ' {\n';
					indent++;
					result += pad();
				} else if (c === '}') {
					indent = Math.max(0, indent - 1);
					result = result.replace(/\s+$/, '');
					result += '\n' + pad() + '}';
					if (compact[i + 1] && compact[i + 1] !== '}') {
						result += '\n' + pad();
					}
				} else if (c === ' ') {
					// field separator at this depth
					if (result.endsWith('}') || /\)$/.test(result)) {
						result += '\n' + pad();
					} else {
						result += ' ';
					}
				} else {
					result += c;
				}
			}

			output = result.split('\n').filter((l, idx, arr) => !(l.trim() === '' && arr[idx - 1]?.trim() === '')).join('\n').trim();
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleClear() { input = ''; output = ''; error = null; }
	function handleSample() {
		input = 'query GetUser($id: ID!) { user(id: $id) { name email posts { title comments { body } } } }';
		format();
	}

	$effect(() => {
		void input;
		format();
	});
</script>

<ToolContainer {tool} bind:input bind:output bind:error onClear={handleClear} onSample={handleSample} />
