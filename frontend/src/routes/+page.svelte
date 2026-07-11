<script lang="ts">
	const CONTACT_EMAIL = 'tamizhezhutthu@gmail.com';

	const services = [
		{
			title: 'Software Engineering',
			desc: 'Full-stack web, API, and cloud-native platforms — architected for scale, shipped with confidence, and built to last.',
			points: ['Web & API platforms', 'Cloud-native architecture', 'DevOps & CI/CD'],
			icon: 'code'
		},
		{
			title: 'AI Solutions',
			desc: 'Applied AI that moves the needle — LLM assistants, RAG systems, and ML pipelines wired into your real workflows.',
			points: ['LLM & RAG applications', 'ML pipelines', 'Data intelligence'],
			icon: 'ai'
		},
		{
			title: 'Intelligent Automation',
			desc: 'Automate the repetitive and orchestrate the complex — workflow automation and agents that free your teams to focus.',
			points: ['Workflow automation', 'Autonomous agents', 'Systems integration'],
			icon: 'automation'
		}
	];

	const tools = [
		{ href: '/format', label: 'Format', desc: 'Beautify, minify & sort JSON' },
		{ href: '/viewer', label: 'Viewer', desc: 'Interactive tree explorer' },
		{ href: '/grid', label: 'Grid', desc: 'Spreadsheet-style table view' },
		{ href: '/compare', label: 'JSON Diff', desc: 'Side-by-side structural diff' },
		{ href: '/text', label: 'Text Diff', desc: 'Line-by-line comparison' },
		{ href: '/convert', label: 'Convert', desc: 'JSON ↔ YAML / CSV / XML' },
		{ href: '/lint', label: 'Lint', desc: 'Validate & lint schemas' },
		{ href: '/graph', label: 'Graph', desc: 'Visual structure rendering' }
	];

	const stats = [
		{ value: '8', label: 'Built-in tools' },
		{ value: '5', label: 'Professional themes' },
		{ value: '100%', label: 'Client-first privacy' }
	];
</script>

<svelte:head>
	<title>VinMi — Building Intelligent Enterprise Solutions</title>
	<meta
		name="description"
		content="VinMi builds intelligent enterprise solutions — custom software, applied AI, and intelligent automation — alongside a professional JSON toolkit."
	/>
</svelte:head>

