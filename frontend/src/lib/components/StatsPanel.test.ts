import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatsPanel from './StatsPanel.svelte';
import type { CompareResponse, StatisticsResponse } from '../types';

describe('StatsPanel', () => {
	it('should render empty state when no data provided', () => {
		render(StatsPanel, {
			props: {
				compareResult: null,
				statistics: null
			}
		});

		expect(screen.getByText(/Enter JSON data/i)).toBeTruthy();
	});

	it('should render comparison results', () => {
		const compareResult: CompareResponse = {
			is_equal: false,
			diff_count: 5,
			added_count: 2,
			removed_count: 1,
			modified_count: 2,
			differences: [],
			left_tree: { value: {}, path: '$', diff_type: 'unchanged' },
			right_tree: { value: {}, path: '$', diff_type: 'unchanged' }
		};

		render(StatsPanel, {
			props: {
				compareResult,
				statistics: null
			}
		});

		expect(screen.getByText('Different')).toBeTruthy();
		expect(screen.getByText('5')).toBeTruthy();
		expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Added and Modified count
		expect(screen.getByText('1')).toBeTruthy(); // Removed count
	});

	it('should render equal status when JSONs match', () => {
		const compareResult: CompareResponse = {
			is_equal: true,
			diff_count: 0,
			added_count: 0,
			removed_count: 0,
			modified_count: 0,
			differences: [],
			left_tree: { value: {}, path: '$', diff_type: 'unchanged' },
			right_tree: { value: {}, path: '$', diff_type: 'unchanged' }
		};

		render(StatsPanel, {
			props: {
				compareResult,
				statistics: null
			}
		});

		expect(screen.getByText('Equal')).toBeTruthy();
	});

	it('should render statistics table', () => {
		const statistics: StatisticsResponse = {
			total_keys_left: 10,
			total_keys_right: 12,
			depth_left: 3,
			depth_right: 4,
			array_count_left: 2,
			array_count_right: 3,
			object_count_left: 5,
			object_count_right: 6
		};

		render(StatsPanel, {
			props: {
				compareResult: null,
				statistics
			}
		});

		expect(screen.getByText('Total Keys')).toBeTruthy();
		expect(screen.getByText('Depth')).toBeTruthy();
		expect(screen.getByText('Objects')).toBeTruthy();
		expect(screen.getByText('Arrays')).toBeTruthy();
	});
});
