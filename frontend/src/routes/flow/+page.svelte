<script lang="ts">
	import { FlowDiagramEditor } from '$lib/components';
</script>

<svelte:head>
	<title>Flow Diagram - Freebies JSON Tools</title>
</svelte:head>

<FlowDiagramEditor />

<style>
	/* On the flow route, let the builder claim the full area between the site
	   header and footer: remove the default main padding and make it a flex
	   column so the editor (flex: 1) fills the available height responsively. */
	:global(.main:has(.flow-root)) {
		display: flex;
		flex-direction: column;
		padding: 0;
		min-height: 0;
	}
</style>
