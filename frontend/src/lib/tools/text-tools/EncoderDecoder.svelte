<script lang="ts">
	import { ToolContainer } from '$lib/components/tools';
	import { Encodings, type EncodingType } from '$lib/utils/encode';
	import type { ToolMetadata } from '$lib/types';

	interface Props {
		toolId?: string;
		toolName?: string;
		toolDescription?: string;
		defaultEncoding?: EncodingType;
		supportedEncodings?: EncodingType[];
	}

	const {
		toolId = 'base64-encoder',
		toolName = 'Base64 Encoder',
		toolDescription = 'Encode/decode text',
		defaultEncoding = 'base64' as EncodingType,
		supportedEncodings = ['base64'] as EncodingType[]
	}: Props = $props();

	const tool: ToolMetadata = {
		id: toolId,
		name: toolName,
		description: toolDescription,
		category: 'text-utils',
		icon: 'encoding',
		keywords: ['encode', 'decode']
	};

	let input = $state('');
	let output = $state('');
	let error: string | null = $state(null);
	let encoding = $state<EncodingType>(defaultEncoding);
	let mode = $state<'encode' | 'decode'>('encode');

	function transform() {
		if (!input) {
			output = '';
			error = null;
			return;
		}

		try {
			const enc = Encodings[encoding];
			if (!enc) throw new Error(`Encoding not supported: ${encoding}`);

			output = mode === 'encode' ? enc.encode(input) : enc.decode(input);
			error = null;
		} catch (e) {
			error = (e as Error).message;
			output = '';
		}
	}

	function handleInput() {
		transform();
	}

	function handleEncodingChange(e: Event) {
		encoding = (e.target as HTMLSelectElement).value as EncodingType;
		transform();
	}

	function handleModeChange(e: Event) {
		mode = (e.target as HTMLSelectElement).value as typeof mode;
		transform();
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
	}

	function handleSample() {
		input = 'Hello World!';
		mode = 'encode';
		transform();
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
		<label for="mode">Mode:</label>
		<select id="mode" value={mode} onchange={handleModeChange}>
			<option value="encode">Encode</option>
			<option value="decode">Decode</option>
		</select>

		{#if supportedEncodings.length > 1}
			<label for="encoding">Encoding:</label>
			<select id="encoding" value={encoding} onchange={handleEncodingChange}>
				{#each supportedEncodings as enc}
					<option value={enc}>{Encodings[enc].name}</option>
				{/each}
			</select>
		{/if}
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
		flex-wrap: wrap;
	}

	label {
		font-weight: 500;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	select {
		flex: 1;
		min-width: 120px;
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
