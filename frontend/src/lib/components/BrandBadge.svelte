<script lang="ts">
	import BrandMark from './BrandMark.svelte';

	/**
	 * The brand tile used as the leading icon of every page header, so each tool
	 * page carries the VinMi mark without repeating the full lockup that already
	 * sits in the site header.
	 */
	interface Props {
		size?: number;
	}

	let { size = 38 }: Props = $props();
</script>

<span class="brand-badge" aria-hidden="true">
	<BrandMark {size} variant="tile" title="" />
</span>

<style>
	.brand-badge {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-glow);
		overflow: hidden;
		line-height: 0;
	}
</style>
