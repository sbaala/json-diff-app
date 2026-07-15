"""Unit tests for API endpoints."""

import pytest


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test health check returns healthy status."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestCompareEndpoint:
    """Tests for /api/v1/compare endpoint."""

    def test_compare_equal_json(self, client, sample_json_equal):
        """Test comparing equal JSON documents."""
        response = client.post(
            "/api/v1/compare",
            json={
                "left_json": sample_json_equal["left"],
                "right_json": sample_json_equal["right"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_equal"] is True
        assert data["diff_count"] == 0

    def test_compare_different_json(self, client, sample_json_different):
        """Test comparing different JSON documents."""
        response = client.post(
            "/api/v1/compare",
            json={
                "left_json": sample_json_different["left"],
                "right_json": sample_json_different["right"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_equal"] is False
        assert data["diff_count"] > 0
        assert "differences" in data
        assert "left_tree" in data
        assert "right_tree" in data

    def test_compare_nested_json(self, client, sample_nested_json):
        """Test comparing nested JSON documents."""
        response = client.post(
            "/api/v1/compare",
            json={
                "left_json": sample_nested_json["left"],
                "right_json": sample_nested_json["right"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_equal"] is False
        assert len(data["differences"]) > 0

    def test_compare_with_ignore_order(self, client, sample_array_json):
        """Test comparing arrays with ignore_order option."""
        response = client.post(
            "/api/v1/compare",
            json={
                "left_json": sample_array_json["left"],
                "right_json": sample_array_json["right"],
                "ignore_order": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "differences" in data

    def test_compare_empty_objects(self, client):
        """Test comparing empty objects."""
        response = client.post(
            "/api/v1/compare",
            json={"left_json": {}, "right_json": {}},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_equal"] is True

    def test_compare_arrays(self, client):
        """Test comparing array root documents."""
        response = client.post(
            "/api/v1/compare",
            json={"left_json": [1, 2, 3], "right_json": [1, 2, 4]},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_equal"] is False

    def test_compare_response_counts(self, client):
        """Test that response includes correct counts."""
        response = client.post(
            "/api/v1/compare",
            json={
                "left_json": {"a": 1, "b": 2, "c": 3},
                "right_json": {"a": 1, "b": 5, "d": 4},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "added_count" in data
        assert "removed_count" in data
        assert "modified_count" in data


class TestStatisticsEndpoint:
    """Tests for /api/v1/statistics endpoint."""

    def test_statistics_simple(self, client):
        """Test statistics for simple objects."""
        response = client.post(
            "/api/v1/statistics",
            json={
                "left_json": {"name": "John", "age": 30},
                "right_json": {"name": "Jane"},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_keys_left"] == 2
        assert data["total_keys_right"] == 1

    def test_statistics_nested(self, client, sample_nested_json):
        """Test statistics for nested objects."""
        response = client.post(
            "/api/v1/statistics",
            json={
                "left_json": sample_nested_json["left"],
                "right_json": sample_nested_json["right"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["depth_left"] > 0
        assert data["array_count_left"] > 0
        assert data["object_count_left"] > 0


class TestValidateEndpoint:
    """Tests for /api/v1/validate endpoint."""

    def test_validate_object(self, client):
        """Test validating an object."""
        response = client.post(
            "/api/v1/validate",
            json={"name": "John"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["type"] == "object"

    def test_validate_array(self, client):
        """Test validating an array."""
        response = client.post(
            "/api/v1/validate",
            json=[1, 2, 3],
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["type"] == "array"
