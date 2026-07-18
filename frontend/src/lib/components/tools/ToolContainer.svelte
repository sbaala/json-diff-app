<script lang="ts">
	import type { ToolMetadata } from '$lib/types';
	import ToolHeader from './ToolHeader.svelte';
	import ToolInput from './ToolInput.svelte';
	import ToolOutput from './ToolOutput.svelte';
	import ToolActions from './ToolActions.svelte';

	export let tool: ToolMetadata;
	export let input: string = '';
	export let output: string = '';
	export let error: string | null = null;
	export let isLoading: boolean = false;
	export let onClose: (() => void) | undefined = undefined;
	export let onClear: (() => void) | undefined = undefined;
	export let onSample: (() => void) | undefined = undefined;

	let copiedFeedback = false;

	async function handleCopy() {
		if (output) {
			await navigator.clipboard.writeText(output);
			copiedFeedback = true;
			setTimeout(() => {
				copiedFeedback = false;
			}, 2000);
		}
	}

	function handleClear() {
		input = '';
		output = '';
		error = null;
		if (onClear) {
			onClear();
		}
	}

	function handleSample() {
		if (onSample) {
			onSample();
		}
	}
</script>

<div class="tool-container" style="--category-color: var({tool.category})">
	<ToolHeader {tool} {onClose} />

	<div class="tool-body">
		<div class="tool-input-area">
			<ToolInput bind:value={input} label="Input" />
		</div>

		<div class="tool-divider"></div>

		<div class="tool-output-area">
			<ToolOutput value={output} label="Output" {error} {isLoading} />
		</div>
	</div>

	<ToolActions
		canCopy={!!output && !error}
		{copiedFeedback}
		{isLoading}
		onCopy={handleCopy}
		onClear={handleClear}
		{onSample}
	/>
</div>

<style>
	.tool-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.tool-body {
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		gap: 0;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.tool-input-area,
	.tool-output-area {
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: var(--spacing-md);
		background: var(--color-surface);
	}

	.tool-divider {
		background: var(--color-border);
	}

	/* Responsive layout */
	@media (max-width: 1024px) {
		.tool-body {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr 1px 1fr;
		}

		.tool-divider {
			height: 1px;
		}
	}

	@media (max-width: 640px) {
		.tool-container {
			border-radius: 0;
		}

		.tool-body {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto auto;
		}

		.tool-input-area,
		.tool-output-area {
			padding: var(--spacing-sm);
			min-height: 200px;
		}

		.tool-divider {
			display: none;
		}
	}
</style>
