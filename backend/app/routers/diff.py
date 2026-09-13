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
        CompareResponse with detailed differences (paginated).
    """
    try:
        # Validate pagination parameters
        limit = min(max(request.limit, 1), 1000)  # Clamp between 1-1000
        offset = max(request.offset, 0)

        service = JsonDiffService(ignore_order=request.ignore_order)
        all_differences = service.compare(request.left_json, request.right_json)

        # Count differences by type
        added_count = sum(1 for d in all_differences if d.diff_type == DiffType.ADDED)
        removed_count = sum(
            1 for d in all_differences if d.diff_type == DiffType.REMOVED
        )
        modified_count = sum(
            1
            for d in all_differences
            if d.diff_type in (DiffType.MODIFIED, DiffType.TYPE_CHANGED)
        )

        # Paginate differences
        total_count = len(all_differences)
        paginated_differences = all_differences[offset : offset + limit]
        has_more = (offset + limit) < total_count

        # Remove values if not requested (saves ~70-80% payload)
        if not request.include_values:
            for diff in paginated_differences:
                diff.left_value = None  # type: ignore
                diff.right_value = None  # type: ignore

        # Create annotated trees only if requested (saves ~66% payload)
        left_tree = None
        right_tree = None
        if request.include_trees:
            left_tree = annotate_tree(request.left_json, all_differences, "left")
            right_tree = annotate_tree(request.right_json, all_differences, "right")

        return CompareResponse(
            is_equal=len(all_differences) == 0,
            diff_count=total_count,
            added_count=added_count,
            removed_count=removed_count,
            modified_count=modified_count,
            total_count=total_count,
            has_more=has_more,
            differences=paginated_differences,
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
