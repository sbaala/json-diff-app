"""Pydantic models for JSON diff API."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DiffType(str, Enum):
    """Type of difference between JSON values."""

    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    UNCHANGED = "unchanged"
    TYPE_CHANGED = "type_changed"


class DiffItem(BaseModel):
    """Represents a single difference in the JSON comparison."""

    path: str = Field(..., description="JSON path to the differing element")
    diff_type: DiffType = Field(..., description="Type of difference")
    left_value: Any | None = Field(None, description="Value in the left JSON")
    right_value: Any | None = Field(None, description="Value in the right JSON")
    left_type: str | None = Field(None, description="Type of left value")
    right_type: str | None = Field(None, description="Type of right value")


class CompareRequest(BaseModel):
    """Request model for JSON comparison."""

    left_json: dict[str, Any] | list[Any] = Field(
        ..., description="First JSON document"
    )
    right_json: dict[str, Any] | list[Any] = Field(
        ..., description="Second JSON document"
    )
    ignore_order: bool = Field(
        False, description="Whether to ignore array order in comparison"
    )
    limit: int = Field(
        500, description="Maximum number of differences to return per page (max 1000)"
    )
    offset: int = Field(
        0, description="Number of differences to skip (for pagination)"
    )
    include_trees: bool = Field(
        False, description="Whether to include annotated left_tree and right_tree"
    )
    include_values: bool = Field(
        True, description="Whether to include full left_value and right_value in differences"
    )


class CompareResponse(BaseModel):
    """Response model for JSON comparison."""

    is_equal: bool = Field(..., description="Whether the two JSONs are equal")
    diff_count: int = Field(..., description="Total number of differences")
    added_count: int = Field(..., description="Number of added items")
    removed_count: int = Field(..., description="Number of removed items")
    modified_count: int = Field(..., description="Number of modified items")
    differences: list[DiffItem] = Field(
        default_factory=list, description="List of differences (paginated)"
    )
    total_count: int = Field(
        ..., description="Total number of differences across all pages"
    )
    has_more: bool = Field(
        False, description="Whether more differences are available beyond this page"
    )
    left_tree: dict[str, Any] | list[Any] | None = Field(
        None, description="Left JSON with diff annotations (optional, include_trees=true)"
    )
    right_tree: dict[str, Any] | list[Any] | None = Field(
        None, description="Right JSON with diff annotations (optional, include_trees=true)"
    )


class StatisticsResponse(BaseModel):
    """Statistics about the comparison."""

    total_keys_left: int
    total_keys_right: int
    depth_left: int
    depth_right: int
    array_count_left: int
    array_count_right: int
    object_count_left: int
    object_count_right: int
