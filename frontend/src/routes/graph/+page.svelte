<script lang="ts">
	import { BrandBadge } from '$lib/components';

	interface GraphNode {
		id: string;
		label: string;
		type: string;
		value?: string;
		x: number;
		y: number;
		children: GraphNode[];
		expanded: boolean;
		depth: number;
	}

	let jsonInput = $state('');
	let graphData = $state<GraphNode | null>(null);
	let error = $state<string | null>(null);
	let hoveredNode = $state<GraphNode | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let copiedToClipboard = $state(false);

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copiedToClipboard = true;
		setTimeout(() => {
			copiedToClipboard = false;
		}, 2000);
	}
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let svgElement: SVGSVGElement | null = null;
	let isMaximized = $state(false);

	const NODE_WIDTH = 120;
	const NODE_HEIGHT = 32;
	const LEVEL_WIDTH = 160;
	const NODE_GAP = 8;

	function parseAndBuildGraph() {
		error = null;
		graphData = null;
		selectedNode = null;

		if (!jsonInput.trim()) {
			error = 'Please enter JSON to visualize';
			return;
		}

		try {
			const parsed = JSON.parse(jsonInput);
			graphData = buildGraph(parsed, 'root', 0);
			layoutGraph(graphData);
			centerGraph();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
		}
	}

	function buildGraph(data: unknown, key: string, depth: number): GraphNode {
		const id = `${key}-${depth}-${Math.random().toString(36).substr(2, 9)}`;
		const type = getType(data);

		let children: GraphNode[] = [];
		let value: string | undefined;

		if (Array.isArray(data)) {
			children = data.map((item, index) => buildGraph(item, `[${index}]`, depth + 1));
		} else if (typeof data === 'object' && data !== null) {
			children = Object.entries(data).map(([k, v]) => buildGraph(v, k, depth + 1));
		} else {
			value = formatValue(data);
		}

		return {
			id,
			label: key,
			type,
			value,
			x: 0,
			y: 0,
			children,
			expanded: depth < 4,
			depth
		};
	}

	function getType(data: unknown): string {
		if (data === null) return 'null';
		if (Array.isArray(data)) return 'array';
		return typeof data;
	}

	function formatValue(data: unknown): string {
		if (data === null) return 'null';
		if (typeof data === 'string') return `"${data.length > 15 ? data.slice(0, 15) + '...' : data}"`;
		return String(data);
	}

	function layoutGraph(node: GraphNode, minY = 0): number {
		node.x = node.depth * LEVEL_WIDTH;

		if (!node.expanded || node.children.length === 0) {
			node.y = minY;
			return NODE_HEIGHT + NODE_GAP;
		}

		let currentY = minY;
		let totalHeight = 0;

		for (const child of node.children) {
			const childHeight = layoutGraph(child, currentY);
			currentY += childHeight;
			totalHeight += childHeight;
		}

		// Center parent with children
		const firstChild = node.children[0];
		const lastChild = node.children[node.children.length - 1];
		node.y = (firstChild.y + lastChild.y + NODE_HEIGHT) / 2 - NODE_HEIGHT / 2;

		return totalHeight;
	}

	function centerGraph() {
		if (!graphData || !svgElement) return;
		const bbox = svgElement.getBoundingClientRect();
		panX = bbox.width / 2 - graphData.x - NODE_WIDTH / 2;
		panY = 50;
	}

	function toggleNode(node: GraphNode) {
		node.expanded = !node.expanded;
		if (graphData) {
			layoutGraph(graphData);
			// If toggling root node, center the view
			if (node === graphData) {
				centerGraph();
			}
		}
		graphData = graphData; // Trigger reactivity
	}

	function selectNode(node: GraphNode) {
		// Just for future reference if needed, node details not shown
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		const newScale = Math.max(0.2, Math.min(3, scale * delta));
		scale = newScale;
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			isDragging = true;
			dragStart = { x: e.clientX - panX, y: e.clientY - panY };
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			panX = e.clientX - dragStart.x;
			panY = e.clientY - dragStart.y;
		}
		// Update tooltip position
		tooltipX = e.clientX + 12;
		tooltipY = e.clientY + 12;
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function resetView() {
		scale = 1;
		centerGraph();
	}

	function toggleMaximize() {
		isMaximized = !isMaximized;
	}

	function expandAll() {
		if (graphData) {
			setExpandedRecursive(graphData, true);
			layoutGraph(graphData);
			graphData = graphData;
		}
	}

	function collapseAll() {
		if (graphData) {
			setExpandedRecursive(graphData, false);
			graphData.expanded = true; // Keep root expanded
			layoutGraph(graphData);
			graphData = graphData;
		}
	}

	function setExpandedRecursive(node: GraphNode, expanded: boolean) {
		node.expanded = expanded;
		for (const child of node.children) {
			setExpandedRecursive(child, expanded);
		}
	}

	function loadSample() {
		jsonInput = JSON.stringify({
			application: {
				name: "Freebies",
				version: "2.0.0",
				modules: {
					compare: { enabled: true, maxSize: "10MB" },
					format: { enabled: true, indentSize: 2 },
					viewer: { enabled: true, treeView: true },
					convert: { formats: ["xml", "csv", "yaml"] }
				}
			},
			users: [
				{ id: 1, name: "Admin", role: "admin" },
				{ id: 2, name: "User", role: "user" }
			],
			settings: {
				theme: "dark",
				notifications: true
			}
		}, null, 2);
	}

	function clearAll() {
		jsonInput = '';
		graphData = null;
		error = null;
		selectedNode = null;
	}

	function getNodeColor(type: string): string {
		switch (type) {
			case 'object': return '#6366f1';
			case 'array': return '#8b5cf6';
			case 'string': return '#10b981';
			case 'number': return '#f59e0b';
			case 'boolean': return '#ec4899';
			case 'null': return '#6b7280';
			default: return '#6b7280';
		}
	}

	function getTypeIcon(type: string): string {
		switch (type) {
			case 'object': return '{}';
			case 'array': return '[]';
			case 'string': return '"';
			case 'number': return '#';
			case 'boolean': return '✓';
			case 'null': return '∅';
			default: return '?';
		}
	}

	function collectAllNodes(node: GraphNode): GraphNode[] {
		const nodes: GraphNode[] = [node];
		if (node.expanded) {
			for (const child of node.children) {
				nodes.push(...collectAllNodes(child));
			}
		}
		return nodes;
	}

	function collectAllEdges(node: GraphNode): { from: GraphNode; to: GraphNode }[] {
		const edges: { from: GraphNode; to: GraphNode }[] = [];
		if (node.expanded) {
			for (const child of node.children) {
				edges.push({ from: node, to: child });
				edges.push(...collectAllEdges(child));
			}
		}
		return edges;
	}

	const allNodes = $derived(graphData ? collectAllNodes(graphData) : []);
	const allEdges = $derived(graphData ? collectAllEdges(graphData) : []);
