import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, compareJson, getStatistics, validateJson, healthCheck } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	describe('compareJson', () => {
		it('should send comparison request and return response', async () => {
			const mockResponse = {
				is_equal: false,
				diff_count: 2,
				added_count: 1,
				removed_count: 1,
				modified_count: 0,
				differences: [],
				left_tree: {},
				right_tree: {}
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await compareJson({
				left_json: { name: 'John' },
				right_json: { name: 'Jane' }
			});

			expect(mockFetch).toHaveBeenCalledWith('/api/v1/compare', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					left_json: { name: 'John' },
					right_json: { name: 'Jane' }
				})
			});

			expect(result).toEqual(mockResponse);
		});

		it('should throw ApiError on failure', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: 'Invalid JSON' })
			});

			await expect(
				compareJson({
					left_json: {},
					right_json: {}
				})
			).rejects.toThrow(ApiError);
		});
	});

	describe('getStatistics', () => {
		it('should return statistics for JSON documents', async () => {
			const mockStats = {
				total_keys_left: 5,
				total_keys_right: 6,
				depth_left: 2,
				depth_right: 3,
				array_count_left: 1,
				array_count_right: 2,
				object_count_left: 2,
				object_count_right: 3
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockStats)
			});

			const result = await getStatistics({
				left_json: { nested: { key: 'value' } },
				right_json: { nested: { key: 'value', extra: true } }
			});

			expect(result).toEqual(mockStats);
		});
	});

	describe('validateJson', () => {
		it('should validate JSON object', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ valid: true, type: 'object' })
			});

			const result = await validateJson({ key: 'value' });

			expect(result).toEqual({ valid: true, type: 'object' });
		});

		it('should validate JSON array', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ valid: true, type: 'array' })
			});

			const result = await validateJson([1, 2, 3]);

			expect(result).toEqual({ valid: true, type: 'array' });
		});
	});

	describe('healthCheck', () => {
		it('should return health status', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ status: 'healthy', version: '1.0.0' })
			});

			const result = await healthCheck();

			expect(result).toEqual({ status: 'healthy', version: '1.0.0' });
		});
	});

	describe('ApiError', () => {
		it('should create error with status and message', () => {
			const error = new ApiError(404, 'Not found');

			expect(error.status).toBe(404);
			expect(error.message).toBe('Not found');
			expect(error.name).toBe('ApiError');
		});
	});
});