<div class="home">
	<!-- ---------------------------------------------------------------- Hero -->
	<section class="hero container">
		<span class="eyebrow">VinMi</span>
		<h1 class="hero-title">
			Building <span class="grad">Intelligent</span><br />Enterprise Solutions
		</h1>
		<p class="hero-sub">
			We design and engineer the software, AI, and automation that modern enterprises run on —
			pragmatic, secure, and built to scale. This toolkit is a taste of how we sweat the details.
		</p>
		<div class="hero-cta">
			<a href="/format" class="btn btn-primary">Explore the Toolkit</a>
			<a href="mailto:{CONTACT_EMAIL}" class="btn btn-secondary">Get in touch</a>
		</div>

		<div class="stats">
			{#each stats as s}
				<div class="stat">
					<span class="stat-value">{s.value}</span>
					<span class="stat-label">{s.label}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- ---------------------------------------------------------- Services -->
	<section class="container section">
		<header class="section-head">
			<h2>What we build</h2>
			<p>From first line of code to autonomous systems in production.</p>
		</header>

		<div class="service-grid">
			{#each services as svc}
				<article class="card service-card">
					<span class="service-icon" aria-hidden="true">
						{#if svc.icon === 'code'}
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="16 18 22 12 16 6" />
								<polyline points="8 6 2 12 8 18" />
							</svg>
						{:else if svc.icon === 'ai'}
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="4" y="8" width="16" height="12" rx="2" />
								<path d="M12 8V4M8 2h8M9 13h.01M15 13h.01M9 17h6" />
							</svg>
						{:else}
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="3" />
								<path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
							</svg>
						{/if}
					</span>
					<h3>{svc.title}</h3>
					<p>{svc.desc}</p>
					<ul>
						{#each svc.points as p}
							<li>{p}</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</section>

	<!-- ------------------------------------------------------------- Toolkit -->
	<section class="container section">
		<header class="section-head">
			<h2>The VinMi JSON Toolkit</h2>
			<p>Eight fast, privacy-friendly utilities — everything runs right in your browser.</p>
		</header>

		<div class="tool-grid">
			{#each tools as t}
				<a href={t.href} class="card tool-card">
					<span class="tool-label">{t.label}</span>
					<span class="tool-desc">{t.desc}</span>
					<span class="tool-arrow" aria-hidden="true">→</span>
				</a>
			{/each}
		</div>
	</section>

	<!-- ------------------------------------------------------------- Contact -->
	<section class="container section">
		<div class="card contact">
			<div class="contact-copy">
				<h2>Let's build something intelligent</h2>
				<p>
					Have a product, platform, or automation challenge? We'd love to hear about it.
				</p>
			</div>
			<a href="mailto:{CONTACT_EMAIL}" class="contact-email">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="2" y="4" width="20" height="16" rx="2" />
					<path d="m22 7-10 6L2 7" />
				</svg>
				{CONTACT_EMAIL}
			</a>
		</div>
	</section>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
	}

	.section {
		padding: 2.5rem 1.5rem;
	}

	/* ---- Hero ------------------------------------------------------------ */
	.hero {
		text-align: center;
		padding: 4rem 1.5rem 2.5rem;
		background: var(--gradient-subtle);
		border-radius: var(--radius-lg);
	}

	.eyebrow {
		display: inline-block;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-primary);
		padding: 0.35rem 0.85rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-full);
		background: var(--color-primary-soft);
		margin-bottom: 1.5rem;
	}

	.hero-title {
		font-size: clamp(2.2rem, 6vw, 3.6rem);
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: -0.03em;
		color: var(--color-text);
	}

	.grad {
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.hero-sub {
		max-width: 620px;
		margin: 1.5rem auto 0;
		font-size: 1.08rem;
		color: var(--color-text-muted);
	}

	.hero-cta {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 2rem;
	}

	.stats {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 2.5rem;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border);
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.stat-label {
		font-size: 0.82rem;
		color: var(--color-text-muted);
	}

	/* ---- Section headings ------------------------------------------------ */
	.section-head {
		text-align: center;
		margin-bottom: 2.25rem;
	}

	.section-head h2 {
		font-size: clamp(1.6rem, 3.5vw, 2.1rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.section-head p {
		margin-top: 0.6rem;
		color: var(--color-text-muted);
	}

	/* ---- Services -------------------------------------------------------- */
	.service-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	.service-card {
		padding: 1.75rem;
		transition: transform var(--transition), box-shadow var(--transition),
			border-color var(--transition);
	}

	.service-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-glow);
		border-color: var(--color-primary);
	}

	.service-icon {
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border-radius: var(--radius);
		background: var(--color-primary-soft);
		color: var(--color-primary);
		margin-bottom: 1.1rem;
	}

	.service-card h3 {
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.service-card p {
		margin-top: 0.55rem;
		color: var(--color-text-muted);
		font-size: 0.94rem;
	}

	.service-card ul {
		list-style: none;
		margin-top: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.service-card li {
		position: relative;
		padding-left: 1.4rem;
		font-size: 0.9rem;
		color: var(--color-text);
	}

	.service-card li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.5rem;
		width: 7px;
		height: 7px;
		border-radius: var(--radius-full);
		background: var(--gradient-primary);
	}

	/* ---- Tools ----------------------------------------------------------- */
	.tool-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.tool-card {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 1.25rem;
		text-decoration: none;
		position: relative;
		transition: transform var(--transition), box-shadow var(--transition),
			border-color var(--transition);
	}

	.tool-card:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-primary);
	}

	.tool-label {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.tool-desc {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.tool-arrow {
		position: absolute;
		top: 1.1rem;
		right: 1.2rem;
		color: var(--color-primary);
		font-size: 1.1rem;
		opacity: 0;
		transform: translateX(-4px);
		transition: opacity var(--transition), transform var(--transition);
	}

	.tool-card:hover .tool-arrow {
		opacity: 1;
		transform: translateX(0);
	}

	/* ---- Contact --------------------------------------------------------- */
	.contact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding: 2.25rem 2.5rem;
		background: var(--gradient-subtle), var(--color-surface);
		border-color: var(--color-border-strong);
	}

	.contact-copy h2 {
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.contact-copy p {
		margin-top: 0.4rem;
		color: var(--color-text-muted);
	}

	.contact-email {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.85rem 1.4rem;
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
		box-shadow: var(--shadow-sm);
		transition: background var(--transition), box-shadow var(--transition);
	}

	.contact-email:hover {
		background: var(--color-primary-hover);
		box-shadow: var(--shadow-glow);
	}

	@media (max-width: 640px) {
		.hero {
			padding: 2.5rem 1.25rem 2rem;
		}
		.stats {
			gap: 1.5rem;
		}
		.contact {
			flex-direction: column;
			align-items: flex-start;
			padding: 1.75rem;
		}
	}
</style>
