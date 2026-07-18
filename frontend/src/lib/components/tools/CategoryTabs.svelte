<script lang="ts">
	import { TOOL_CATEGORIES } from '$lib/tools/registry';
	import type { ToolCategory } from '$lib/types';

	export let activeCategory: ToolCategory = 'json-api';
	export let onChange: ((category: ToolCategory) => void) | undefined = undefined;

	const categories = Object.values(TOOL_CATEGORIES);

	function handleClick(categoryId: ToolCategory) {
		activeCategory = categoryId;
		if (onChange) {
			onChange(categoryId);
		}
	}

	function getIconSymbol(iconName: string): string {
		const iconMap: Record<string, string> = {
			code: '</›',
			type: '📝',
			calendar: '📅',
			lock: '🔒',
			zap: '⚡'
		};
		return iconMap[iconName] || '•';
	}
</script>

<div class="category-tabs">
	{#each categories as category}
		<button
			class="category-tab"
			class:active={activeCategory === category.id}
			on:click={() => handleClick(category.id)}
			title={category.description}
		>
			<span class="tab-icon">{getIconSymbol(category.icon)}</span>
			<span class="tab-name">{category.name}</span>
		</button>
	{/each}
</div>

<style>
	.category-tabs {
		display: flex;
		gap: var(--spacing-xs);
		padding: var(--spacing-md);
		border-bottom: 2px solid var(--color-border);
		background: var(--color-surface);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.category-tab {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.category-tab:hover {
		color: var(--color-text);
		background: var(--color-hover);
	}

	.category-tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		background: transparent;
	}

	.tab-icon {
		font-size: 1.125rem;
	}

	.tab-name {
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.category-tabs {
			gap: 0;
			padding: var(--spacing-sm);
		}

		.category-tab {
			padding: var(--spacing-sm);
			border-radius: 4px;
			border-bottom: none;
		}

		.category-tab.active {
			background: var(--color-primary);
			color: white;
			border-bottom: none;
		}

		.tab-name {
			display: none;
		}
	}
</style>
