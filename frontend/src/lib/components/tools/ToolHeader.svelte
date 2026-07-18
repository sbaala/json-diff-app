<script lang="ts">
	import type { ToolMetadata } from '$lib/types';

	export let tool: ToolMetadata;
	export let onClose: (() => void) | undefined = undefined;

	// Map icon names to symbols
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

<div class="tool-header">
	<div class="tool-header-content">
		<div class="tool-icon">{getIconSymbol(tool.icon)}</div>
		<div class="tool-info">
			<h2 class="tool-name">{tool.name}</h2>
			<p class="tool-description">{tool.description}</p>
		</div>
	</div>
	{#if onClose}
		<button class="close-btn" on:click={onClose} title="Close tool">✕</button>
	{/if}
</div>

<style>
	.tool-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.tool-header-content {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-md);
		flex: 1;
		min-width: 0;
	}

	.tool-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.tool-info {
		flex: 1;
		min-width: 0;
	}

	.tool-name {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.tool-description {
		margin: var(--spacing-xs) 0 0 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: var(--color-hover);
		color: var(--color-text);
	}

	@media (max-width: 640px) {
		.tool-header {
			flex-direction: column;
			gap: var(--spacing-sm);
		}

		.tool-name {
			font-size: 1rem;
		}

		.tool-description {
			font-size: 0.8125rem;
		}
	}
</style>
