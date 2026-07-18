// API Types for JSON Diff

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged' | 'type_changed';

export interface DiffItem {
	path: string;
	diff_type: DiffType;
	left_value: unknown;
	right_value: unknown;
	left_type: string | null;
	right_type: string | null;
}

export interface CompareRequest {
	left_json: Record<string, unknown> | unknown[];
	right_json: Record<string, unknown> | unknown[];
	ignore_order?: boolean;
}

export interface CompareResponse {
	is_equal: boolean;
	diff_count: number;
	added_count: number;
	removed_count: number;
	modified_count: number;
	differences: DiffItem[];
	left_tree: AnnotatedNode;
	right_tree: AnnotatedNode;
}

export interface AnnotatedNode {
	value: unknown;
	path: string;
	diff_type: string;
	children?: Record<string, AnnotatedNode> | AnnotatedNode[];
}

export interface StatisticsResponse {
	total_keys_left: number;
	total_keys_right: number;
	depth_left: number;
	depth_right: number;
	array_count_left: number;
	array_count_right: number;
	object_count_left: number;
	object_count_right: number;
}

// Tool System Types
export type ToolCategory = 'json-api' | 'text-utils' | 'date-time' | 'jwt-security' | 'api-dev';

export interface ToolMetadata {
	id: string;
	name: string;
	description: string;
	category: ToolCategory;
	icon: string;
	keywords: string[];
	featured?: boolean;
}

export interface ToolResult {
	success: boolean;
	output?: string;
	error?: string;
	duration?: number;
}

export interface CategoryInfo {
	id: ToolCategory;
	name: string;
	description: string;
	icon: string;
	color: string;
}
