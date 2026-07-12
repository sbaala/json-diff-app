<script lang="ts">
	import { onMount } from 'svelte';

	interface GraphNode {
		id: string;
		label: string;
		type: string;
		value?: string;
		x: number;
		y: number;
		children: GraphNode[];
		expanded: boolean;
	}

	let jsonInput = $state('');
	let graphData = $state<GraphNode | null>(null);
	let error = $state<string | null>(null);
	let selectedNode = $state<GraphNode | null>(null);
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let svgElement: SVGSVGElement | null = null;

	const NODE_WIDTH = 150;
	const NODE_HEIGHT = 40;
	const LEVEL_HEIGHT = 80;
	const NODE_GAP = 20;

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
			y: depth * LEVEL_HEIGHT,
			children,
			expanded: depth < 3
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

	function layoutGraph(node: GraphNode, minX = 0): number {
		if (!node.expanded || node.children.length === 0) {
			node.x = minX;
			return NODE_WIDTH + NODE_GAP;
		}

		let currentX = minX;
		let totalWidth = 0;

		for (const child of node.children) {
			const childWidth = layoutGraph(child, currentX);
			currentX += childWidth;
			totalWidth += childWidth;
		}

		// Center parent above children
		const firstChild = node.children[0];
		const lastChild = node.children[node.children.length - 1];
		node.x = (firstChild.x + lastChild.x + NODE_WIDTH) / 2 - NODE_WIDTH / 2;

		return totalWidth;
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
		}
		graphData = graphData; // Trigger reactivity
	}

	function selectNode(node: GraphNode) {
		selectedNode = node;
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
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function resetView() {
		scale = 1;
		centerGraph();
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
			case 'object': return 'var(--color-primary)';
			case 'array': return 'var(--color-secondary)';
			case 'string': return 'var(--color-success)';
			case 'number': return '#f59e0b';
			case 'boolean': return '#ec4899';
			case 'null': return 'var(--color-error)';
			default: return 'var(--color-text-muted)';
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

<div class="container">
	<div class="page-header">
		<h1>JSON Graph View</h1>
		<p>Visualize JSON structure as an interactive graph for debugging</p>
	</div>

	<div class="graph-layout">
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

		<div class="graph-panel card">
			<div class="panel-header">
				<h2>Graph View</h2>
				<div class="header-actions">
					{#if graphData}
						<button class="action-btn" onclick={expandAll}>Expand All</button>
						<button class="action-btn" onclick={collapseAll}>Collapse All</button>
						<button class="action-btn" onclick={resetView}>Reset View</button>
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

			<div class="graph-container">
				{#if graphData}
					<svg
						bind:this={svgElement}
						class="graph-svg"
						onwheel={handleWheel}
						onmousedown={handleMouseDown}
						style="cursor: {isDragging ? 'grabbing' : 'grab'}"
					>
						<g transform="translate({panX}, {panY}) scale({scale})">
							<!-- Edges -->
							{#each allEdges as edge}
								<path
									class="edge"
									d="M {edge.from.x + NODE_WIDTH / 2} {edge.from.y + NODE_HEIGHT}
									   C {edge.from.x + NODE_WIDTH / 2} {edge.from.y + NODE_HEIGHT + 30},
									     {edge.to.x + NODE_WIDTH / 2} {edge.to.y - 30},
									     {edge.to.x + NODE_WIDTH / 2} {edge.to.y}"
									fill="none"
									stroke="var(--color-border)"
									stroke-width="2"
								/>
							{/each}

							<!-- Nodes -->
							{#each allNodes as node}
								<g
									class="node"
									class:selected={selectedNode?.id === node.id}
									transform="translate({node.x}, {node.y})"
									onclick={() => selectNode(node)}
									role="button"
									tabindex="0"
								>
									<rect
										width={NODE_WIDTH}
										height={NODE_HEIGHT}
										rx="8"
										fill="var(--color-surface)"
										stroke={getNodeColor(node.type)}
										stroke-width="2"
									/>
									<text
										x={NODE_WIDTH / 2}
										y="16"
										text-anchor="middle"
										fill="var(--color-text)"
										font-size="11"
										font-weight="600"
									>
										{node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
									</text>
									<text
										x={NODE_WIDTH / 2}
										y="30"
										text-anchor="middle"
										fill={getNodeColor(node.type)}
										font-size="9"
									>
										{node.type}{node.value ? `: ${node.value.slice(0, 10)}` : ''}
										{node.children.length > 0 ? ` (${node.children.length})` : ''}
									</text>
									
									{#if node.children.length > 0}
										<g
											class="toggle-btn"
											transform="translate({NODE_WIDTH / 2 - 8}, {NODE_HEIGHT - 4})"
										onclick={(e) => { e.stopPropagation(); toggleNode(node); }}
											role="button"
											tabindex="0"
										>
											<circle r="8" fill="var(--color-bg)" stroke="var(--color-border)" />
											<text
												y="4"
												text-anchor="middle"
												fill="var(--color-text)"
												font-size="12"
												font-weight="bold"
											>
												{node.expanded ? '−' : '+'}
											</text>
										</g>
									{/if}
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

			{#if selectedNode}
				<div class="node-details">
					<h3>Node Details</h3>
					<div class="detail-row">
						<span class="detail-label">Key:</span>
						<span class="detail-value">{selectedNode.label}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Type:</span>
						<span class="detail-value type-badge" style="color: {getNodeColor(selectedNode.type)}">{selectedNode.type}</span>
					</div>
					{#if selectedNode.value}
						<div class="detail-row">
							<span class="detail-label">Value:</span>
							<span class="detail-value">{selectedNode.value}</span>
						</div>
					{/if}
					{#if selectedNode.children.length > 0}
						<div class="detail-row">
							<span class="detail-label">Children:</span>
							<span class="detail-value">{selectedNode.children.length}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		font-size: 2rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-bottom: 0.5rem;
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
	}

	.input-panel,
	.graph-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		border-radius: 6px;
		font-size: 0.75rem;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: var(--color-bg);
		color: var(--color-text);
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
		background: var(--color-bg);
	}

	.graph-svg {
		width: 100%;
		height: 100%;
	}

	.node {
		cursor: pointer;
	}

	.node:hover rect {
		filter: brightness(1.1);
	}

	.node.selected rect {
		stroke-width: 3;
		filter: drop-shadow(0 0 8px currentColor);
	}

	.toggle-btn {
		cursor: pointer;
	}

	.toggle-btn:hover circle {
		fill: var(--color-surface);
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

	.node-details {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.node-details h3 {
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
		color: var(--color-text-muted);
	}

	.detail-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.detail-label {
		color: var(--color-text-muted);
		min-width: 60px;
	}

	.detail-value {
		font-family: var(--font-mono);
	}

	.type-badge {
		font-weight: 600;
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
