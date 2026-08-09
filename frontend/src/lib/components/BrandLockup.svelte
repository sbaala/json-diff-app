<script lang="ts">
	import BrandMark from './BrandMark.svelte';
	import BrandWordmark from './BrandWordmark.svelte';

	/**
	 * Icon + wordmark (+ optional tagline) — the standard VinMi lockup, used in
	 * the site header, the footer and the home hero. Brand rule: minimum 320px
	 * wide for the full lockup, so drop the tagline at small sizes instead of
	 * shrinking it.
	 */
	interface Props {
		size?: 'sm' | 'md' | 'lg';
		/** Show the "Building Intelligent Enterprise Solutions" line. */
		tagline?: boolean;
		mono?: boolean;
	}

	let { size = 'md', tagline = true, mono = false }: Props = $props();

	const dims = {
		sm: { mark: 30, word: 17 },
		md: { mark: 42, word: 23 },
		lg: { mark: 72, word: 40 }
	} as const;

	const d = $derived(dims[size]);
</script>

<span class="lockup lockup-{size}">
	<BrandMark size={d.mark} variant={mono ? 'mono' : 'tile'} title="" />
	<span class="copy">
		<BrandWordmark height={d.word} {mono} title="VinMi" />
		{#if tagline}
			<span class="tagline">Building Intelligent Enterprise Solutions</span>
		{/if}
	</span>
</span>

<style>
	.lockup {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
	}

	.copy {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.tagline {
		font-size: 0.68rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.lockup-lg {
		gap: 1rem;
	}

	.lockup-lg .tagline {
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.lockup-sm .tagline {
		font-size: 0.62rem;
	}
</style>
