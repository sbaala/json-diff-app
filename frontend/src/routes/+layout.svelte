<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { theme } from '$lib/stores/theme';
	import { onMount } from 'svelte';

	let { children } = $props();
	let mobileMenuOpen = $state(false);

	onMount(() => {
		theme.init();
	});

	function toggleTheme() {
		theme.toggle();
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<div class="app">
	<header class="header">
		<div class="container header-content">
			<a href="/format" class="logo">
				<span class="logo-icon">{'{ }'}</span>
				<span class="logo-text">Free-bies</span>
				<span class="logo-accent">JSON</span>
			</a>

			<button class="mobile-menu-btn" onclick={toggleMobileMenu} aria-label="Toggle menu">
				{#if mobileMenuOpen}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				{:else}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="3" y1="12" x2="21" y2="12"/>
						<line x1="3" y1="6" x2="21" y2="6"/>
						<line x1="3" y1="18" x2="21" y2="18"/>
					</svg>
				{/if}
			</button>

			<nav class="nav" class:open={mobileMenuOpen}>
				<a href="/format" class="nav-link" class:active={$page.url.pathname === '/format' || $page.url.pathname === '/'} onclick={closeMobileMenu}>Format</a>
				<a href="/viewer" class="nav-link" class:active={$page.url.pathname === '/viewer'} onclick={closeMobileMenu}>Viewer</a>
				<a href="/grid" class="nav-link nav-flash" class:active={$page.url.pathname === '/grid'} onclick={closeMobileMenu}>Grid</a>
				<a href="/compare" class="nav-link" class:active={$page.url.pathname === '/compare'} onclick={closeMobileMenu}>JSON Diff</a>
				<a href="/text" class="nav-link" class:active={$page.url.pathname === '/text'} onclick={closeMobileMenu}>Text Diff</a>
				<a href="/convert" class="nav-link" class:active={$page.url.pathname === '/convert'} onclick={closeMobileMenu}>Convert</a>
				<a href="/lint" class="nav-link" class:active={$page.url.pathname === '/lint'} onclick={closeMobileMenu}>Lint</a>
				<a href="/graph" class="nav-link" class:active={$page.url.pathname === '/graph'} onclick={closeMobileMenu}>Graph</a>
			</nav>

			<div class="header-actions">
				<button class="theme-toggle" onclick={toggleTheme} title="Toggle theme">
					{#if $theme === 'dark'}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="5"/>
							<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
						</svg>
					{:else}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
						</svg>
					{/if}
				</button>
			</div>
		</div>
	</header>

	<main class="main">
		{@render children()}
	</main>

	<footer class="footer">
		<div class="container">
			<p>Contact @tamizhezhutthu@gmail.com Free-bies JSON Tools - Format, View & Compare JSON</p>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.header {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: var(--shadow-glow);
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60px;
		gap: 1rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		font-weight: 700;
		text-decoration: none;
		flex-shrink: 0;
	}

	.logo-icon {
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		font-family: var(--font-mono);
	}

	.logo-text {
		color: var(--color-text);
	}

	.logo-accent {
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.mobile-menu-btn {
		display: none;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		cursor: pointer;
	}

	.nav {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
		flex: 1;
	}

	.nav-link {
		color: var(--color-text);
		text-decoration: none;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius);
		transition: all 0.15s ease;
		font-size: 0.875rem;
		white-space: nowrap;
	}

	.nav-link:hover {
		background: var(--color-bg);
	}

	.nav-link.active {
		background: var(--gradient-primary);
		color: white;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.theme-toggle:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.main {
		flex: 1;
		padding: 1rem 0;
	}

	.footer {
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		padding: 1rem 0;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	/* Tablet responsive */
	@media (max-width: 900px) {
		.nav {
			gap: 0.25rem;
		}

		.nav-link {
			padding: 0.4rem 0.5rem;
			font-size: 0.8rem;
		}
	}

	/* Mobile responsive */
	@media (max-width: 700px) {
		.mobile-menu-btn {
			display: flex;
		}

		.nav {
			display: none;
			position: absolute;
			top: 60px;
			left: 0;
			right: 0;
			background: var(--color-surface);
			border-bottom: 1px solid var(--color-border);
			flex-direction: column;
			padding: 0.5rem;
			gap: 0.25rem;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		}

		.nav.open {
			display: flex;
		}

		.nav-link {
			padding: 0.75rem 1rem;
			font-size: 0.9rem;
			border-radius: var(--radius);
		}

		.nav-link:hover {
			background: var(--color-bg);
		}

		.logo-text {
			display: none;
		}

		.logo {
			font-size: 1.1rem;
		}
	}
</style>