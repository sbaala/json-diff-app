"""JSON comparison service using Polars for efficient data processing."""

from typing import Any

import polars as pl

from app.models import DiffItem, DiffType


class JsonDiffService:
    """Service for comparing JSON documents using Polars DataFrame."""

    def __init__(self, ignore_order: bool = False):
        """Initialize the diff service.

        Args:
            ignore_order: Whether to ignore array order in comparisons.
        """
        self.ignore_order = ignore_order
        self.differences: list[DiffItem] = []

    def compare(
        self, left: dict[str, Any] | list[Any], right: dict[str, Any] | list[Any]
    ) -> list[DiffItem]:
        """Compare two JSON documents and return the differences.

        Args:
            left: Left JSON document.
            right: Right JSON document.

        Returns:
            List of differences found between the documents.
        """
        self.differences = []
        self._compare_values(left, right, "$")
        return self.differences

    def _get_type_name(self, value: Any) -> str:
        """Get a human-readable type name for a value."""
        if value is None:
            return "null"
        if isinstance(value, bool):
            return "boolean"
        if isinstance(value, int | float):
            return "number"
        if isinstance(value, str):
            return "string"
        if isinstance(value, list):
            return "array"
        if isinstance(value, dict):
            return "object"
        return type(value).__name__

    def _compare_values(self, left: Any, right: Any, path: str) -> None:
        """Recursively compare two values.

        Args:
            left: Left value.
            right: Right value.
            path: Current JSON path.
        """
        left_type = self._get_type_name(left)
        right_type = self._get_type_name(right)

        # Type mismatch
        if left_type != right_type:
            self.differences.append(
                DiffItem(
                    path=path,
                    diff_type=DiffType.TYPE_CHANGED,
                    left_value=left,
                    right_value=right,
                    left_type=left_type,
                    right_type=right_type,
                )
            )
            return

        # Compare based on type
        if isinstance(left, dict) and isinstance(right, dict):
            self._compare_objects(left, right, path)
        elif isinstance(left, list) and isinstance(right, list):
            self._compare_arrays(left, right, path)
        elif left != right:
            self.differences.append(
                DiffItem(
                    path=path,
                    diff_type=DiffType.MODIFIED,
                    left_value=left,
                    right_value=right,
                    left_type=left_type,
                    right_type=right_type,
                )
            )

    def _compare_objects(
        self, left: dict[str, Any], right: dict[str, Any], path: str
    ) -> None:
        """Compare two JSON objects using Polars for key analysis.

        Args:
            left: Left object.
            right: Right object.
            path: Current JSON path.
        """
        left_keys = set(left.keys())
        right_keys = set(right.keys())

        # Use Polars for efficient key comparison
        all_keys = list(left_keys | right_keys)
        if all_keys:
            df = pl.DataFrame(
                {
                    "key": all_keys,
                    "in_left": [k in left_keys for k in all_keys],
                    "in_right": [k in right_keys for k in all_keys],
                }
            )

            # Keys only in left (removed)
            removed_keys = df.filter(pl.col("in_left") & ~pl.col("in_right"))[
                "key"
            ].to_list()
            for key in removed_keys:
                key_path = f"{path}.{key}"
                self.differences.append(
                    DiffItem(
                        path=key_path,
                        diff_type=DiffType.REMOVED,
                        left_value=left[key],
                        right_value=None,
                        left_type=self._get_type_name(left[key]),
                        right_type=None,
                    )
                )

            # Keys only in right (added)
            added_keys = df.filter(~pl.col("in_left") & pl.col("in_right"))[
                "key"
            ].to_list()
            for key in added_keys:
                key_path = f"{path}.{key}"
                self.differences.append(
                    DiffItem(
                        path=key_path,
                        diff_type=DiffType.ADDED,
                        left_value=None,
                        right_value=right[key],
                        left_type=None,
                        right_type=self._get_type_name(right[key]),
                    )
                )

            # Keys in both - compare recursively
            common_keys = df.filter(pl.col("in_left") & pl.col("in_right"))[
                "key"
            ].to_list()
            for key in common_keys:
                key_path = f"{path}.{key}"
                self._compare_values(left[key], right[key], key_path)

    def _compare_arrays(
        self, left: list[Any], right: list[Any], path: str
    ) -> None:
        """Compare two arrays.

        Args:
            left: Left array.
            right: Right array.
            path: Current JSON path.
        """
        if self.ignore_order:
            self._compare_arrays_unordered(left, right, path)
        else:
            self._compare_arrays_ordered(left, right, path)

    def _compare_arrays_ordered(
        self, left: list[Any], right: list[Any], path: str
    ) -> None:
        """Compare arrays maintaining order.

        Args:
            left: Left array.
            right: Right array.
            path: Current JSON path.
        """
        max_len = max(len(left), len(right))

        for i in range(max_len):
            item_path = f"{path}[{i}]"

            if i >= len(left):
                # Item only in right
                self.differences.append(
                    DiffItem(
                        path=item_path,
                        diff_type=DiffType.ADDED,
                        left_value=None,
                        right_value=right[i],
                        left_type=None,
                        right_type=self._get_type_name(right[i]),
                    )
                )
            elif i >= len(right):
                # Item only in left
                self.differences.append(
                    DiffItem(
                        path=item_path,
                        diff_type=DiffType.REMOVED,
                        left_value=left[i],
                        right_value=None,
                        left_type=self._get_type_name(left[i]),
                        right_type=None,
                    )
                )
            else:
                # Compare items at same index
                self._compare_values(left[i], right[i], item_path)

    def _compare_arrays_unordered(
        self, left: list[Any], right: list[Any], path: str
    ) -> None:
        """Compare arrays ignoring order (set comparison for primitives).

        Args:
            left: Left array.
            right: Right array.
            path: Current JSON path.
        """
        # For simple primitives, use set comparison
        left_primitives = []
        right_primitives = []
        left_complex = []
        right_complex = []

        for item in left:
            if isinstance(item, dict | list):
                left_complex.append(item)
            else:
                left_primitives.append(item)

        for item in right:
            if isinstance(item, dict | list):
                right_complex.append(item)
            else:
                right_primitives.append(item)

        # Use Polars for primitive comparison
        if left_primitives or right_primitives:
            left_set = set(
                str(x) if not isinstance(x, str) else x for x in left_primitives
            )
            right_set = set(
                str(x) if not isinstance(x, str) else x for x in right_primitives
            )

            for item in left_primitives:
                item_str = str(item) if not isinstance(item, str) else item
                if item_str not in right_set:
                    self.differences.append(
                        DiffItem(
                            path=f"{path}[?]",
                            diff_type=DiffType.REMOVED,
                            left_value=item,
                            right_value=None,
                            left_type=self._get_type_name(item),
                            right_type=None,
                        )
                    )

            for item in right_primitives:
                item_str = str(item) if not isinstance(item, str) else item
                if item_str not in left_set:
                    self.differences.append(
                        DiffItem(
                            path=f"{path}[?]",
                            diff_type=DiffType.ADDED,
                            left_value=None,
                            right_value=item,
                            left_type=None,
                            right_type=self._get_type_name(item),
                        )
                    )

        # For complex items, fall back to ordered comparison
        max_complex = max(len(left_complex), len(right_complex))
        for i in range(max_complex):
            if i < len(left_complex) and i < len(right_complex):
                self._compare_values(
                    left_complex[i], right_complex[i], f"{path}[complex:{i}]"
                )
            elif i < len(left_complex):
                self.differences.append(
                    DiffItem(
                        path=f"{path}[complex:{i}]",
                        diff_type=DiffType.REMOVED,
                        left_value=left_complex[i],
                        right_value=None,
                        left_type=self._get_type_name(left_complex[i]),
                        right_type=None,
                    )
                )
            else:
                self.differences.append(
                    DiffItem(
                        path=f"{path}[complex:{i}]",
                        diff_type=DiffType.ADDED,
                        left_value=None,
                        right_value=right_complex[i],
                        left_type=None,
                        right_type=self._get_type_name(right_complex[i]),
                    )
                )


