"""Router for JSON diff operations."""

from typing import Any

from fastapi import APIRouter, Body, HTTPException

from app.models import CompareRequest, CompareResponse, DiffType, StatisticsResponse
from app.services import JsonDiffService, annotate_tree, get_json_statistics

router = APIRouter()


@router.post("/compare", response_model=CompareResponse)
async def compare_json(request: CompareRequest) -> CompareResponse:
    """Compare two JSON documents and return the differences.

    Args:
        request: The comparison request containing left and right JSON.

    Returns:
        CompareResponse with detailed differences.
    """
    try:
        service = JsonDiffService(ignore_order=request.ignore_order)
        differences = service.compare(request.left_json, request.right_json)

        # Count differences by type
        added_count = sum(1 for d in differences if d.diff_type == DiffType.ADDED)
        removed_count = sum(1 for d in differences if d.diff_type == DiffType.REMOVED)
        modified_count = sum(
            1
            for d in differences
            if d.diff_type in (DiffType.MODIFIED, DiffType.TYPE_CHANGED)
        )

        # Create annotated trees
        left_tree = annotate_tree(request.left_json, differences, "left")
        right_tree = annotate_tree(request.right_json, differences, "right")

        return CompareResponse(
            is_equal=len(differences) == 0,
            diff_count=len(differences),
            added_count=added_count,
            removed_count=removed_count,
            modified_count=modified_count,
            differences=differences,
            left_tree=left_tree,
            right_tree=right_tree,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error comparing JSON: {str(e)}")


@router.post("/statistics", response_model=StatisticsResponse)
async def get_statistics(request: CompareRequest) -> StatisticsResponse:
    """Get statistics for both JSON documents.

    Args:
        request: The comparison request containing left and right JSON.

    Returns:
        Statistics about both JSON documents.
    """
    try:
        left_stats = get_json_statistics(request.left_json)
        right_stats = get_json_statistics(request.right_json)

        return StatisticsResponse(
            total_keys_left=left_stats["total_keys"],
            total_keys_right=right_stats["total_keys"],
            depth_left=left_stats["depth"],
            depth_right=right_stats["depth"],
            array_count_left=left_stats["array_count"],
            array_count_right=right_stats["array_count"],
            object_count_left=left_stats["object_count"],
            object_count_right=right_stats["object_count"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error calculating statistics: {str(e)}"
        )


@router.post("/validate")
async def validate_json(data: Any = Body(...)) -> dict:
    """Validate that the input is valid JSON.

    Args:
        data: JSON data to validate.

    Returns:
        Validation result.
    """
    return {"valid": True, "type": "object" if isinstance(data, dict) else "array"}
