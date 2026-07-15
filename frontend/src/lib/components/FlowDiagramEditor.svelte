<script lang="ts">
	import { onMount } from 'svelte';

	interface FlowNode {
		id: string;
		label: string;
		type: 'start' | 'end' | 'process' | 'decision' | 'data';
		x: number;
		y: number;
	}

	interface FlowEdge {
		from: string;
		to: string;
		label?: string;
	}

	interface FlowDiagram {
		nodes: FlowNode[];
		edges: FlowEdge[];
	}

	let jsonInput = $state(JSON.stringify(getDefaultDiagram(), null, 2));
	let diagram = $state<FlowDiagram>(getDefaultDiagram());
	let error = $state<string | null>(null);
	let selectedNodeId = $state<string | null>(null);
	let draggedNodeId = $state<string | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let svgElement: SVGSVGElement | null = null;

	const NODE_WIDTH = 140;
	const NODE_HEIGHT = 60;

	function getDefaultDiagram(): FlowDiagram {
		return {
			nodes: [
				{ id: '1', label: 'Start', type: 'start', x: 100, y: 50 },
				{ id: '2', label: 'Validate Input', type: 'process', x: 100, y: 150 },
				{ id: '3', label: 'Valid?', type: 'decision', x: 100, y: 280 },
				{ id: '4', label: 'Process Data', type: 'process', x: 300, y: 280 },
				{ id: '5', label: 'Return Result', type: 'data', x: 300, y: 400 },
				{ id: '6', label: 'Show Error', type: 'process', x: -100, y: 280 },
				{ id: '7', label: 'End', type: 'end', x: 100, y: 500 }
			],
			edges: [
				{ from: '1', to: '2' },
				{ from: '2', to: '3' },
				{ from: '3', to: '4', label: 'Yes' },
				{ from: '3', to: '6', label: 'No' },
				{ from: '4', to: '5' },
				{ from: '5', to: '7' },
				{ from: '6', to: '7' }
			]
		};
	}

	function parseJson() {
		error = null;
		try {
			const parsed = JSON.parse(jsonInput) as FlowDiagram;
			if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
				throw new Error('Missing nodes array');
			}
			if (!parsed.edges || !Array.isArray(parsed.edges)) {
				throw new Error('Missing edges array');
			}
			diagram = parsed;
			selectedNodeId = null;
			centerGraph();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
		}
	}

	function centerGraph() {
		if (!svgElement || diagram.nodes.length === 0) return;
		const bbox = svgElement.getBoundingClientRect();
		const allX = diagram.nodes.map(n => n.x);
		const allY = diagram.nodes.map(n => n.y);
		const minX = Math.min(...allX);
		const maxX = Math.max(...allX);
		const minY = Math.min(...allY);
		const maxY = Math.max(...allY);

		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;
		panX = bbox.width / 2 - centerX;
		panY = bbox.height / 2 - centerY;
	}

	function getNodeColor(type: string): { fill: string; stroke: string; icon: string } {
		const colors = {
			start: { fill: '#10b981', stroke: '#059669', icon: '●' },
			end: { fill: '#ef4444', stroke: '#dc2626', icon: '⊚' },
			process: { fill: '#3b82f6', stroke: '#1d4ed8', icon: '▭' },
			decision: { fill: '#f59e0b', stroke: '#d97706', icon: '◇' },
			data: { fill: '#8b5cf6', stroke: '#7c3aed', icon: '▬' }
		};
		return colors[type as keyof typeof colors] || colors.process;
	}

	function getConnectedEdges(nodeId: string): FlowEdge[] {
		return diagram.edges.filter(e => e.from === nodeId || e.to === nodeId);
	}

	function handleNodeMouseDown(e: MouseEvent, nodeId: string) {
		if (e.button !== 0) return;
		draggedNodeId = nodeId;
		const node = diagram.nodes.find(n => n.id === nodeId);
		if (node) {
			dragOffset = {
				x: e.clientX - node.x,
				y: e.clientY - node.y
			};
		}
		e.stopPropagation();
	}

	function handleSvgMouseDown(e: MouseEvent) {
		if (e.button === 0 && !draggedNodeId) {
			isDragging = true;
			dragStart = { x: e.clientX - panX, y: e.clientY - panY };
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (draggedNodeId) {
			const node = diagram.nodes.find(n => n.id === draggedNodeId);
			if (node) {
				node.x = e.clientX - dragOffset.x;
				node.y = e.clientY - dragOffset.y;
				diagram = diagram;
			}
		} else if (isDragging) {
			panX = e.clientX - dragStart.x;
			panY = e.clientY - dragStart.y;
		}
	}

	function handleMouseUp() {
		draggedNodeId = null;
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		scale = Math.max(0.3, Math.min(3, scale * delta));
	}

	function selectNode(nodeId: string) {
		selectedNodeId = selectedNodeId === nodeId ? null : nodeId;
	}

	function resetView() {
		scale = 1;
		centerGraph();
	}

	function updateJsonFromDiagram() {
		jsonInput = JSON.stringify(diagram, null, 2);
	}

	function getEdgePoints(fromId: string, toId: string) {
		const from = diagram.nodes.find(n => n.id === fromId);
		const to = diagram.nodes.find(n => n.id === toId);
		if (!from || !to) return null;

		const x1 = from.x + NODE_WIDTH / 2;
		const y1 = from.y + NODE_HEIGHT;
		const x2 = to.x + NODE_WIDTH / 2;
		const y2 = to.y;

		const midY = (y1 + y2) / 2;
		return {
			x1,
			y1,
			x2,
			y2,
			path: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
		};
	}

	function exportDiagram() {
		const element = document.createElement('a');
		element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonInput));
		element.setAttribute('download', 'flow-diagram.json');
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}

	onMount(() => {
		centerGraph();
	});
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="container">
	<div class="page-header">
		<h1>Flow Diagram Builder</h1>
		<p>Create interactive flow diagrams with drag-and-drop nodes</p>
	</div>

	<div class="diagram-layout">
		<div class="input-panel card">
			<div class="panel-header">
				<h2>Flow Data</h2>
				<div class="header-actions">
					<button class="action-btn" onclick={resetView} title="Reset view">↺</button>
					<button class="action-btn" onclick={exportDiagram} title="Export as JSON">⬇</button>
				</div>
			</div>

			<div class="json-editor">
				<textarea
					class="json-input"
					bind:value={jsonInput}
					placeholder="Paste flow diagram JSON..."
					spellcheck="false"
				></textarea>
			</div>

			<div class="panel-footer">
				<button class="btn btn-primary" onclick={parseJson}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 12h14M12 5v14" />
					</svg>
					Build Diagram
				</button>
			</div>
		</div>

		<div class="canvas-panel card">
			<div class="panel-header">
				<h2>Visual Editor</h2>
				<div class="header-actions">
					<span class="zoom-level">{Math.round(scale * 100)}%</span>
					{#if selectedNodeId}
						<button class="action-btn" onclick={() => (selectedNodeId = null)}>Deselect</button>
					{/if}
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

			<div class="canvas-container">
				<svg
					bind:this={svgElement}
					class="canvas-svg"
					onwheel={handleWheel}
					onmousedown={handleSvgMouseDown}
					style="cursor: {isDragging ? 'grabbing' : 'grab'}"
				>
					<defs>
						<marker
							id="arrowhead"
							markerWidth="10"
							markerHeight="10"
							refX="9"
							refY="3"
							orient="auto"
						>
							<polygon points="0 0, 10 3, 0 6" fill="var(--edge-color)" />
						</marker>
						<filter id="glow">
							<feGaussianBlur stdDeviation="3" result="coloredBlur" />
							<feMerge>
								<feMergeNode in="coloredBlur" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
						</filter>
					</defs>

					<!-- Grid background -->
					<defs>
						<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
							<path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border)" stroke-width="0.5" />
						</pattern>
					</defs>
					<rect width="5000" height="5000" fill="url(#grid)" />

					<g style="--edge-color: var(--color-primary)" transform="translate({panX}, {panY}) scale({scale})">
						<!-- Edges -->
						{#each diagram.edges as edge}
							{@const edgePoints = getEdgePoints(edge.from, edge.to)}
							{#if edgePoints}
								<g class="edge-group">
									<path
										class="edge"
										class:highlighted={selectedNodeId &&
											(selectedNodeId === edge.from || selectedNodeId === edge.to)}
										d={edgePoints.path}
										stroke="var(--color-border)"
										stroke-width="2"
										fill="none"
										marker-end="url(#arrowhead)"
									/>
									{#if edge.label}
										<text
											x={(edgePoints.x1 + edgePoints.x2) / 2}
											y={(edgePoints.y1 + edgePoints.y2) / 2 - 8}
											text-anchor="middle"
											class="edge-label"
										>
											{edge.label}
										</text>
									{/if}
								</g>
							{/if}
						{/each}

						<!-- Nodes -->
						{#each diagram.nodes as node (node.id)}
							{@const color = getNodeColor(node.type)}
							<g
								class="node"
								class:selected={selectedNodeId === node.id}
								transform="translate({node.x}, {node.y})"
								onmousedown={(e) => handleNodeMouseDown(e, node.id)}
								onclick={() => selectNode(node.id)}
								role="button"
								tabindex="0"
							>
								<!-- Node shadow -->
								<rect
									class="node-shadow"
									x={-NODE_WIDTH / 2}
									y={-NODE_HEIGHT / 2}
									width={NODE_WIDTH}
									height={NODE_HEIGHT}
									rx="8"
									fill="rgba(0, 0, 0, 0.1)"
									filter="url(#glow)"
								/>

								<!-- Node body -->
								{#if node.type === 'decision'}
									<!-- Diamond shape for decision -->
									<polygon
										class="node-body"
										points="0,-30 70,0 0,30 -70,0"
										fill={color.fill}
										stroke={color.stroke}
										stroke-width="2"
									/>
								{:else}
									<!-- Rectangle for others -->
									<rect
										class="node-body"
										x={-NODE_WIDTH / 2}
										y={-NODE_HEIGHT / 2}
										width={NODE_WIDTH}
										height={NODE_HEIGHT}
										rx="8"
										fill={color.fill}
										stroke={color.stroke}
										stroke-width="2"
									/>
								{/if}

								<!-- Node text -->
								<text
									class="node-label"
									text-anchor="middle"
									y="0"
									dominant-baseline="middle"
									fill="white"
									font-weight="600"
									font-size="13"
									pointer-events="none"
								>
									{node.label}
								</text>

								<!-- Node type indicator -->
								<text
									class="node-type-icon"
									text-anchor="middle"
									y={-NODE_HEIGHT / 2 + 12}
									fill={color.stroke}
									font-size="16"
									pointer-events="none"
								>
									{color.icon}
								</text>
							</g>
						{/each}
					</g>
				</svg>
			</div>

			{#if selectedNodeId}
				{@const selectedNode = diagram.nodes.find(n => n.id === selectedNodeId)}
				{#if selectedNode}
					<div class="node-info">
						<h3>Node Details</h3>
						<div class="info-grid">
							<div class="info-item">
								<label>Label</label>
								<input
									type="text"
									value={selectedNode.label}
									onchange={(e) => {
										selectedNode.label = e.currentTarget.value;
										updateJsonFromDiagram();
									}}
								/>
							</div>
							<div class="info-item">
								<label>Type</label>
								<select
									value={selectedNode.type}
									onchange={(e) => {
										selectedNode.type = e.currentTarget.value as FlowNode['type'];
										updateJsonFromDiagram();
									}}
								>
									<option value="start">Start</option>
									<option value="end">End</option>
									<option value="process">Process</option>
									<option value="decision">Decision</option>
									<option value="data">Data</option>
								</select>
							</div>
						</div>
						<div class="info-connections">
							<div>
								<strong>Incoming:</strong>
								{diagram.edges.filter(e => e.to === selectedNodeId).length}
							</div>
							<div>
								<strong>Outgoing:</strong>
								{diagram.edges.filter(e => e.from === selectedNodeId).length}
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2.5rem;
		background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-bottom: 0.5rem;
		font-weight: 700;
	}

	.page-header p {
		color: var(--color-text-muted);
		font-size: 1rem;
	}

	.diagram-layout {
		display: grid;
		grid-template-columns: 380px 1fr;
		gap: 1.5rem;
		height: calc(100vh - 240px);
		min-height: 600px;
	}

	.input-panel,
	.canvas-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 12px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.panel-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.action-btn {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 32px;
	}

	.action-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.zoom-level {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		padding: 0.375rem 0.75rem;
		background: var(--color-bg);
		border-radius: 6px;
		min-width: 50px;
		text-align: center;
	}

	.json-editor {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		line-height: 1.6;
		overflow-y: auto;
	}

	.json-input::placeholder {
		color: var(--color-text-muted);
	}

	.panel-footer {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.panel-footer .btn {
		width: 100%;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		background: rgba(239, 68, 68, 0.1);
		border-bottom: 1px solid rgba(239, 68, 68, 0.2);
		color: #ef4444;
		font-size: 0.875rem;
	}

	.canvas-container {
		flex: 1;
		position: relative;
		overflow: hidden;
		background: var(--color-bg);
		--edge-color: var(--color-primary);
	}

	.canvas-svg {
		width: 100%;
		height: 100%;
		background: var(--color-bg);
	}

	.node {
		cursor: grab;
		user-select: none;
		transition: all 0.2s ease;
	}

	.node:active {
		cursor: grabbing;
	}

	.node-body {
		transition: all 0.2s ease;
		filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
	}

	.node:hover .node-body {
		filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.25));
		stroke-width: 3;
	}

	.node.selected .node-body {
		stroke-width: 3;
		filter: drop-shadow(0 0 20px currentColor);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			filter: drop-shadow(0 0 20px currentColor);
		}
		50% {
			filter: drop-shadow(0 0 30px currentColor);
		}
	}

	.node-label {
		pointer-events: none;
		word-wrap: break-word;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.node-type-icon {
		pointer-events: none;
	}

	.edge {
		transition: all 0.2s ease;
		opacity: 0.7;
	}

	.edge:hover {
		opacity: 1;
		stroke-width: 3;
	}

	.edge.highlighted {
		stroke-width: 3;
		stroke: var(--color-primary);
		opacity: 1;
		animation: flow 1s ease-in-out infinite;
	}

	@keyframes flow {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.edge-label {
		font-size: 11px;
		fill: var(--color-text-muted);
		background: var(--color-surface);
		padding: 2px 4px;
		text-anchor: middle;
	}

	.node-info {
		padding: 1.25rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		max-height: 200px;
		overflow-y: auto;
	}

	.node-info h3 {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: var(--color-text);
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.info-item label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.info-item input,
	.info-item select {
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.875rem;
		outline: none;
	}

	.info-item input:focus,
	.info-item select:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.info-connections {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		font-size: 0.875rem;
		padding: 0.75rem;
		background: var(--color-bg);
		border-radius: 6px;
	}

	.info-connections div {
		text-align: center;
		padding: 0.5rem;
	}

	.info-connections strong {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-bottom: 0.25rem;
	}

	@media (max-width: 1200px) {
		.diagram-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.input-panel {
			min-height: 250px;
		}

		.canvas-panel {
			min-height: 600px;
		}
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		outline: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
		color: white;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
	}

	.btn-primary:active {
		transform: translateY(0);
	}
</style>
