# Backend Dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files (README.md is referenced by pyproject's readme field,
# so uv sync fails without it)
COPY pyproject.toml uv.lock README.md ./

# Install dependencies from the lockfile
RUN uv sync --frozen --no-dev

# Copy application code
COPY app ./app

# Default port for local/compose use; Cloud Run injects PORT=8080
EXPOSE 8000

# Run the application (exec so uvicorn receives SIGTERM directly)
CMD ["sh", "-c", "exec uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
