"""Pytest fixtures for testing."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def sample_json_equal():
    """Sample equal JSON documents."""
    return {
        "left": {"name": "John", "age": 30, "city": "New York"},
        "right": {"name": "John", "age": 30, "city": "New York"},
    }


@pytest.fixture
def sample_json_different():
    """Sample different JSON documents."""
    return {
        "left": {
            "name": "John",
            "age": 30,
            "city": "New York",
            "country": "USA",
        },
        "right": {
            "name": "Jane",
            "age": 25,
            "city": "New York",
            "state": "NY",
        },
    }


@pytest.fixture
def sample_nested_json():
    """Sample nested JSON documents."""
    return {
        "left": {
            "user": {
                "name": "John",
                "address": {"city": "New York", "zip": "10001"},
            },
            "orders": [{"id": 1, "total": 100}, {"id": 2, "total": 200}],
        },
        "right": {
            "user": {
                "name": "John",
                "address": {"city": "Boston", "zip": "02101"},
            },
            "orders": [{"id": 1, "total": 150}, {"id": 3, "total": 300}],
        },
    }


@pytest.fixture
def sample_array_json():
    """Sample JSON with arrays."""
    return {
        "left": {"items": [1, 2, 3, 4, 5]},
        "right": {"items": [1, 2, 4, 5, 6]},
    }
