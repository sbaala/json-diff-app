// API client for JSON Diff backend

import type { CompareRequest, CompareResponse, StatisticsResponse } from './types';

const API_BASE = 'https://json-diff-api-933362628329.us-east1.run.app/api/v1';

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
		throw new ApiError(response.status, error.detail || 'Request failed');
	}
	return response.json();
}

export async function compareJson(request: CompareRequest): Promise<CompareResponse> {
	const response = await fetch(`${API_BASE}/compare`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(request)
	});
	return handleResponse<CompareResponse>(response);
}

export async function getStatistics(request: CompareRequest): Promise<StatisticsResponse> {
	const response = await fetch(`${API_BASE}/statistics`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(request)
	});
	return handleResponse<StatisticsResponse>(response);
}

export async function validateJson(data: unknown): Promise<{ valid: boolean; type: string }> {
	const response = await fetch(`${API_BASE}/validate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleResponse<{ valid: boolean; type: string }>(response);
}

export async function healthCheck(): Promise<{ status: string; version: string }> {
	const response = await fetch('/health');
	return handleResponse<{ status: string; version: string }>(response);
}
