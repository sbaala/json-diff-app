<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	export let tools: ToolMetadata[] = [];
	export let selectedToolId: string | null = null;
	export let onSelectTool: ((tool: ToolMetadata) => void) | undefined = undefined;

	function handleSelectTool(tool: ToolMetadata) {
		selectedToolId = tool.id;
		if (onSelectTool) {
			onSelectTool(tool);
		}
	}

	function getIconSymbol(iconName: string): string {
		const iconMap: Record<string, string> = {
			sparkles: '✨',
			'check-circle': '✓',
			tree: '🌳',
			diff: '≠',
			'arrow-right-left': '↔',
			filter: '🔍',
			zap: '⚡',
			layers: '📚',
			'shield-check': '🛡️',
			code: '</›',
			'book-open': '📖',
			wand: '✨',
			encoding: '🔤',
			link: '🔗',
			quote: '❝',
			type: '📝',
			'arrow-left-right': '⟷',
			'bar-chart-2': '📊',
			'sort-asc': '↑',
			eraser: '🧹',
			search: '🔎',
			clock: '🕐',
			globe: '🌍',
			calculator: '🧮',
			briefcase: '💼',
			settings: '⚙️',
			info: 'ℹ️',
			calendar: '📅',
			plus: '➕',
			unlock: '🔓',
			key: '🔑',
			'share-2': '🔗',
			hash: '#',
			lock: '🔒',
			shield: '🛡️',
			square: '⬜',
			download: '⬇️',
			file: '📄',
			send: '📤',
			form: '📋'
		};
		return iconMap[iconName] || '•';
	}
</script>

<div class="tool-grid">
	{#if tools.length === 0}
		<div class="empty-state">
			<div class="empty-icon">📭</div>
			<div class="empty-message">No tools found</div>
		</div>
	{:else}
		{#each tools as tool (tool.id)}
			<button
				class="tool-card"
				class:active={selectedToolId === tool.id}
				on:click={() => handleSelectTool(tool)}
			>
				<div class="tool-card-icon">{getIconSymbol(tool.icon)}</div>
				<div class="tool-card-content">
					<h3 class="tool-card-name">{tool.name}</h3>
					<p class="tool-card-description">{tool.description}</p>
				</div>
				{#if tool.featured}
					<div class="featured-badge">⭐</div>
				{/if}
			</button>
		{/each}
	{/if}
</div>

<style>
	.tool-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-bg);
		min-height: 300px;
	}

	.empty-state {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		min-height: 300px;
		color: var(--color-text-secondary);
	}

	.empty-icon {
		font-size: 3rem;
	}

	.empty-message {
		font-size: 1rem;
	}

	.tool-card {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		position: relative;
		overflow: hidden;
	}

	.tool-card:hover {
		border-color: var(--color-primary);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.tool-card.active {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: white;
	}

	.tool-card.active .tool-card-description {
		color: rgba(255, 255, 255, 0.9);
	}

	.tool-card-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.tool-card-content {
		flex: 1;
		min-width: 0;
	}

	.tool-card-name {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: inherit;
	}

	.tool-card-description {
		margin: var(--spacing-xs) 0 0 0;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.featured-badge {
		position: absolute;
		top: var(--spacing-sm);
		right: var(--spacing-sm);
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.tool-grid {
			grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
			gap: var(--spacing-sm);
			padding: var(--spacing-sm);
		}

		.tool-card {
			padding: var(--spacing-sm);
		}
	}

	@media (max-width: 480px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
