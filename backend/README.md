# Freebies JSON Comparer - Backend API

FastAPI backend for JSON comparison using Polars for efficient data processing.

## Features

- Compare two JSON documents
- Detect added, removed, and modified values
- Support for nested objects and arrays
- Option to ignore array order
- Statistics about JSON documents
- Annotated tree view for visualization

## Setup

### Using uv (recommended)

```bash
# Install dependencies
uv sync

# Install dev dependencies
uv sync --dev

# Run the server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Using pip

```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `POST /api/v1/compare` - Compare two JSON documents
- `POST /api/v1/statistics` - Get statistics about JSON documents
- `POST /api/v1/validate` - Validate JSON
- `GET /health` - Health check

## Running Tests

```bash
uv run pytest
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