</script>

<svelte:head>
	<title>Graph View - Freebies JSON Tools</title>
</svelte:head>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div class="container" class:maximized={isMaximized}>
	{#if !isMaximized}
		<div class="page-header">
			<BrandBadge />
			<div class="page-header-copy">
				<h1>JSON Graph View</h1>
				<p>Visualize JSON structure as an interactive graph for debugging</p>
			</div>
		</div>
	{/if}

	<div class="graph-layout" class:maximized={isMaximized}>
		{#if !isMaximized}
			<div class="input-panel card">
				<div class="panel-header">
					<h2>Input JSON</h2>
					<div class="header-actions">
						<button class="action-btn" onclick={loadSample}>Load Sample</button>
						<button class="action-btn" onclick={clearAll}>Clear</button>
					</div>
				</div>
				<textarea
					class="json-input"
					bind:value={jsonInput}
					placeholder="Paste JSON to visualize as a graph..."
					spellcheck="false"
				></textarea>
				<div class="panel-footer">
					<button class="btn btn-primary" onclick={parseAndBuildGraph}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="18" cy="5" r="3"/>
							<circle cx="6" cy="12" r="3"/>
							<circle cx="18" cy="19" r="3"/>
							<path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
						</svg>
						Generate Graph
					</button>
				</div>
			</div>
		{/if}

		<div class="graph-panel card" class:maximized={isMaximized}>
			<div class="panel-header">
				<h2>JSON Graph</h2>
				<div class="header-actions">
					{#if graphData}
						<button class="action-btn" onclick={expandAll} title="Expand all nodes">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 5v14M5 12h14"/>
							</svg>
							Expand
						</button>
						<button class="action-btn" onclick={collapseAll} title="Collapse all nodes">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M5 12h14"/>
							</svg>
							Collapse
						</button>
						<button class="action-btn" onclick={resetView} title="Reset view">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
							</svg>
							Reset
						</button>
						<button
							class="action-btn maximize-btn"
							title={isMaximized ? 'Minimize' : 'Maximize'}
							onclick={toggleMaximize}
						>
							{#if isMaximized}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M8 3v6H2M16 3v6h6M2 16v6h6m12 0v6h-6"/>
								</svg>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
								</svg>
							{/if}
						</button>
					{/if}
					<span class="zoom-level">{Math.round(scale * 100)}%</span>
				</div>
			</div>

			{#if error}
				<div class="error-banner">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4M12 16h.01" />
					</svg>
					{error}
				</div>
			{/if}

			<div class="graph-container" onmousemove={handleMouseMove}>
				<!-- Hover tooltip (HTML overlay) -->
				{#if hoveredNode}
					<div class="node-tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
						<div class="tooltip-section">
							<div class="tooltip-label">Type</div>
							<div class="tooltip-value" style="color: {getNodeColor(hoveredNode.type)}">
								{hoveredNode.type}
							</div>
						</div>

						{#if hoveredNode.value}
							<div class="tooltip-section">
								<div class="tooltip-row">
									<div>
										<div class="tooltip-label">Value</div>
										<div class="tooltip-value monospace">
											{hoveredNode.value}
										</div>
									</div>
									<button
										class="copy-btn"
										onclick={() => copyToClipboard(hoveredNode.value || '')}
										title="Copy value"
									>
										{#if copiedToClipboard}
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<polyline points="20 6 9 17 4 12"></polyline>
											</svg>
										{:else}
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
												<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
											</svg>
										{/if}
									</button>
								</div>
							</div>
						{/if}

						{#if hoveredNode.children.length > 0}
							<div class="tooltip-section">
								<div class="tooltip-label">Children</div>
								<div class="tooltip-value">
									{hoveredNode.children.length} item{hoveredNode.children.length !== 1 ? 's' : ''}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				{#if graphData}
					<svg
						bind:this={svgElement}
						class="graph-svg"
						onwheel={handleWheel}
						onmousedown={handleMouseDown}
						style="cursor: {isDragging ? 'grabbing' : 'grab'}"
					>
						<defs>
							<marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
								<polygon points="0 0, 10 3, 0 6" fill="var(--color-border)" opacity="0.5" />
							</marker>
						</defs>
						<g transform="translate({panX}, {panY}) scale({scale})">
							<!-- Edges -->
							{#each allEdges as edge}
								<path
									class="edge"
									d="M {edge.from.x + NODE_WIDTH} {edge.from.y + NODE_HEIGHT / 2}
									   C {edge.from.x + NODE_WIDTH + 40} {edge.from.y + NODE_HEIGHT / 2},
									     {edge.to.x - 40} {edge.to.y + NODE_HEIGHT / 2},
									     {edge.to.x} {edge.to.y + NODE_HEIGHT / 2}"
									fill="none"
									stroke="var(--color-border)"
									stroke-width="1.5"
									opacity="0.6"
								/>
							{/each}

							<!-- Nodes -->
							{#each allNodes as node}
								<g class="node-group" transform="translate({node.x}, {node.y})">
									<!-- Node card with click -->
									<g
										class="node-card"
										class:hovered={hoveredNode?.id === node.id}
										onmouseenter={() => (hoveredNode = node)}
										onmouseleave={() => (hoveredNode = null)}
										onclick={() => {
											selectNode(node);
											if (node.children.length > 0) {
												toggleNode(node);
											}
										}}
										role="button"
										tabindex="0"
									>
										<rect
											class="node-bg"
											width={NODE_WIDTH}
											height={NODE_HEIGHT}
											rx="6"
											fill={getNodeColor(node.type)}
											opacity="0.15"
											stroke={getNodeColor(node.type)}
											stroke-width="1.5"
										/>

										<!-- Type icon -->
										<circle cx="8" cy={NODE_HEIGHT / 2} r="4" fill={getNodeColor(node.type)} />

										<!-- Label -->
										<text
											class="node-label"
											x="16"
											y={NODE_HEIGHT / 2 + 1}
											fill="var(--color-text)"
											font-size="11"
											font-weight="500"
											dominant-baseline="middle"
										>
											{node.label.length > 14 ? node.label.slice(0, 14) + '…' : node.label}
										</text>

										<!-- Children count badge -->
										{#if node.children.length > 0 && node.expanded}
											<text
												class="node-count"
												x={NODE_WIDTH - 8}
												y={NODE_HEIGHT / 2 + 1}
												fill="var(--color-text-muted)"
												font-size="9"
												text-anchor="end"
												dominant-baseline="middle"
											>
												{node.children.length}
											</text>
										{/if}
									</g>

									<!-- Toggle button -->
									{#if node.children.length > 0}
										<g
											class="toggle-btn"
											transform="translate({NODE_WIDTH - 8}, {NODE_HEIGHT / 2 - 7})"
											role="button"
											tabindex="0"
										>
											<rect
												width="14"
												height="14"
												rx="3"
												fill={getNodeColor(node.type)}
												opacity="0.2"
												stroke={getNodeColor(node.type)}
												stroke-width="1.5"
											/>
											<text
												x="7"
												y="9"
												text-anchor="middle"
												fill={getNodeColor(node.type)}
												font-size="11"
												font-weight="900"
											>
												{node.expanded ? '−' : '+'}
											</text>
										</g>
									{/if}

									<!-- Hover tooltip (HTML-based for better rendering) -->
								</g>
							{/each}
						</g>
					</svg>
				{:else}
					<div class="empty-state">
						<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
							<circle cx="18" cy="5" r="3"/>
							<circle cx="6" cy="12" r="3"/>
							<circle cx="18" cy="19" r="3"/>
							<path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
						</svg>
						<h3>No Graph Data</h3>
						<p>Enter JSON and click "Generate Graph" to visualize</p>
					</div>
				{/if}
			</div>
		</div>

	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.container.maximized {
		height: 100vh;
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.page-header h1 {
		font-size: 1.5rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-bottom: 0.25rem;
	}

	.page-header p {
		color: var(--color-text-muted);
	}

	.graph-layout {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 1rem;
		height: calc(100vh - 220px);
		min-height: 500px;
		flex: 1;
	}

	.graph-layout.maximized {
		height: 100vh;
		grid-template-columns: 1fr;
		gap: 0;
	}


	.input-panel,
	.graph-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.graph-panel.maximized {
		border-radius: 0;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.panel-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.action-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.375rem 0.75rem;
		border-radius: 5px;
		font-size: 0.75rem;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		cursor: pointer;
	}

	.action-btn:hover {
		background: var(--color-primary);
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
		color: var(--color-text);
		border-color: var(--color-primary);
	}

	.zoom-level {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		padding: 0.25rem 0.5rem;
		background: var(--color-bg);
		border-radius: 4px;
	}

	.json-input {
		flex: 1;
		background: var(--color-bg);
		border: none;
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		padding: 1rem;
		resize: none;
		outline: none;
		line-height: 1.5;
	}

	.json-input::placeholder {
		color: var(--color-text-muted);
	}

	.panel-footer {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.panel-footer .btn {
		width: 100%;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-removed);
		border-bottom: 1px solid var(--color-removed-border);
		color: var(--color-error);
		font-size: 0.875rem;
	}

	.graph-container {
		flex: 1;
		position: relative;
		overflow: hidden;
		background: linear-gradient(135deg, var(--color-bg) 0%, color-mix(in srgb, var(--color-surface) 20%, var(--color-bg) 80%) 100%);
	}

	.graph-svg {
		width: 100%;
		height: 100%;
		background: transparent;
	}

	.edge {
		pointer-events: none;
	}

	.node-group {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.node-card {
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.node-card:hover .node-bg {
		opacity: 0.25;
		filter: brightness(1.15) saturate(1.2);
		stroke-width: 2;
	}

	.node-card:hover circle:first-child {
		filter: drop-shadow(0 0 4px currentColor);
		opacity: 1;
		r: 5;
	}

	/* Light theme specific styles */
	@media (prefers-color-scheme: light) {
		.node-card:hover .node-bg {
			opacity: 0.18;
			filter: brightness(0.95) saturate(1.3);
		}
	}

	.node-label {
		pointer-events: none;
		user-select: none;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.node-card:hover .node-label {
		font-weight: 600;
	}

	.node-count {
		pointer-events: none;
		user-select: none;
		font-weight: 600;
		transition: opacity 0.2s ease;
	}

	.node-card:hover .node-count {
		opacity: 1;
		filter: drop-shadow(0 0 3px currentColor);
	}

	.toggle-btn {
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.toggle-btn rect {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.toggle-btn:hover rect {
		opacity: 0.35;
		filter: brightness(1.2) drop-shadow(0 0 4px currentColor);
		stroke-width: 2;
	}

	.toggle-btn:hover text {
		filter: drop-shadow(0 0 2px currentColor);
	}

	.toggle-btn text {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		user-select: none;
		pointer-events: none;
	}

	/* Light theme toggle button */
	@media (prefers-color-scheme: light) {
		.toggle-btn rect {
			opacity: 0.15;
		}

		.toggle-btn:hover rect {
			opacity: 0.25;
			filter: brightness(0.9) drop-shadow(0 0 3px currentColor);
		}
	}

	.node-tooltip {
		position: fixed;
		background: var(--color-surface);
		border: 1.5px solid var(--color-border);
		border-radius: 8px;
		padding: 0.875rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
		z-index: 100;
		pointer-events: none;
		animation: tooltipSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		min-width: 200px;
		max-width: 300px;
		backdrop-filter: blur(12px);
	}

	@media (prefers-color-scheme: light) {
		.node-tooltip {
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
			border-color: var(--color-border);
		}
	}

	.tooltip-section {
		margin-bottom: 0.75rem;
	}

	.tooltip-section:last-child {
		margin-bottom: 0;
	}

	.tooltip-row {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.tooltip-row > div {
		flex: 1;
		min-width: 0;
	}

	.tooltip-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-text-muted);
		margin-bottom: 0.375rem;
	}

	.tooltip-value {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text);
		line-height: 1.4;
		word-break: break-all;
	}

	.tooltip-value.monospace {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		background: rgba(99, 102, 241, 0.08);
		padding: 0.375rem 0.5rem;
		border-radius: 4px;
		border: 1px solid rgba(99, 102, 241, 0.2);
		word-break: break-word;
	}

	.copy-btn {
		background: transparent;
		border: 1px solid rgba(99, 102, 241, 0.3);
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.375rem 0.5rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		flex-shrink: 0;
		margin-top: 1.2rem;
	}

	.copy-btn:hover {
		background: rgba(99, 102, 241, 0.15);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.copy-btn:active {
		transform: scale(0.95);
	}

	@keyframes tooltipSlideIn {
		from {
			opacity: 0;
			transform: translateY(-4px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.empty-state {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		text-align: center;
		padding: 2rem;
	}

	.empty-state svg {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		font-size: 1.125rem;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}


	@media (max-width: 900px) {
		.graph-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.input-panel {
			min-height: 200px;
		}

		.graph-panel {
			min-height: 500px;
		}
	}
</style>
