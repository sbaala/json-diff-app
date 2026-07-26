<script lang="ts">
	import SpreadsheetEditor from '$lib/components/spreadsheet/SpreadsheetEditor.svelte';
</script>

<div class="page">
	<SpreadsheetEditor />
</div>

<style>
	/*
	 * The app shell above this page occupies vertical space that the spreadsheet
	 * must not overlap or be hidden behind: the sticky header (~71px), the
	 * privacy banner (~33px), and the <main> vertical padding (~24px).
	 * We size the working area to the remaining viewport height so the toolbar
	 * stays visible at the top and the grid fills the rest without overflowing.
	 * --app-chrome is the total reserved height; tuned per breakpoint below.
	 */
	.page {
		--app-chrome: 128px;
		width: 100%;
		height: calc(100vh - var(--app-chrome)); /* fallback for older browsers */
		height: calc(100dvh - var(--app-chrome)); /* dvh handles mobile browser chrome */
		min-height: 420px;
		overflow: hidden;
	}

	/* Compact header/nav padding kicks in here, but the banner can wrap. */
	@media (max-width: 1024px) {
		.page {
			--app-chrome: 132px;
		}
	}

	/* Mobile: nav collapses to a dropdown; privacy banner often wraps to 2 lines. */
	@media (max-width: 760px) {
		.page {
			--app-chrome: 150px;
		}
	}

	/* Short viewports (landscape phones): keep a usable minimum work area. */
	@media (max-height: 600px) {
		.page {
			--app-chrome: 104px;
			min-height: 320px;
		}
	}
</style>
