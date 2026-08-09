<script lang="ts">
	/**
	 * VinMi brand mark (the V∙M ligature) drawn inline so it inherits the active
	 * theme instead of shipping a fixed-colour raster. Geometry is copied
	 * verbatim from `static/brand/svg/vinmi-glyph.svg` / `vinmi-icon.svg` — do
	 * not redraw it; regenerate those files with `vinmi-brand/build_icons.py`
	 * and re-copy the numbers if the mark ever changes.
	 *
	 * Variants:
	 *  - `tile`  app-icon look: rounded dark tile + glow behind the glyph
	 *  - `plain` bare glyph on a transparent ground (gradient strokes)
	 *  - `mono`  bare glyph in `currentColor` (busy grounds, print, footers)
	 */
	interface Props {
		/** Rendered width in px (tile is square; plain/mono keep the glyph ratio). */
		size?: number;
		variant?: 'tile' | 'plain' | 'mono';
		/** Accessible name; omit (empty string) when the mark is decorative. */
		title?: string;
	}

	let { size = 32, variant = 'tile', title = 'VinMi' }: Props = $props();

	// SSR-stable unique ids so multiple marks on one page never share gradients.
	const uid = $props.id();
	const inkId = `${uid}-ink`;
	const tileId = `${uid}-tile`;
	const glowId = `${uid}-glow`;

	// Bare glyph is cropped to its ink box (+ stroke) so it optically fills the
	// box it is given; the tile variant keeps the full 512 icon canvas.
	const box = $derived(variant === 'tile' ? '0 0 512 512' : '82 98 348 316');
	const height = $derived(variant === 'tile' ? size : Math.round((size * 316) / 348));
	const stroke = $derived(variant === 'mono' ? 'currentColor' : `url(#${inkId})`);
</script>

<svg
	width={size}
	height={height}
	viewBox={box}
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title || undefined}
	aria-hidden={title ? undefined : 'true'}
	class="brand-mark"
>
	{#if title}<title>{title}</title>{/if}

	<defs>
		{#if variant !== 'mono'}
			<linearGradient id={inkId} x1="89" y1="105" x2="423" y2="406" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="var(--color-primary)" />
				<stop offset="1" stop-color="var(--color-secondary)" />
			</linearGradient>
		{/if}
		{#if variant === 'tile'}
			<linearGradient id={tileId} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#16203c" />
				<stop offset="1" stop-color="#0b1020" />
			</linearGradient>
			<radialGradient id={glowId} cx="0.5" cy="0.3" r="0.8">
				<stop offset="0" stop-color="var(--color-primary)" stop-opacity="0.34" />
				<stop offset="1" stop-color="var(--color-primary)" stop-opacity="0" />
			</radialGradient>
		{/if}
	</defs>

	{#if variant === 'tile'}
		<rect width="512" height="512" rx="112" fill="url(#{tileId})" />
		<rect width="512" height="512" rx="112" fill="url(#{glowId})" />
		<rect
			x="1"
			y="1"
			width="510"
			height="510"
			rx="111"
			fill="none"
			stroke="var(--color-primary)"
			stroke-opacity="0.2"
			stroke-width="2"
		/>
	{/if}

	<g fill="none" {stroke} stroke-linecap="round" stroke-linejoin="round">
		<path d="M112 128 L112 338" stroke-width="46" />
		<path d="M400 128 L400 338" stroke-width="46" />
		<path d="M112 128 L256 374 L400 128" stroke-width="46" />
	</g>
	<!-- The node: many inputs resolving into one solution. White on dark grounds
	     (and always on the tile, which is dark in every theme); ink on light
	     themes, where a white node would vanish into the page. -->
	<circle class="node" class:on-tile={variant === 'tile'} cx="256" cy="374" r="32" />
</svg>

<style>
	.brand-mark {
		display: block;
		flex-shrink: 0;
	}

	.node {
		fill: #ffffff;
	}

	:global(html[data-theme='daylight']) .node:not(.on-tile),
	:global(html[data-theme='sandstone']) .node:not(.on-tile) {
		fill: #0f172a;
	}
</style>
