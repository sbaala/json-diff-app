"""Unit tests for the diff service."""

import pytest

from app.models import DiffType
from app.services.diff_service import (
    JsonDiffService,
    annotate_tree,
    create_diff_dataframe,
    get_json_statistics,
)


class TestJsonDiffService:
    """Tests for JsonDiffService."""

    def test_equal_simple_objects(self):
        """Test comparing equal simple objects."""
        service = JsonDiffService()
        left = {"name": "John", "age": 30}
        right = {"name": "John", "age": 30}

        differences = service.compare(left, right)

        assert len(differences) == 0

    def test_different_values(self):
        """Test detecting value modifications."""
        service = JsonDiffService()
        left = {"name": "John", "age": 30}
        right = {"name": "Jane", "age": 25}

        differences = service.compare(left, right)

        assert len(differences) == 2
        assert all(d.diff_type == DiffType.MODIFIED for d in differences)

    def test_added_keys(self):
        """Test detecting added keys."""
        service = JsonDiffService()
        left = {"name": "John"}
        right = {"name": "John", "age": 30}

        differences = service.compare(left, right)

        assert len(differences) == 1
        assert differences[0].diff_type == DiffType.ADDED
        assert differences[0].right_value == 30

    def test_removed_keys(self):
        """Test detecting removed keys."""
        service = JsonDiffService()
        left = {"name": "John", "age": 30}
        right = {"name": "John"}

        differences = service.compare(left, right)

        assert len(differences) == 1
        assert differences[0].diff_type == DiffType.REMOVED
        assert differences[0].left_value == 30

    def test_type_change(self):
        """Test detecting type changes."""
        service = JsonDiffService()
        left = {"value": "123"}
        right = {"value": 123}

        differences = service.compare(left, right)

        assert len(differences) == 1
        assert differences[0].diff_type == DiffType.TYPE_CHANGED
        assert differences[0].left_type == "string"
        assert differences[0].right_type == "number"

    def test_nested_objects(self):
        """Test comparing nested objects."""
        service = JsonDiffService()
        left = {"user": {"name": "John", "address": {"city": "NYC"}}}
        right = {"user": {"name": "John", "address": {"city": "LA"}}}

        differences = service.compare(left, right)

        assert len(differences) == 1
        assert differences[0].path == "$.user.address.city"
        assert differences[0].diff_type == DiffType.MODIFIED

    def test_array_ordered_comparison(self):
        """Test ordered array comparison."""
        service = JsonDiffService(ignore_order=False)
        left = {"items": [1, 2, 3]}
        right = {"items": [1, 4, 3]}

        differences = service.compare(left, right)

        assert len(differences) == 1
        assert differences[0].path == "$.items[1]"
        assert differences[0].diff_type == DiffType.MODIFIED

    def test_array_length_difference(self):
        """Test arrays with different lengths."""
        service = JsonDiffService()
        left = {"items": [1, 2]}
        right = {"items": [1, 2, 3, 4]}

        differences = service.compare(left, right)

        assert len(differences) == 2
        added = [d for d in differences if d.diff_type == DiffType.ADDED]
        assert len(added) == 2

    def test_empty_objects(self):
        """Test comparing empty objects."""
        service = JsonDiffService()
        left = {}
        right = {}

        differences = service.compare(left, right)

        assert len(differences) == 0

    def test_null_values(self):
        """Test handling null values."""
        service = JsonDiffService()
        left = {"value": None}
        right = {"value": "not null"}

        differences = service.compare(left, right)

        assert len(differences) == 1
        assert differences[0].diff_type == DiffType.TYPE_CHANGED

    def test_boolean_values(self):
        """Test comparing boolean values."""
        service = JsonDiffService()
        left = {"active": True}
        right = {"active": False}

        differences = service.compare(left, right)

        assert len(differences) == 1
        assert differences[0].diff_type == DiffType.MODIFIED

    def test_complex_nested_structure(self):
        """Test complex nested structure with multiple differences."""
        service = JsonDiffService()
        left = {
            "users": [
                {"name": "John", "roles": ["admin", "user"]},
                {"name": "Jane", "roles": ["user"]},
            ],
            "config": {"debug": True, "version": "1.0"},
        }
        right = {
            "users": [
                {"name": "John", "roles": ["admin"]},
                {"name": "Jane", "roles": ["user", "manager"]},
            ],
            "config": {"debug": False, "version": "2.0"},
        }

        differences = service.compare(left, right)

        assert len(differences) > 0
        # Check that we found modifications in config
        config_diffs = [d for d in differences if "config" in d.path]
        assert len(config_diffs) >= 2


class TestGetJsonStatistics:
    """Tests for get_json_statistics function."""

    def test_simple_object_stats(self):
        """Test statistics for a simple object."""
        data = {"name": "John", "age": 30}
        stats = get_json_statistics(data)

        assert stats["total_keys"] == 2
        assert stats["depth"] == 1
        assert stats["object_count"] == 1
        assert stats["array_count"] == 0

    def test_nested_object_stats(self):
        """Test statistics for nested objects."""
        data = {"user": {"name": "John", "address": {"city": "NYC"}}}
        stats = get_json_statistics(data)

        assert stats["total_keys"] == 4
        assert stats["depth"] == 3
        assert stats["object_count"] == 3

    def test_array_stats(self):
        """Test statistics for arrays."""
        data = {"items": [1, 2, 3], "nested": {"arr": [4, 5]}}
        stats = get_json_statistics(data)

        assert stats["array_count"] == 2
        assert stats["object_count"] == 2

    def test_empty_object_stats(self):
        """Test statistics for empty object."""
        stats = get_json_statistics({})

        assert stats["total_keys"] == 0
        assert stats["depth"] == 0


class TestCreateDiffDataframe:
    """Tests for create_diff_dataframe function."""

    def test_empty_differences(self):
        """Test dataframe creation with no differences."""
        df = create_diff_dataframe([])

        assert df.shape[0] == 0

    def test_with_differences(self):
        """Test dataframe creation with differences."""
        service = JsonDiffService()
        left = {"name": "John", "age": 30}
        right = {"name": "Jane", "city": "NYC"}

        differences = service.compare(left, right)
        df = create_diff_dataframe(differences)

        assert df.shape[0] == len(differences)
        assert "path" in df.columns
        assert "diff_type" in df.columns


class TestAnnotateTree:
    """Tests for annotate_tree function."""

    def test_annotate_left_tree(self):
        """Test tree annotation for left side."""
        service = JsonDiffService()
        left = {"name": "John", "age": 30}
        right = {"name": "Jane"}

        differences = service.compare(left, right)
        annotated = annotate_tree(left, differences, "left")

        assert "value" in annotated
        assert "children" in annotated

    def test_annotate_right_tree(self):
        """Test tree annotation for right side."""
        service = JsonDiffService()
        left = {"name": "John"}
        right = {"name": "Jane", "age": 25}

        differences = service.compare(left, right)
        annotated = annotate_tree(right, differences, "right")

        assert "value" in annotated
        assert "children" in annotated
