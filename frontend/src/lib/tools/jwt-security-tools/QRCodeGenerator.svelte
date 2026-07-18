<script lang="ts">
	import { generateQr, type Ecc } from '$lib/utils/qrcode';
	import type { ToolMetadata } from '$lib/types';

	const tool: ToolMetadata = {
		id: 'qr-code-generator',
		name: 'QR Code Generator',
		description: 'Generate QR codes from text or URLs',
		category: 'jwt-security',
		icon: 'square',
		keywords: ['qr', 'code', 'generate', 'barcode']
	};

	let text = $state('https://example.com');
	let ecc = $state<Ecc>('MEDIUM');
	let scale = $state(8);
	let error: string | null = $state(null);
	let svg = $state('');

	function build() {
		error = null;
		if (!text) {
			svg = '';
			return;
		}
		try {
			const qr = generateQr(text, ecc);
			const border = 4;
			const dim = (qr.size + border * 2) * scale;
			let rects = '';
			for (let y = 0; y < qr.size; y++) {
				for (let x = 0; x < qr.size; x++) {
					if (qr.modules[y][x]) {
						const px = (x + border) * scale;
						const py = (y + border) * scale;
						rects += `<rect x="${px}" y="${py}" width="${scale}" height="${scale}" fill="#000"/>`;
					}
				}
			}
			svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}"><rect width="${dim}" height="${dim}" fill="#fff"/>${rects}</svg>`;
		} catch (e) {
			error = (e as Error).message;
			svg = '';
		}
	}

	function download() {
		if (!svg) return;
		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'qrcode.svg';
		a.click();
		URL.revokeObjectURL(url);
	}

	$effect(() => {
		void [text, ecc, scale];
		build();
	});
</script>

<div class="tool-wrapper">
	<div class="controls">
		<div class="field full">
			<label for="text">Text or URL</label>
			<textarea id="text" bind:value={text} placeholder="Enter text or URL to encode..."></textarea>
		</div>
		<div class="row">
			<div class="field">
				<label for="ecc">Error Correction</label>
				<select id="ecc" bind:value={ecc}>
					<option value="LOW">Low (7%)</option>
					<option value="MEDIUM">Medium (15%)</option>
					<option value="QUARTILE">Quartile (25%)</option>
					<option value="HIGH">High (30%)</option>
				</select>
			</div>
			<div class="field">
				<label for="scale">Scale ({scale}px)</label>
				<input id="scale" type="range" min="4" max="16" bind:value={scale} />
			</div>
		</div>
	</div>

	{#if error}
		<div class="error-box">⚠️ {error}</div>
	{:else if svg}
		<div class="qr-display">
			<div class="qr-image">{@html svg}</div>
			<button class="download-btn" onclick={download}>⬇️ Download SVG</button>
		</div>
	{/if}
</div>

<style>
	.tool-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
	}
	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}
	.row {
		display: flex;
		gap: var(--spacing-md);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		flex: 1;
	}
	label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	textarea {
		min-height: 70px;
		padding: 10px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.9rem;
		resize: vertical;
	}
	select,
	input[type='range'] {
		padding: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 4px;
	}
	textarea:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.qr-display {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
	}
	.qr-image {
		background: white;
		padding: 8px;
		border-radius: 8px;
		max-width: 100%;
	}
	.qr-image :global(svg) {
		max-width: 100%;
		height: auto;
		display: block;
	}
	.download-btn {
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.error-box {
		padding: var(--spacing-md);
		background: rgba(251, 113, 133, 0.1);
		border: 1px solid var(--color-removed-border);
		border-radius: 4px;
		color: var(--color-removed-border);
		font-size: 0.875rem;
	}
</style>
