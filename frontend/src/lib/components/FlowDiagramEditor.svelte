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

	// A tab bundles one independent diagram together with its input text and
	// view state, so switching tabs restores exactly what the user was editing.
	interface FlowTab {
		id: number;
		name: string;
		inputMode: 'json' | 'english';
		englishInput: string;
		jsonInput: string;
		diagram: FlowDiagram;
		error: string | null;
		selectedNodeId: string | null;
		scale: number;
		panX: number;
		panY: number;
	}

	const NODE_HEIGHT = 44;
	const COL_WIDTH = 220;
	const ROW_HEIGHT = 100;

	const DEFAULT_ENGLISH =
		'Request in - Validate - Manual review - Done\nRequest in - Auto-approve - Done\nRequest in - Validate - Reject - Done';

	function nodeWidth(label: string): number {
		return Math.max(90, Math.min(200, label.length * 8 + 40));
	}

	function parseEnglish(text: string): FlowDiagram {
		const lines = text.split('\n').map(l => l.trim()).filter(l => l);
		const nodeMap = new Map<string, FlowNode>();
		const edges: FlowEdge[] = [];
		let nodeId = 0;

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
			// Accept arrows (→, ->, —>, ➔, ➜) or a spaced hyphen ( - ) as step
			// separators. The spaced-hyphen rule preserves hyphenated words
			// like "Auto-approve" and "Request-in".
			const parts = line
				.split(/\s*(?:->|—>|➔|➜|→|>)\s*|\s+-\s+/)
				.map(p => p.trim())
				.filter(p => p);
			if (parts.length < 2) return;
			const flowId = `f${lineIndex + 1}`;

			// Create every node on this line first, collecting ids in order, so
			// that edges can reference targets that appear later in the line.
			const ids = parts.map((label, i) => {
				let type: 'start' | 'end' | 'process' | 'decision' | 'data' = 'process';
				if (i === 0) type = 'start';
				else if (i === parts.length - 1) type = 'end';
				else if (label.includes('?')) type = 'decision';
				return createOrGetNode(label, type, flowId);
			});

			for (let i = 0; i < ids.length - 1; i++) {
				edges.push({ from: ids[i], to: ids[i + 1], flow: flowId });
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

	function createTab(id: number, name?: string): FlowTab {
		const diagram = parseEnglish(DEFAULT_ENGLISH);
		return {
			id,
			name: name ?? `Flow ${id}`,
			inputMode: 'english',
			englishInput: DEFAULT_ENGLISH,
			jsonInput: JSON.stringify(diagram, null, 2),
			diagram,
			error: null,
			selectedNodeId: null,
			scale: 1,
			panX: 0,
			panY: 0
		};
	}

	let tabIdCounter = $state(1);
	let tabs = $state<FlowTab[]>([createTab(1, 'Flow 1')]);
	let activeTabId = $state(1);
	let activeTab = $derived(tabs.find(t => t.id === activeTabId) ?? tabs[0]);

	// Transient pointer-interaction state — only meaningful for the tab the user
	// is currently pointing at, so it lives outside the per-tab model.
	let draggedNodeId = $state<string | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let sidebarOpen = $state(true);
	let inputMaximized = $state(false);
	let canvasMaximized = $state(false);
	let svgElement: SVGSVGElement | null = null;

	function parseInput() {
		const tab = activeTab;
		tab.error = null;
		try {
			if (tab.inputMode === 'english') {
				tab.diagram = parseEnglish(tab.englishInput);
			} else {
				const parsed = JSON.parse(tab.jsonInput) as Partial<FlowDiagram>;
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
				tab.diagram = { nodes, edges };
			}
			tab.selectedNodeId = null;
			centerGraph();
		} catch (e) {
			tab.error = e instanceof Error ? e.message : 'Invalid input';
		}
	}

	function centerGraph() {
		const tab = activeTab;
		if (!svgElement || tab.diagram.nodes.length === 0) return;
		const bbox = svgElement.getBoundingClientRect();
		const allX = tab.diagram.nodes.map(n => n.x);
		const allY = tab.diagram.nodes.map(n => n.y);
		const minX = Math.min(...allX);
		const maxX = Math.max(...allX);
		const minY = Math.min(...allY);
		const maxY = Math.max(...allY);

		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;
		tab.panX = bbox.width / 2 - centerX;
		tab.panY = bbox.height / 2 - centerY;
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
		if (!activeTab.selectedNodeId) return null;
		const node = activeTab.diagram.nodes.find(n => n.id === activeTab.selectedNodeId);
		return node ? new Set(node.flows) : null;
	}

	function isNodeHighlighted(nodeId: string): boolean {
		const flows = activeFlows();
		if (!flows) return true;
		const node = activeTab.diagram.nodes.find(n => n.id === nodeId);
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
		const node = activeTab.diagram.nodes.find(n => n.id === nodeId);
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
			dragStart = { x: e.clientX - activeTab.panX, y: e.clientY - activeTab.panY };
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (draggedNodeId) {
			const node = activeTab.diagram.nodes.find(n => n.id === draggedNodeId);
			if (node) {
				node.x = e.clientX - dragOffset.x;
				node.y = e.clientY - dragOffset.y;
			}
		} else if (isDragging) {
			activeTab.panX = e.clientX - dragStart.x;
			activeTab.panY = e.clientY - dragStart.y;
		}
	}

	function handleMouseUp() {
		draggedNodeId = null;
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		activeTab.scale = Math.max(0.3, Math.min(3, activeTab.scale * delta));
	}

	function selectNode(nodeId: string) {
		activeTab.selectedNodeId = activeTab.selectedNodeId === nodeId ? null : nodeId;
	}

	function resetView() {
		activeTab.scale = 1;
		centerGraph();
	}

	function updateJsonFromDiagram() {
		activeTab.jsonInput = JSON.stringify(activeTab.diagram, null, 2);
	}

	function getEdgePoints(fromId: string, toId: string) {
		const from = activeTab.diagram.nodes.find(n => n.id === fromId);
		const to = activeTab.diagram.nodes.find(n => n.id === toId);
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

	function fileBaseName(): string {
		return activeTab.name.replace(/\s+/g, '-').toLowerCase() || 'flow-diagram';
	}

	function downloadFile(href: string, filename: string) {
		const element = document.createElement('a');
		element.setAttribute('href', href);
		element.setAttribute('download', filename);
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}

	function exportDiagram() {
		downloadFile(
			'data:text/json;charset=utf-8,' + encodeURIComponent(activeTab.jsonInput),
			`${fileBaseName()}.json`
		);
	}

	// Build a standalone, self-contained SVG of just the diagram (no pan/zoom,
	// tightly cropped to the nodes) and rasterize it to a PNG the browser can
	// download. Scoped component styles and CSS vars are inlined so the
	// exported image looks identical to what's on screen.
	function exportImage() {
		if (!svgElement || activeTab.diagram.nodes.length === 0) return;

		const nodes = activeTab.diagram.nodes;
		const pad = 48;
		const minX = Math.min(...nodes.map(n => n.x - n.w / 2)) - pad;
		const maxX = Math.max(...nodes.map(n => n.x + n.w / 2)) + pad;
		const minY = Math.min(...nodes.map(n => n.y - n.h * 0.7)) - pad;
		const maxY = Math.max(...nodes.map(n => n.y + n.h * 0.7)) + pad;
		const width = Math.max(1, maxX - minX);
		const height = Math.max(1, maxY - minY);

		// Resolve theme colours so the standalone SVG doesn't rely on var().
		const cs = getComputedStyle(svgElement);
		const border = cs.getPropertyValue('--color-border').trim() || '#334155';
		const primary = cs.getPropertyValue('--color-primary').trim() || '#3b82f6';
		const muted = cs.getPropertyValue('--color-text-muted').trim() || '#94a3b8';
		const bg = cs.getPropertyValue('--color-bg').trim() || '#0f172a';

		const clone = svgElement.cloneNode(true) as SVGSVGElement;
		clone.setAttribute('width', String(width));
		clone.setAttribute('height', String(height));
		clone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

		// Drop the infinite grid and neutralise the pan/zoom transform.
		clone.querySelector('#canvas-grid')?.remove();
		const root = clone.querySelector('#export-root') as SVGGElement | null;
		if (root) root.removeAttribute('transform');

		// Solid background rect covering the crop.
		const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		bgRect.setAttribute('x', String(minX));
		bgRect.setAttribute('y', String(minY));
		bgRect.setAttribute('width', String(width));
		bgRect.setAttribute('height', String(height));
		bgRect.setAttribute('fill', bg);
		clone.insertBefore(bgRect, clone.firstChild);

		// Inline the edge/label styles the scoped CSS normally supplies.
		const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
		styleEl.textContent =
			`.edge{stroke:${border};stroke-width:1.5;fill:none;stroke-dasharray:6 6;}` +
			`.edge-group.highlighted .edge{stroke:${primary};stroke-width:2.5;}` +
			`.edge-label{fill:${muted};}` +
			`.edge-group.highlighted .edge-label{fill:${primary};}`;
		clone.insertBefore(styleEl, clone.firstChild);

		let svgStr = new XMLSerializer().serializeToString(clone);
		// Any remaining var() refs (e.g. marker strokes) → concrete colours.
		svgStr = svgStr
			.replaceAll('var(--color-border)', border)
			.replaceAll('var(--color-primary)', primary)
			.replaceAll('var(--color-text-muted)', muted)
			.replaceAll('var(--color-bg)', bg);

		const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
		const img = new Image();
		img.onload = () => {
			const dpr = 2; // render at 2x for a crisp image
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.scale(dpr, dpr);
			ctx.drawImage(img, 0, 0);
			canvas.toBlob(blob => {
				if (!blob) return;
				const url = URL.createObjectURL(blob);
				downloadFile(url, `${fileBaseName()}.png`);
				URL.revokeObjectURL(url);
			}, 'image/png');
		};
		img.src = svg64;
	}

	function toggleCanvasMaximize() {
		canvasMaximized = !canvasMaximized;
		requestAnimationFrame(() => centerGraph());
	}

	// --- Tab management ---------------------------------------------------
	function addTab() {
		tabIdCounter += 1;
		const tab = createTab(tabIdCounter);
		tabs = [...tabs, tab];
		activeTabId = tab.id;
		requestAnimationFrame(() => centerGraph());
	}

	function closeTab(id: number) {
		if (tabs.length === 1) return; // always keep at least one diagram
		const idx = tabs.findIndex(t => t.id === id);
		tabs = tabs.filter(t => t.id !== id);
		if (activeTabId === id) {
			activeTabId = tabs[Math.min(idx, tabs.length - 1)].id;
			requestAnimationFrame(() => centerGraph());
		}
	}

	function switchTab(id: number) {
		if (id === activeTabId) return;
		activeTabId = id;
		requestAnimationFrame(() => centerGraph());
	}

	function renameTab(id: number) {
		const tab = tabs.find(t => t.id === id);
		if (!tab) return;
		const newName = prompt('Diagram name:', tab.name);
		if (newName && newName.trim()) {
			tab.name = newName.trim();
		}
	}

	onMount(() => {
		centerGraph();
	});
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="app-container flow-root">
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
			<span class="zoom-level">{Math.round(activeTab.scale * 100)}%</span>
			<button class="icon-btn" onclick={resetView} title="Reset zoom & pan">↺</button>
			<button class="icon-btn" onclick={toggleCanvasMaximize} title="Maximize diagram">⛶</button>
			<button class="icon-btn" onclick={exportImage} title="Export as PNG image">🖼</button>
			<button class="icon-btn" onclick={exportDiagram} title="Export as JSON">⬇</button>
		</div>
	</header>

	<!-- Diagram tabs: each holds an independent flow you can switch between. -->
	<div class="tab-bar" role="tablist">
		{#each tabs as tab (tab.id)}
			<div
				class="diagram-tab"
				class:active={tab.id === activeTabId}
				onclick={() => switchTab(tab.id)}
				ondblclick={() => renameTab(tab.id)}
				role="tab"
				tabindex="0"
				aria-selected={tab.id === activeTabId}
				title="Double-click to rename"
			>
				<span class="diagram-tab-name">{tab.name}</span>
				{#if tabs.length > 1}
					<button
						type="button"
						class="diagram-tab-close"
						onclick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
						title="Close diagram"
					>✕</button>
				{/if}
			</div>
		{/each}
		<button type="button" class="diagram-tab-add" onclick={addTab} title="New diagram">＋</button>
	</div>

	<div class="main-content">
		{#if sidebarOpen}
			<aside class="sidebar">
				<div class="sidebar-header">
					<div class="sidebar-header-row">
						<h2>Input</h2>
						<button
							type="button"
							class="maximize-btn"
							onclick={() => (inputMaximized = true)}
							title="Maximize input editor"
						>⤢ Expand</button>
					</div>
					<div class="mode-tabs">
						<button class="tab" class:active={activeTab.inputMode === 'english'} onclick={() => (activeTab.inputMode = 'english')}>English</button>
						<button class="tab" class:active={activeTab.inputMode === 'json'} onclick={() => (activeTab.inputMode = 'json')}>JSON</button>
					</div>
				</div>

				{#if activeTab.inputMode === 'english'}
					<div class="input-section">
						<label for="flow-english-input">Describe your flows (one per line):</label>
						<textarea
							id="flow-english-input"
							class="text-input"
							bind:value={activeTab.englishInput}
							placeholder="Request in - Validate - Manual review - Done&#10;Request in - Auto-approve - Done&#10;Request in - Reject - Done"
							spellcheck="false"
						></textarea>
						<div class="help-text">
							Connect steps with <strong>-&gt;</strong>, <strong>→</strong>, or a spaced <strong>-</strong> (one flow per line). First step is start (green), last is end (red), others are process (blue). Add a <strong>?</strong> to a label to make it a decision diamond.
						</div>
					</div>
				{:else}
					<div class="input-section">
						<label for="flow-json-input">Paste JSON diagram:</label>
						<textarea
							id="flow-json-input"
							class="text-input"
							bind:value={activeTab.jsonInput}
							placeholder="Paste flow diagram JSON..."
							spellcheck="false"
						></textarea>
					</div>
				{/if}

				{#if activeTab.error}
					<div class="error-box">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4M12 16h.01" />
						</svg>
						{activeTab.error}
					</div>
				{/if}

				<button class="btn btn-primary" onclick={parseInput}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 12h14M12 5v14" />
					</svg>
					Generate
				</button>

				{#if activeTab.selectedNodeId}
					{@const selectedNode = activeTab.diagram.nodes.find(n => n.id === activeTab.selectedNodeId)}
					{#if selectedNode}
						<div class="node-editor">
							<h3>Node Details</h3>
							<div class="form-group">
								<label for="flow-node-label">Label</label>
								<input
									id="flow-node-label"
									type="text"
									value={selectedNode.label}
									onchange={(e) => {
										selectedNode.label = e.currentTarget.value;
										updateJsonFromDiagram();
									}}
								/>
							</div>
							<div class="form-group">
								<label for="flow-node-type">Type</label>
								<select
									id="flow-node-type"
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
								<div>↓ In: {activeTab.diagram.edges.filter(e => e.to === activeTab.selectedNodeId).length}</div>
								<div>↑ Out: {activeTab.diagram.edges.filter(e => e.from === activeTab.selectedNodeId).length}</div>
							</div>
						</div>
					{/if}
				{/if}
			</aside>
		{/if}

		<div class="canvas-area" class:maximized={canvasMaximized}>
			{#if canvasMaximized}
				<div class="canvas-toolbar">
					<span class="zoom-level">{Math.round(activeTab.scale * 100)}%</span>
					<button class="icon-btn" onclick={resetView} title="Reset zoom & pan">↺</button>
					<button class="icon-btn" onclick={exportImage} title="Export as PNG image">🖼</button>
					<button class="icon-btn" onclick={exportDiagram} title="Export as JSON">⬇</button>
					<button class="icon-btn minimize-btn" onclick={toggleCanvasMaximize} title="Minimize diagram">⤡ Minimize</button>
				</div>
			{/if}
			{#if activeTab.diagram.nodes.length === 0}
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

						<rect id="canvas-grid" width="5000" height="5000" fill="url(#grid)" />

						<g id="export-root" transform="translate({activeTab.panX}, {activeTab.panY}) scale({activeTab.scale})">
							<!-- Edges -->
							{#each activeTab.diagram.edges as edge}
								{@const edgePoints = getEdgePoints(edge.from, edge.to)}
								{@const isHighlighted = isEdgeHighlighted(edge)}
								{#if edgePoints}
									<g class="edge-group" class:highlighted={isHighlighted} class:faded={activeTab.selectedNodeId && !isHighlighted}>
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
							{#each activeTab.diagram.nodes as node (node.id)}
								{@const color = getNodeColor(node.type)}
								{@const isHighlighted = isNodeHighlighted(node.id)}
								<g
									class="node"
									class:selected={activeTab.selectedNodeId === node.id}
									class:faded={activeTab.selectedNodeId && !isHighlighted}
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
											stroke-width={activeTab.selectedNodeId === node.id ? 3 : 1.5}
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
											stroke-width={activeTab.selectedNodeId === node.id ? 3 : 1.5}
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

					{#if activeTab.selectedNodeId}
						<button class="show-all-btn" onclick={() => (activeTab.selectedNodeId = null)}>Show all</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Maximized input editor: a full-canvas overlay for comfortably writing
	     or pasting large flows, then minimizing back to the sidebar. -->
	{#if inputMaximized}
		<div class="input-overlay" role="dialog" aria-modal="true" aria-label="Maximized input editor">
			<div class="input-overlay-header">
				<div class="input-overlay-title">
					<h2>Edit input — {activeTab.name}</h2>
					<div class="mode-tabs">
						<button class="tab" class:active={activeTab.inputMode === 'english'} onclick={() => (activeTab.inputMode = 'english')}>English</button>
						<button class="tab" class:active={activeTab.inputMode === 'json'} onclick={() => (activeTab.inputMode = 'json')}>JSON</button>
					</div>
				</div>
				<div class="overlay-actions">
					<button class="btn btn-primary overlay-btn" onclick={() => { parseInput(); inputMaximized = false; }}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14M12 5v14" />
						</svg>
						Generate &amp; Close
					</button>
					<button class="icon-btn" onclick={() => (inputMaximized = false)} title="Minimize">⤡ Minimize</button>
				</div>
			</div>

			{#if activeTab.inputMode === 'english'}
				<textarea
					class="overlay-textarea"
					bind:value={activeTab.englishInput}
					placeholder="Request in - Validate - Manual review - Done&#10;Request in - Auto-approve - Done&#10;Request in - Reject - Done"
					spellcheck="false"
				></textarea>
			{:else}
				<textarea
					class="overlay-textarea"
					bind:value={activeTab.jsonInput}
					placeholder="Paste flow diagram JSON..."
					spellcheck="false"
				></textarea>
			{/if}

			{#if activeTab.error}
				<div class="error-box overlay-error">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4M12 16h.01" />
					</svg>
					{activeTab.error}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Fill the space the site layout gives us (between the sticky header and
	   footer) instead of forcing a full 100vh, which pushed the panel and
	   canvas off-screen. The page route neutralises .main padding. */
	.app-container {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		background: var(--color-bg);
		position: relative;
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
		font-family: 'Georgia', 'Times New Roman', serif;
		font-size: 1.55rem;
		font-weight: 700;
		font-style: italic;
		letter-spacing: -0.01em;
		margin: 0;
		background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
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
		white-space: nowrap;
	}

	.icon-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	/* --- Diagram tab bar ------------------------------------------------ */
	.tab-bar {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
		overflow-x: auto;
	}

	.diagram-tab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 6px 6px 0 0;
		background: var(--color-bg);
		color: var(--color-text-muted);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
		user-select: none;
	}

	.diagram-tab:hover {
		color: var(--color-text);
		border-color: var(--color-primary);
	}

	.diagram-tab.active {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.diagram-tab-name {
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.diagram-tab-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		font-size: 0.7rem;
		line-height: 1;
		cursor: pointer;
		opacity: 0.7;
		transition: all 0.15s;
	}

	.diagram-tab-close:hover {
		background: rgba(0, 0, 0, 0.2);
		opacity: 1;
	}

	.diagram-tab-add {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border: 1px dashed var(--color-border);
		border-radius: 6px;
		background: var(--color-bg);
		color: var(--color-text-muted);
		font-size: 1.1rem;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.15s;
	}

	.diagram-tab-add:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.main-content {
		display: flex;
		flex: 1;
		overflow: hidden;
		position: relative;
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

	.sidebar-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.sidebar-header h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}

	.maximize-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg);
		color: var(--color-text-muted);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.maximize-btn:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
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

	/* Maximize just the diagram: cover the whole viewport so the canvas gets
	   all the space, with a floating toolbar for zoom/export/exit. */
	.canvas-area.maximized {
		position: fixed;
		inset: 0;
		z-index: 1000;
	}

	.canvas-toolbar {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
	}

	.minimize-btn {
		font-weight: 600;
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.minimize-btn:hover {
		filter: brightness(1.1);
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

	/* --- Maximized input overlay ---------------------------------------- */
	.input-overlay {
		position: absolute;
		inset: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 1.5rem 1.5rem;
		background: var(--color-surface);
	}

	.input-overlay-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.input-overlay-title {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.input-overlay-title h2 {
		font-size: 1.05rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}

	.input-overlay-title .mode-tabs {
		width: 200px;
	}

	.overlay-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.overlay-btn {
		margin: 0;
	}

	.overlay-textarea {
		flex: 1;
		width: 100%;
		padding: 1rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		border-radius: 8px;
		font-family: var(--font-mono);
		font-size: 0.95rem;
		line-height: 1.6;
		resize: none;
		outline: none;
	}

	.overlay-textarea:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.overlay-error {
		margin: 0;
	}

	@media (max-width: 900px) {
		.sidebar {
			width: 280px;
		}

		.header-title h1 {
			font-size: 1.25rem;
		}
	}

	/* Short laptop screens (e.g. a 13" MacBook ~800px tall): compact the
	   builder's own header so the canvas keeps as much vertical room as
	   possible. The subtitle is decorative, so it goes first. */
	@media (max-height: 820px) {
		.app-header {
			padding: 0.5rem 1.5rem;
		}

		.header-title h1 {
			font-size: 1.3rem;
		}

		.header-title p {
			display: none;
		}
	}

	/* On phones the panel overlays the canvas (toggled by the ◀/▶ button)
	   instead of stealing horizontal space and crushing the diagram. */
	@media (max-width: 640px) {
		.sidebar {
			position: absolute;
			top: 0;
			left: 0;
			bottom: 0;
			z-index: 20;
			width: min(88%, 340px);
			box-shadow: 6px 0 24px rgba(0, 0, 0, 0.28);
		}

		.header-title p {
			display: none;
		}
	}
</style>
