<script lang="ts">
	import { FlowDiagramEditor } from '$lib/components';
</script>

<svelte:head>
	<title>Flow Diagram - Freebies JSON Tools</title>
</svelte:head>

<FlowDiagramEditor />

<style>
	/* On the flow route, pin the whole page shell to exactly the viewport
	   height and clip its overflow. Without a *definite* height somewhere in
	   the chain, the editor's `flex: 1` resolves against its own content
	   instead of the viewport, so the intrinsic size of the sidebar + canvas
	   pushes the page taller than 100vh and the browser scrolls (visible on
	   smaller laptop screens like a 14" MacBook). Pinning the shell gives the
	   flex chain a real height to divide, so the canvas fills the leftover
	   space and scrolls internally instead of the page. */
	:global(.app:has(.flow-root)) {
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
	}

	/* Let the builder claim the full area between the site header and footer:
	   remove the default main padding and make it a flex column so the editor
	   (flex: 1) fills the now-definite available height responsively. */
	:global(.main:has(.flow-root)) {
		display: flex;
		flex-direction: column;
		padding: 0;
		min-height: 0;
	}

	/* Short laptop screens (e.g. a 13" MacBook at ~800px tall): the fixed site
	   chrome would otherwise crush the canvas. Reclaim that space by dropping
	   the privacy banner and shrinking the footer to a slim strip, so the
	   diagram gets the room instead. Applied only on the flow route. */
	@media (max-height: 820px) {
		:global(.app:has(.flow-root) .privacy-banner) {
			display: none;
		}

		:global(.app:has(.flow-root) .footer) {
			padding: 0.6rem 0;
		}

		:global(.app:has(.flow-root) .footer .footer-brand) {
			display: none;
		}
	}
</style>