def get_json_statistics(data: dict[str, Any] | list[Any]) -> dict[str, int]:
    """Calculate statistics for a JSON document using Polars.

    Args:
        data: JSON document to analyze.

    Returns:
        Dictionary with statistics.
    """
    stats = {
        "total_keys": 0,
        "depth": 0,
        "array_count": 0,
        "object_count": 0,
    }

    def analyze(value: Any, current_depth: int) -> None:
        stats["depth"] = max(stats["depth"], current_depth)

        if isinstance(value, dict):
            stats["object_count"] += 1
            stats["total_keys"] += len(value)
            for v in value.values():
                analyze(v, current_depth + 1)
        elif isinstance(value, list):
            stats["array_count"] += 1
            for item in value:
                analyze(item, current_depth + 1)

    analyze(data, 0)
    return stats


def create_diff_dataframe(differences: list[DiffItem]) -> pl.DataFrame:
    """Create a Polars DataFrame from the differences for analysis.

    Args:
        differences: List of differences.

    Returns:
        DataFrame with difference statistics.
    """
    if not differences:
        return pl.DataFrame(
            {
                "path": [],
                "diff_type": [],
                "left_type": [],
                "right_type": [],
            }
        )

    return pl.DataFrame(
        {
            "path": [d.path for d in differences],
            "diff_type": [d.diff_type.value for d in differences],
            "left_type": [d.left_type for d in differences],
            "right_type": [d.right_type for d in differences],
        }
    )


def annotate_tree(
    data: dict[str, Any] | list[Any],
    differences: list[DiffItem],
    side: str,
) -> dict[str, Any] | list[Any]:
    """Annotate a JSON tree with diff information.

    Args:
        data: JSON document.
        differences: List of differences.
        side: Either 'left' or 'right'.

    Returns:
        Annotated JSON structure.
    """
    # Create a lookup for paths to diff types
    diff_lookup: dict[str, DiffType] = {}
    for diff in differences:
        if side == "left" and diff.diff_type in (
            DiffType.REMOVED,
            DiffType.MODIFIED,
            DiffType.TYPE_CHANGED,
        ):
            diff_lookup[diff.path] = diff.diff_type
        elif side == "right" and diff.diff_type in (
            DiffType.ADDED,
            DiffType.MODIFIED,
            DiffType.TYPE_CHANGED,
        ):
            diff_lookup[diff.path] = diff.diff_type

    def annotate(value: Any, path: str) -> dict[str, Any]:
        result: dict[str, Any] = {
            "value": value,
            "path": path,
            "diff_type": diff_lookup.get(path, DiffType.UNCHANGED).value
            if path in diff_lookup
            else "unchanged",
        }

        if isinstance(value, dict):
            result["children"] = {}
            for k, v in value.items():
                child_path = f"{path}.{k}"
                result["children"][k] = annotate(v, child_path)
        elif isinstance(value, list):
            result["children"] = []
            for i, item in enumerate(value):
                child_path = f"{path}[{i}]"
                result["children"].append(annotate(item, child_path))

        return result

    return annotate(data, "$")
