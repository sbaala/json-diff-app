import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DiffList from './DiffList.svelte';
import type { DiffItem } from '../types';

describe('DiffList', () => {
	it('should render empty state when no differences', () => {
		render(DiffList, {
			props: {
				differences: []
			}
		});

		expect(screen.getByText('No differences found')).toBeTruthy();
	});

	it('should render added items', () => {
		const differences: DiffItem[] = [
			{
				path: '$.newKey',
				diff_type: 'added',
				left_value: null,
				right_value: 'new value',
				left_type: null,
				right_type: 'string'
			}
		];

		render(DiffList, {
			props: { differences }
		});

		expect(screen.getByText('Added')).toBeTruthy();
		expect(screen.getByText('$.newKey')).toBeTruthy();
	});

	it('should render removed items', () => {
		const differences: DiffItem[] = [
			{
				path: '$.oldKey',
				diff_type: 'removed',
				left_value: 'old value',
				right_value: null,
				left_type: 'string',
				right_type: null
			}
		];

		render(DiffList, {
			props: { differences }
		});

		expect(screen.getByText('Removed')).toBeTruthy();
		expect(screen.getByText('$.oldKey')).toBeTruthy();
	});

	it('should render modified items', () => {
		const differences: DiffItem[] = [
			{
				path: '$.key',
				diff_type: 'modified',
				left_value: 'old',
				right_value: 'new',
				left_type: 'string',
				right_type: 'string'
			}
		];

		render(DiffList, {
			props: { differences }
		});

		expect(screen.getByText('Modified')).toBeTruthy();
	});

	it('should render type changed items', () => {
		const differences: DiffItem[] = [
			{
				path: '$.value',
				diff_type: 'type_changed',
				left_value: '123',
				right_value: 123,
				left_type: 'string',
				right_type: 'number'
			}
		];

		render(DiffList, {
			props: { differences }
		});

		expect(screen.getByText('Type Changed')).toBeTruthy();
	});

	it('should display difference count in header', () => {
		const differences: DiffItem[] = [
			{
				path: '$.a',
				diff_type: 'added',
				left_value: null,
				right_value: 1,
				left_type: null,
				right_type: 'number'
			},
			{
				path: '$.b',
				diff_type: 'removed',
				left_value: 2,
				right_value: null,
				left_type: 'number',
				right_type: null
			}
		];

		render(DiffList, {
			props: { differences }
		});

		expect(screen.getByText('All Differences (2)')).toBeTruthy();
	});
});
