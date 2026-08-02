<script lang="ts">
	/**
	 * The drawn "VinMi" wordmark (never typeset in a font — see
	 * `vinmi-brand/README.md`). Geometry copied from
	 * `static/brand/svg/vinmi-wordmark.svg`; the caps carry the theme gradient,
	 * the lowercase runs in the page text colour so one file serves every theme.
	 */
	interface Props {
		/** Rendered height in px; width follows the 824×320 design box. */
		height?: number;
		/** Draw everything in `currentColor` (busy grounds, print). */
		mono?: boolean;
		title?: string;
	}

	let { height = 22, mono = false, title = 'VinMi' }: Props = $props();

	const uid = $props.id();
	const gradId = `${uid}-word`;
	const width = $derived(Math.round((height * 824) / 320));
	const capStroke = $derived(mono ? 'currentColor' : `url(#${gradId})`);
</script>

<svg
	{width}
	{height}
	viewBox="0 0 824 320"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title || undefined}
	aria-hidden={title ? undefined : 'true'}
	class="brand-wordmark"
>
	{#if title}<title>{title}</title>{/if}

	{#if !mono}
		<defs>
			<linearGradient id={gradId} x1="0" y1="0" x2="824" y2="0" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="var(--color-primary)" />
				<stop offset="1" stop-color="var(--color-secondary)" />
			</linearGradient>
		</defs>
	{/if}

	<g fill="none" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
		<!-- V and M: the same ligature as the mark, gradient-filled. -->
		<g stroke={capStroke}>
			<path d="M23 40 L123 240 L223 40" />
			<path d="M513 40 L513 240" />
			<path d="M743 40 L743 240" />
			<path d="M513 40 L628 268 L743 40" />
		</g>
		<!-- "in" and "i": ink / white, never gradient. -->
		<g stroke="currentColor">
			<path d="M273 100 L273 240" />
			<path d="M331 240 L331 160 A60 60 0 0 1 451 160 L451 240" />
			<path d="M801 100 L801 240" />
		</g>
	</g>

	<!-- i-dots are nodes, in the mark's own vocabulary. -->
	<circle cx="273" cy="56" r="18" fill={mono ? 'currentColor' : 'var(--color-secondary)'} />
	<circle cx="801" cy="56" r="18" fill={mono ? 'currentColor' : 'var(--color-secondary)'} />
	<circle class="node" class:mono cx="628" cy="268" r="24" />
</svg>

<style>
	.brand-wordmark {
		display: block;
		flex-shrink: 0;
	}

	.node {
		fill: #ffffff;
	}

	.node.mono {
		fill: currentColor;
	}

	:global(html[data-theme='daylight']) .node:not(.mono),
	:global(html[data-theme='sandstone']) .node:not(.mono) {
		fill: #0f172a;
	}
</style>
