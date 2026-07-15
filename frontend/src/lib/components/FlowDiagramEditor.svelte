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

	let inputMode = $state<'json' | 'english'>('english');
	let englishInput = $state('Request in → Validate → Manual review → Done\nRequest in → Auto-approve → Done\nRequest in → Validate → Reject → Done');
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
	let sidebarOpen = $state(true);
	let svgElement: SVGSVGElement | null = null;

	const NODE_WIDTH = 140;
	const NODE_HEIGHT = 60;

	function getDefaultDiagram(): FlowDiagram {
		return parseEnglish(englishInput);
	}

	function parseEnglish(text: string): FlowDiagram {
		const lines = text.split('\n').map(l => l.trim()).filter(l => l);
		const nodeMap = new Map<string, FlowNode>();
		const edgesSet = new Set<string>();
		let yOffset = 80;
		let nodeId = 0;

		const getNodeId = (label: string) => {
			const normalized = label.toLowerCase().trim();
			for (const [id, node] of nodeMap) {
				if (node.label.toLowerCase() === normalized) return id;
			}
			return null;
		};

		const createOrGetNode = (label: string, type: 'start' | 'end' | 'process' | 'decision' | 'data' = 'process') => {
			const normalized = label.toLowerCase().trim();
			for (const [id, node] of nodeMap) {
				if (node.label.toLowerCase() === normalized) return id;
			}
			const id = `node-${nodeId++}`;
			const xPositions = [-100, 100, 300];
			const x = xPositions[nodeMap.size % 3];
			nodeMap.set(id, { id, label, type, x, y: yOffset });
			yOffset += 120;
			return id;
		};

		for (const line of lines) {
			const parts = line.split('→').map(p => p.trim()).filter(p => p);
			if (parts.length < 2) continue;

			for (let i = 0; i < parts.length; i++) {
				const label = parts[i];
				let type: 'start' | 'end' | 'process' | 'decision' | 'data' = 'process';

				if (i === 0) type = 'start';
				else if (i === parts.length - 1) type = 'end';
				else if (label.toLowerCase().includes('?')) type = 'decision';

				createOrGetNode(label, type);

				if (i < parts.length - 1) {
					const fromId = getNodeId(label);
					const toId = getNodeId(parts[i + 1]);
					if (fromId && toId) {
						edgesSet.add(`${fromId}→${toId}`);
					}
				}
			}
		}

		const edges = Array.from(edgesSet).map(edge => {
			const [from, to] = edge.split('→');
			return { from, to };
		});

		return {
			nodes: Array.from(nodeMap.values()),
			edges
		};
	}

	function parseInput() {
		error = null;
		try {
			if (inputMode === 'english') {
				diagram = parseEnglish(englishInput);
			} else {
				const parsed = JSON.parse(jsonInput) as FlowDiagram;
				if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
					throw new Error('Missing nodes array');
				}
				if (!parsed.edges || !Array.isArray(parsed.edges)) {
					throw new Error('Missing edges array');
				}
				diagram = parsed;
			}
			selectedNodeId = null;
			centerGraph();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid input';
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

	function getConnectedNodeIds(nodeId: string): Set<string> {
		const connected = new Set<string>([nodeId]);
		const toVisit = [nodeId];

		while (toVisit.length > 0) {
			const current = toVisit.pop()!;
			for (const edge of diagram.edges) {
				if (edge.from === current && !connected.has(edge.to)) {
					connected.add(edge.to);
					toVisit.push(edge.to);
				}
				if (edge.to === current && !connected.has(edge.from)) {
					connected.add(edge.from);
					toVisit.push(edge.from);
				}
			}
		}
		return connected;
	}

	function isNodeHighlighted(nodeId: string): boolean {
		if (!selectedNodeId) return true;
		const connected = getConnectedNodeIds(selectedNodeId);
		return connected.has(nodeId);
	}

	function isEdgeHighlighted(edge: FlowEdge): boolean {
		if (!selectedNodeId) return true;
		const connected = getConnectedNodeIds(selectedNodeId);
		return connected.has(edge.from) && connected.has(edge.to);
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

<div class="app-container">
	<header class="app-header">
		<div class="header-left">
			<button class="sidebar-toggle" onclick={() => (sidebarOpen = !sidebarOpen)} title={sidebarOpen ? 'Hide panel' : 'Show panel'}>
				{#if sidebarOpen}
					◀
				{:else}
					▶
				{/if}
			</button>
			<div class="header-title">
				<h1>Flow Diagram Builder</h1>
				<p>Design workflows with drag-and-drop</p>
			</div>
		</div>
		<div class="header-controls">
			<span class="zoom-level">{Math.round(scale * 100)}%</span>
			<button class="icon-btn" onclick={resetView} title="Reset zoom & pan">↺</button>
			<button class="icon-btn" onclick={exportDiagram} title="Export as JSON">⬇</button>
		</div>
	</header>

	<div class="main-content">
		{#if sidebarOpen}
			<aside class="sidebar">
				<div class="sidebar-header">
					<h2>Input</h2>
					<div class="mode-tabs">
						<button class="tab" class:active={inputMode === 'english'} onclick={() => (inputMode = 'english')}>English</button>
						<button class="tab" class:active={inputMode === 'json'} onclick={() => (inputMode = 'json')}>JSON</button>
					</div>
				</div>

				{#if inputMode === 'english'}
					<div class="input-section">
						<label>Describe your flows (one per line):</label>
						<textarea
							class="text-input"
							bind:value={englishInput}
							placeholder="Request in → Validate → Done&#10;Request in → Reject → Done"
							spellcheck="false"
						></textarea>
						<div class="help-text">
							Use → to connect steps. First step is start (green), last is end (red), others are process (blue).
						</div>
					</div>
				{:else}
					<div class="input-section">
						<label>Paste JSON diagram:</label>
						<textarea
							class="text-input"
							bind:value={jsonInput}
							placeholder="Paste flow diagram JSON..."
							spellcheck="false"
						></textarea>
					</div>
				{/if}

				{#if error}
					<div class="error-box">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4M12 16h.01" />
						</svg>
						{error}
					</div>
				{/if}

				<button class="btn btn-primary" onclick={parseInput}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 12h14M12 5v14" />
					</svg>
					Generate
				</button>

				{#if selectedNodeId}
					{@const selectedNode = diagram.nodes.find(n => n.id === selectedNodeId)}
					{#if selectedNode}
						<div class="node-editor">
							<h3>Node Details</h3>
							<div class="form-group">
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
							<div class="form-group">
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
							<div class="info-box">
								<div>↓ In: {diagram.edges.filter(e => e.to === selectedNodeId).length}</div>
								<div>↑ Out: {diagram.edges.filter(e => e.from === selectedNodeId).length}</div>
							</div>
						</div>
					{/if}
				{/if}
			</aside>
		{/if}

		<div class="canvas-area">
			{#if diagram.nodes.length === 0}
				<div class="empty-state">
					<svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
						<circle cx="18" cy="5" r="3" />
						<circle cx="6" cy="12" r="3" />
						<circle cx="18" cy="19" r="3" />
						<path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
					</svg>
					<h2>No Diagram Yet</h2>
					<p>Write a flow or paste JSON to get started</p>
				</div>
			{:else}
				<div class="canvas-container">
					<svg
						bind:this={svgElement}
						class="canvas-svg"
						onwheel={handleWheel}
						onmousedown={handleSvgMouseDown}
						style="cursor: {isDragging ? 'grabbing' : 'grab'}"
					>
						<defs>
							<marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
								<polygon points="0 0, 10 3, 0 6" fill="var(--arrow-color, #3b82f6)" />
							</marker>
							<filter id="glow">
								<feGaussianBlur stdDeviation="3" result="coloredBlur" />
								<feMerge>
									<feMergeNode in="coloredBlur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
							<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
								<path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border)" stroke-width="0.5" />
							</pattern>
						</defs>

						<rect width="5000" height="5000" fill="url(#grid)" />

						<g transform="translate({panX}, {panY}) scale({scale})">
							<!-- Edges -->
							{#each diagram.edges as edge}
								{@const edgePoints = getEdgePoints(edge.from, edge.to)}
								{@const isHighlighted = isEdgeHighlighted(edge)}
								{#if edgePoints}
									<g class="edge-group" class:faded={selectedNodeId && !isHighlighted}>
										<path
											class="edge"
											d={edgePoints.path}
											stroke={isHighlighted ? 'var(--color-primary)' : 'var(--color-border)'}
											stroke-width={isHighlighted ? 4 : 2}
											fill="none"
											marker-end="url(#arrowhead)"
											style="--arrow-color: {isHighlighted ? 'var(--color-primary)' : 'var(--color-border)'}"
										/>
										{#if edge.label}
											<text
												x={(edgePoints.x1 + edgePoints.x2) / 2}
												y={(edgePoints.y1 + edgePoints.y2) / 2 - 8}
												text-anchor="middle"
												class="edge-label"
												fill={isHighlighted ? 'var(--color-primary)' : 'var(--color-text-muted)'}
												font-size="12"
												font-weight="600"
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
								{@const isHighlighted = isNodeHighlighted(node.id)}
								<g
									class="node"
									class:selected={selectedNodeId === node.id}
									class:faded={selectedNodeId && !isHighlighted}
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
										fill={isHighlighted ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)'}
										opacity={isHighlighted ? 1 : 0.2}
									/>

									<!-- Node body -->
									{#if node.type === 'decision'}
										<polygon
											class="node-body"
											points="0,-30 70,0 0,30 -70,0"
											fill={color.fill}
											stroke={color.stroke}
											stroke-width={selectedNodeId === node.id ? 4 : 2}
											opacity={isHighlighted ? 1 : 0.25}
										/>
									{:else}
										<rect
											class="node-body"
											x={-NODE_WIDTH / 2}
											y={-NODE_HEIGHT / 2}
											width={NODE_WIDTH}
											height={NODE_HEIGHT}
											rx="8"
											fill={color.fill}
											stroke={color.stroke}
											stroke-width={selectedNodeId === node.id ? 4 : 2}
											opacity={isHighlighted ? 1 : 0.25}
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
										opacity={isHighlighted ? 1 : 0.3}
									>
										{node.label}
									</text>

									<!-- Node type icon -->
									<text
										class="node-type-icon"
										text-anchor="middle"
										y={-NODE_HEIGHT / 2 + 12}
										fill={color.stroke}
										font-size="16"
										pointer-events="none"
										opacity={isHighlighted ? 1 : 0.3}
									>
										{color.icon}
									</text>
								</g>
							{/each}
						</g>
					</svg>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(body) {
		overflow: hidden;
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
		background: var(--color-bg);
	}

	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		min-width: 0;
	}

	.sidebar-toggle {
		background: none;
		border: none;
		font-size: 1.25rem;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}

	.sidebar-toggle:hover {
		color: var(--color-primary);
	}

	.header-title h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-text);
	}

	.header-title p {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin: 0.25rem 0 0 0;
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.zoom-level {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border-radius: 6px;
		min-width: 50px;
		text-align: center;
	}

	.icon-btn {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.main-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		width: 350px;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		overflow-y: auto;
		flex-shrink: 0;
	}

	.sidebar-header {
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.sidebar-header h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--color-text);
	}

	.mode-tabs {
		display: flex;
		gap: 0.5rem;
	}

	.tab {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-muted);
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab.active {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		flex: 1;
		overflow: hidden;
	}

	.input-section label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.text-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		resize: none;
		outline: none;
		line-height: 1.5;
	}

	.text-input:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.help-text {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	.error-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 6px;
		color: #ef4444;
		font-size: 0.875rem;
		margin: 0 1rem;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		outline: none;
		margin: 0 1rem;
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

	.node-editor {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
		margin-top: auto;
	}

	.node-editor h3 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--color-text);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-bottom: 0.75rem;
	}

	.form-group label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.form-group input,
	.form-group select {
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		border-radius: 4px;
		font-size: 0.875rem;
		outline: none;
	}

	.form-group input:focus,
	.form-group select:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.info-box {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--color-bg);
		border-radius: 6px;
		font-size: 0.875rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.canvas-area {
		flex: 1;
		overflow: hidden;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
	}

	.empty-state {
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
		stroke-width: 0.5;
	}

	.empty-state h2 {
		font-size: 1.5rem;
		color: var(--color-text);
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		font-size: 1rem;
		margin: 0;
	}

	.canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.canvas-svg {
		width: 100%;
		height: 100%;
		background: var(--color-bg);
	}

	.node {
		cursor: grab;
		user-select: none;
		transition: all 0.15s ease;
	}

	.node:active {
		cursor: grabbing;
	}

	.node.faded {
		opacity: 0.3;
	}

	.node-body {
		transition: all 0.2s ease;
		filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
	}

	.node:hover .node-body:not(.faded) {
		filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.3));
		stroke-width: 3 !important;
	}

	.node.selected .node-body {
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

	.edge {
		transition: all 0.2s ease;
	}

	.edge-group.faded .edge {
		opacity: 0.15 !important;
	}

	.edge-label {
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	@media (max-width: 900px) {
		.sidebar {
			width: 280px;
		}

		.header-title h1 {
			font-size: 1.25rem;
		}
	}
</style>
