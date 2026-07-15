<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { theme, themes } from '$lib/stores/theme';
	import type { Theme } from '$lib/stores/theme';
	import { onMount } from 'svelte';

	let { children } = $props();
	let mobileMenuOpen = $state(false);
	let themeMenuOpen = $state(false);

	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/format', label: 'Format' },
		{ href: '/viewer', label: 'Viewer' },
		{ href: '/grid', label: 'Grid', flash: true },
		{ href: '/compare', label: 'JSON Diff' },
		{ href: '/text', label: 'Text Diff' },
		{ href: '/convert', label: 'Convert' },
		{ href: '/lint', label: 'Lint' },
		{ href: '/graph', label: 'Graph' },
		{ href: '/flow', label: 'Flow', flash: true },
		{ href: 'https://vinmi-frontend-d3h34miv7q-ue.a.run.app/', label: 'Blog', external: true, flash: true }
	];

	const currentTheme = $derived(themes.find((t) => t.id === $theme) ?? themes[0]);

	// The JSON Diff (/compare) page sends data to the backend API, so the
	// browser-only privacy note must not appear there. Everything else runs
	// entirely client-side.
	const showPrivacyNote = $derived($page.url.pathname !== '/compare');

	onMount(() => {
		theme.init();
	});

	function isActive(href: string) {
		return $page.url.pathname === href;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function selectTheme(id: Theme) {
		theme.set(id);
		themeMenuOpen = false;
	}

	function onWindowClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (themeMenuOpen && !target.closest('.theme-switcher')) {
			themeMenuOpen = false;
		}
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="app">
	<header class="header">
		<div class="header-accent"></div>
		<div class="container header-content">
			<a href="/" class="logo" aria-label="VinMi home">
				<span class="logo-mark" aria-hidden="true">
					<svg width="26" height="26" viewBox="0 0 32 32" fill="none">
						<path
							d="M4 6l8 20 4-11 4 11 8-20"
							stroke="url(#vinmi-grad)"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<defs>
							<linearGradient id="vinmi-grad" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
								<stop stop-color="var(--color-primary)" />
								<stop offset="1" stop-color="var(--color-secondary)" />
							</linearGradient>
						</defs>
					</svg>
				</span>
				<span class="logo-copy">
					<span class="logo-name">VinMi</span>
					<span class="logo-tagline">Building Intelligent Enterprise Solutions</span>
				</span>
			</a>

			<button class="icon-btn mobile-menu-btn" onclick={toggleMobileMenu} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
				{#if mobileMenuOpen}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				{:else}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="6" x2="21" y2="6" />
						<line x1="3" y1="18" x2="21" y2="18" />
					</svg>
				{/if}
			</button>

			<nav class="nav" class:open={mobileMenuOpen}>
				{#each navItems as item}
					<a
						href={item.href}
						class="nav-link"
						class:nav-flash={item.flash}
						class:active={!item.external && isActive(item.href)}
						target={item.external ? '_blank' : undefined}
						rel={item.external ? 'noopener noreferrer' : undefined}
						onclick={closeMobileMenu}
					>
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="header-actions">
				<div class="theme-switcher">
					<button
						class="icon-btn theme-trigger"
						onclick={() => (themeMenuOpen = !themeMenuOpen)}
						aria-haspopup="menu"
						aria-expanded={themeMenuOpen}
						title="Change theme"
					>
						<span class="swatch" style="background:{currentTheme.swatch}"></span>
						<span class="theme-trigger-label">{currentTheme.label}</span>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>

					{#if themeMenuOpen}
						<div class="theme-menu" role="menu">
							<p class="theme-menu-title">Theme</p>
							{#each themes as option}
								<button
									class="theme-option"
									class:selected={option.id === $theme}
									role="menuitemradio"
									aria-checked={option.id === $theme}
									onclick={() => selectTheme(option.id)}
								>
									<span class="swatch" style="background:{option.swatch}"></span>
									<span class="theme-option-copy">
										<span class="theme-option-label">{option.label}</span>
										<span class="theme-option-desc">{option.description}</span>
									</span>
									<span class="theme-mode">{option.mode}</span>
									{#if option.id === $theme}
										<svg class="check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="20 6 9 17 4 12" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

	{#if showPrivacyNote}
		<div class="privacy-banner" role="note">
			<div class="container privacy-content">
				<svg class="privacy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
				<span>
					<strong>100% private.</strong> Everything runs in your browser — your data is never uploaded, stored, or sent to any server.
				</span>
			</div>
		</div>
	{/if}

	<main class="main">
		{@render children()}
	</main>

	<footer class="footer">
		<div class="container footer-content">
			<div class="footer-brand">
				<span class="footer-name">VinMi</span>
				<span class="footer-tagline">Building Intelligent Enterprise Solutions</span>
			</div>
			<p class="footer-meta">
				<a class="footer-link" href="mailto:tamizhezhutthu@gmail.com">tamizhezhutthu@gmail.com</a>
				<span class="footer-sep">·</span>
				<a
					class="footer-link"
					href="https://vinmi-frontend-d3h34miv7q-ue.a.run.app/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Blog
				</a>
				<span class="footer-sep">·</span>
				Enterprise JSON Toolkit
				<span class="footer-sep">·</span>
				&copy; {new Date().getFullYear()} VinMi
			</p>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* ---- Header ---------------------------------------------------------- */
	.header {
		position: sticky;
		top: 0;
		z-index: var(--z-header);
		background: color-mix(in srgb, var(--color-surface) 82%, transparent);
		backdrop-filter: var(--header-blur);
		-webkit-backdrop-filter: var(--header-blur);
		border-bottom: 1px solid var(--color-border);
	}

	.header-accent {
		height: 3px;
		background: var(--gradient-header);
		background-size: 200% 100%;
		animation: gradient-shift 8s ease infinite;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 68px;
		gap: 1.25rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		flex-shrink: 0;
	}

	.logo-mark {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: var(--radius-sm);
		background: var(--color-primary-soft);
		border: 1px solid var(--color-border);
	}

	.logo-copy {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}

	.logo-name {
		font-size: 1.3rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.logo-tagline {
		font-size: 0.68rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--color-text-muted);
	}

	/* ---- Nav ------------------------------------------------------------- */
	.nav {
		display: flex;
		gap: 0.15rem;
		flex-wrap: wrap;
		justify-content: center;
		flex: 1;
	}

	.nav-link {
		color: var(--color-text-muted);
		text-decoration: none;
		padding: 0.5rem 0.8rem;
		border-radius: var(--radius-sm);
		transition: color var(--transition), background var(--transition);
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.nav-link:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.nav-link.active {
		background: var(--color-primary-soft);
		color: var(--color-primary);
		font-weight: 600;
	}

	/* ---- Actions / icon buttons ----------------------------------------- */
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 42px;
		padding: 0 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		transition: background var(--transition), border-color var(--transition), color var(--transition);
	}

	.icon-btn:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-primary);
	}

	.mobile-menu-btn {
		display: none;
		width: 42px;
		padding: 0;
	}

	/* ---- Theme switcher -------------------------------------------------- */
	.theme-switcher {
		position: relative;
	}

	.swatch {
		width: 16px;
		height: 16px;
		border-radius: var(--radius-full);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
		flex-shrink: 0;
	}

	.theme-trigger-label {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.theme-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		z-index: var(--z-dropdown);
		width: 260px;
		padding: 0.4rem;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-lg);
		animation: menu-in var(--transition);
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}

	.theme-menu-title {
		padding: 0.4rem 0.6rem 0.5rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.theme-option {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		padding: 0.55rem 0.6rem;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text);
		text-align: left;
		transition: background var(--transition);
	}

	.theme-option:hover {
		background: var(--color-surface-hover);
	}

	.theme-option.selected {
		background: var(--color-primary-soft);
	}

	.theme-option-copy {
		display: flex;
		flex-direction: column;
		flex: 1;
		line-height: 1.25;
	}

	.theme-option-label {
		font-size: 0.88rem;
		font-weight: 600;
	}

	.theme-option-desc {
		font-size: 0.72rem;
		color: var(--color-text-muted);
	}

	.theme-mode {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		padding: 1px 7px;
	}

	.check {
		color: var(--color-primary);
	}

	/* ---- Privacy banner -------------------------------------------------- */
	.privacy-banner {
		background: var(--color-primary-soft);
		border-bottom: 1px solid var(--color-border);
	}

	.privacy-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 0.5rem 0;
		font-size: 0.8rem;
		color: var(--color-text);
		text-align: center;
	}

	.privacy-content strong {
		color: var(--color-primary);
		font-weight: 700;
	}

	.privacy-icon {
		color: var(--color-primary);
		flex-shrink: 0;
	}

	/* ---- Main / footer --------------------------------------------------- */
	.main {
		flex: 1;
		padding: 1.5rem 0;
	}

	.footer {
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		padding: 1.75rem 0;
	}

	.footer-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.footer-name {
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.footer-tagline {
		font-size: 0.72rem;
		color: var(--color-text-muted);
	}

	.footer-meta {
		font-size: 0.8rem;
		color: var(--color-text-subtle);
	}

	.footer-sep {
		margin: 0 0.4rem;
	}

	.footer-link {
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 600;
	}

	.footer-link:hover {
		text-decoration: underline;
	}

	/* ---- Responsive ------------------------------------------------------ */
	@media (max-width: 1024px) {
		.nav {
			gap: 0.1rem;
		}
		.nav-link {
			padding: 0.4rem 0.6rem;
			font-size: 0.82rem;
		}
		.theme-trigger-label {
			display: none;
		}
	}

	@media (max-width: 760px) {
		.mobile-menu-btn {
			display: inline-flex;
			order: 3;
		}

		.header-actions {
			order: 2;
		}

		.nav {
			display: none;
			position: absolute;
			top: 71px;
			left: 0;
			right: 0;
			order: 4;
			background: var(--color-surface-elevated);
			border-bottom: 1px solid var(--color-border);
			box-shadow: var(--shadow-lg);
			flex-direction: column;
			padding: 0.6rem;
			gap: 0.15rem;
		}

		.nav.open {
			display: flex;
		}

		.nav-link {
			padding: 0.75rem 1rem;
			font-size: 0.92rem;
		}

		.logo-tagline {
			display: none;
		}

		.footer-content {
			flex-direction: column;
			align-items: flex-start;
			text-align: left;
		}
	}
</style>
