<script lang="ts">
	import { onMount } from 'svelte';

	interface FlowNode {
		id: string;
		label: string;
		type: 'start' | 'end' | 'process' | 'decision' | 'data';
		x: number;
		y: number;
		w: number;
		h: number;
		flows: string[];
	}

	interface FlowEdge {
		from: string;
		to: string;
		flow: string;
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

	const NODE_HEIGHT = 44;
	const COL_WIDTH = 220;
	const ROW_HEIGHT = 100;

	function nodeWidth(label: string): number {
		return Math.max(90, Math.min(200, label.length * 8 + 40));
	}

	function getDefaultDiagram(): FlowDiagram {
		return parseEnglish(englishInput);
	}

	function parseEnglish(text: string): FlowDiagram {
		const lines = text.split('\n').map(l => l.trim()).filter(l => l);
		const nodeMap = new Map<string, FlowNode>();
		const edges: FlowEdge[] = [];
		let nodeId = 0;

		const getNodeId = (label: string) => {
			const normalized = label.toLowerCase().trim();
			for (const [id, node] of nodeMap) {
				if (node.label.toLowerCase() === normalized) return id;
			}
			return null;
		};

		const createOrGetNode = (label: string, type: 'start' | 'end' | 'process' | 'decision' | 'data', flow: string) => {
			const normalized = label.toLowerCase().trim();
			for (const [id, node] of nodeMap) {
				if (node.label.toLowerCase() === normalized) {
					if (!node.flows.includes(flow)) node.flows.push(flow);
					return id;
				}
			}
			const id = `node-${nodeId++}`;
			nodeMap.set(id, { id, label, type, x: 0, y: 0, w: nodeWidth(label), h: NODE_HEIGHT, flows: [flow] });
			return id;
		};

		lines.forEach((line, lineIndex) => {
			const parts = line.split('→').map(p => p.trim()).filter(p => p);
			if (parts.length < 2) return;
			const flowId = `f${lineIndex + 1}`;

			for (let i = 0; i < parts.length; i++) {
				const label = parts[i];
				let type: 'start' | 'end' | 'process' | 'decision' | 'data' = 'process';

				if (i === 0) type = 'start';
				else if (i === parts.length - 1) type = 'end';
				else if (label.toLowerCase().includes('?')) type = 'decision';

				createOrGetNode(label, type, flowId);

				if (i < parts.length - 1) {
					const fromId = getNodeId(label);
					const toId = getNodeId(parts[i + 1]);
					if (fromId && toId) {
						edges.push({ from: fromId, to: toId, flow: flowId });
					}
				}
			}
		});

		const nodes = Array.from(nodeMap.values());
		layoutNodes(nodes, edges);

		return { nodes, edges };
	}

	function layoutNodes(nodes: FlowNode[], edges: FlowEdge[]) {
		if (nodes.length === 0) return;

		const depth = new Map<string, number>();
		const incoming = new Map<string, string[]>();
		nodes.forEach(n => incoming.set(n.id, []));
		edges.forEach(e => incoming.get(e.to)?.push(e.from));

		const resolveDepth = (id: string, visiting = new Set<string>()): number => {
			if (depth.has(id)) return depth.get(id)!;
			if (visiting.has(id)) return 0;
			visiting.add(id);
			const preds = incoming.get(id) ?? [];
			const d = preds.length === 0 ? 0 : Math.max(...preds.map(p => resolveDepth(p, visiting))) + 1;
			depth.set(id, d);
			return d;
		};

		nodes.forEach(n => resolveDepth(n.id));

		const columns = new Map<number, FlowNode[]>();
		nodes.forEach(n => {
			const d = depth.get(n.id) ?? 0;
			if (!columns.has(d)) columns.set(d, []);
			columns.get(d)!.push(n);
		});

		columns.forEach((colNodes, d) => {
			const totalHeight = (colNodes.length - 1) * ROW_HEIGHT;
			colNodes.forEach((n, i) => {
				n.x = d * COL_WIDTH;
				n.y = i * ROW_HEIGHT - totalHeight / 2;
			});
		});
	}

	function parseInput() {
		error = null;
		try {
			if (inputMode === 'english') {
				diagram = parseEnglish(englishInput);
			} else {
				const parsed = JSON.parse(jsonInput) as Partial<FlowDiagram>;
				if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
					throw new Error('Missing nodes array');
				}
				if (!parsed.edges || !Array.isArray(parsed.edges)) {
					throw new Error('Missing edges array');
				}
				const edges: FlowEdge[] = parsed.edges.map((e, i) => ({
					from: e.from,
					to: e.to,
					flow: e.flow ?? `f${i + 1}`,
					label: e.label
				}));
				const nodes: FlowNode[] = parsed.nodes.map(n => ({
					id: n.id,
					label: n.label,
					type: n.type ?? 'process',
					x: n.x ?? 0,
					y: n.y ?? 0,
					w: n.w ?? nodeWidth(n.label),
					h: n.h ?? NODE_HEIGHT,
					flows: n.flows ?? edges.filter(e => e.from === n.id || e.to === n.id).map(e => e.flow)
				}));
				const needsLayout = nodes.every(n => n.x === 0 && n.y === 0);
				if (needsLayout) layoutNodes(nodes, edges);
				diagram = { nodes, edges };
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

	function getNodeColor(type: string): { fill: string; stroke: string } {
		const colors = {
			start: { fill: '#D6F5E6', stroke: '#0E9F6E' },
			end: { fill: '#FDE0E0', stroke: '#C0392B' },
			process: { fill: '#E6F1FB', stroke: '#185FA5' },
			decision: { fill: '#FEF0D8', stroke: '#B7791F' },
			data: { fill: '#EDE4FB', stroke: '#6D3FC0' }
		};
		return colors[type as keyof typeof colors] || colors.process;
	}

	function activeFlows(): Set<string> | null {
		if (!selectedNodeId) return null;
		const node = diagram.nodes.find(n => n.id === selectedNodeId);
		return node ? new Set(node.flows) : null;
	}

	function isNodeHighlighted(nodeId: string): boolean {
		const flows = activeFlows();
		if (!flows) return true;
		const node = diagram.nodes.find(n => n.id === nodeId);
		return !!node && node.flows.some(f => flows.has(f));
	}

	function isEdgeHighlighted(edge: FlowEdge): boolean {
		const flows = activeFlows();
		if (!flows) return true;
		return flows.has(edge.flow);
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

		const x1 = from.x + from.w / 2;
		const y1 = from.y;
		const x2 = to.x - to.w / 2;
		const y2 = to.y;

		const midX = (x1 + x2) / 2;
		return {
			x1,
			y1,
			x2,
			y2,
			path: y1 === y2
				? `M ${x1} ${y1} L ${x2} ${y2}`
				: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
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
							<marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
								<path d="M1 1L7 4L1 7" fill="none" stroke="var(--color-border)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
							</marker>
							<marker id="arrowhead-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
								<path d="M1 1L7 4L1 7" fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
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
									<g class="edge-group" class:highlighted={isHighlighted} class:faded={selectedNodeId && !isHighlighted}>
										<path
											class="edge"
											d={edgePoints.path}
											fill="none"
											marker-end={isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
										/>
										{#if edge.label}
											<text
												x={(edgePoints.x1 + edgePoints.x2) / 2}
												y={(edgePoints.y1 + edgePoints.y2) / 2 - 8}
												text-anchor="middle"
												class="edge-label"
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
									<!-- Node body -->
									{#if node.type === 'decision'}
										<polygon
											class="node-body"
											points="0,{-node.h * 0.7} {node.w / 2},0 0,{node.h * 0.7} {-node.w / 2},0"
											fill={color.fill}
											stroke={color.stroke}
											stroke-width={selectedNodeId === node.id ? 3 : 1.5}
										/>
									{:else}
										<rect
											class="node-body"
											x={-node.w / 2}
											y={-node.h / 2}
											width={node.w}
											height={node.h}
											rx="8"
											fill={color.fill}
											stroke={color.stroke}
											stroke-width={selectedNodeId === node.id ? 3 : 1.5}
										/>
									{/if}

									<!-- Node text -->
									<text
										class="node-label"
										text-anchor="middle"
										y="0"
										dominant-baseline="middle"
										fill={color.stroke}
										font-weight="500"
										font-size="13"
										pointer-events="none"
									>
										{node.label}
									</text>
								</g>
							{/each}
						</g>
					</svg>

					{#if selectedNodeId}
						<button class="show-all-btn" onclick={() => (selectedNodeId = null)}>Show all</button>
					{/if}
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
		transition: opacity 0.25s ease;
	}

	.node:active {
		cursor: grabbing;
	}

	.node.faded {
		opacity: 0.2;
	}

	.node-body {
		transition: all 0.2s ease;
		filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12));
	}

	.node:hover .node-body {
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
	}

	.node.selected .node-body {
		filter: drop-shadow(0 0 14px currentColor);
	}

	.node-label {
		text-shadow: none;
	}

	.edge-group {
		transition: opacity 0.25s ease;
	}

	.edge-group.faded {
		opacity: 0.12;
	}

	.edge {
		stroke: var(--color-border);
		stroke-width: 1.5;
		stroke-dasharray: 6 6;
		animation: flowmove 0.8s linear infinite;
	}

	.edge-group.highlighted .edge {
		stroke: var(--color-primary);
		stroke-width: 2.5;
	}

	@keyframes flowmove {
		to {
			stroke-dashoffset: -16;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.edge {
			animation: none;
		}
	}

	.edge-label {
		fill: var(--color-text-muted);
	}

	.edge-group.highlighted .edge-label {
		fill: var(--color-primary);
	}

	.show-all-btn {
		position: absolute;
		bottom: 1.5rem;
		right: 1.5rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.2s;
	}

	.show-all-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
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
