# Freebies JSON Tools

A full-stack web application bundling eight JSON & text utilities under a modern, dark-themed UI.

## Features

| Page | Route | Description |
|------|-------|-------------|
| **Format** | `/format` | Beautify, minify, sort keys, escape/unescape JSON |
| **Viewer** | `/viewer` | Interactive tree view with search, stats, expand/collapse |
| **Grid** | `/grid` | Spreadsheet-style table for JSON arrays — per-column filters, column show/hide, CSV export |
| **JSON Diff** | `/compare` | Side-by-side tree diff with color-coded additions, removals, modifications |
| **Text Diff** | `/text` | Line-by-line text comparison with unified/split view |
| **Convert** | `/convert` | JSON ↔ YAML / CSV / XML / TOML conversion |
| **Lint** | `/lint` | JSON schema validation and linting |
| **Graph** | `/graph` | Visual graph/tree rendering of JSON structure |

## Technology Stack

### Backend
- **Python 3.13** with type hints
- **FastAPI** for high-performance REST API
- **Polars** for efficient data processing
- **Pydantic** for data validation
- **uv** for fast dependency management

### Frontend
- **SvelteKit 2** with Svelte 5 (runes API)
- **TypeScript** for type safety
- **Vite** for fast development and builds

### Infrastructure
- **Docker** with multi-stage builds
- **Docker Compose** (production & development)
- **Nginx** as reverse proxy
- **Google Cloud Run** (see [DEPLOYMENT.md](DEPLOYMENT.md))

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Access the application at http://localhost
```

### Development Mode

```bash
# Start backend
cd backend
uv sync --dev
uv run uvicorn app.main:app --reload --port 8000

# In another terminal, start frontend
cd frontend
npm install
npm run dev
```

The frontend dev server runs on http://localhost:5173 and proxies `/api` to the backend.

## Project Structure

```
json-diff-app/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # Application entry point, CORS, router mount
│   │   ├── models.py       # Pydantic models (CompareRequest, DiffItem, etc.)
│   │   ├── routers/        # API route handlers
│   │   └── services/       # Business logic (JsonDiffService)
│   ├── tests/              # pytest tests
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/               # SvelteKit frontend
│   ├── src/
│   │   ├── app.css         # Global theme (CSS custom properties)
│   │   ├── lib/
│   │   │   ├── api.ts      # API client
│   │   │   ├── types.ts    # TypeScript interfaces
│   │   │   ├── stores/     # Svelte stores (theme)
│   │   │   ├── utils/      # Utility functions
│   │   │   └── components/ # Reusable Svelte components
│   │   └── routes/         # Page routes (format, viewer, grid, compare, text, convert, lint, graph)
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Production deployment
├── docker-compose.dev.yml  # Development with hot reload
├── nginx.conf              # Nginx reverse proxy config
├── CONTEXT.md              # Full project context for LLMs
├── ARCHITECTURE.md         # System architecture diagrams
├── CONTRIBUTING.md         # Developer guidelines
└── DEPLOYMENT.md           # Google Cloud Run deployment guide
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/compare` | Compare two JSON documents |
| POST | `/api/v1/statistics` | Get document statistics |
| POST | `/api/v1/validate` | Validate JSON |
| GET | `/health` | Health check |

Interactive API docs available at http://localhost:8000/docs when the backend is running.

## Running Tests

### Backend Tests

```bash
cd backend
uv sync --dev
uv run pytest -v
```

### Frontend Tests

```bash
cd frontend
npm install
npm run test:run
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for a complete guide to deploying on Google Cloud Run, including:
- Two-service architecture (recommended)
- Single combined service option
- CI/CD with Cloud Build
- Custom domain mapping
- Cost optimization tips

## Documentation

| File | Purpose |
|------|---------|
| [CONTEXT.md](CONTEXT.md) | Comprehensive project context for LLMs — paste into any AI assistant to get full codebase understanding |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture diagrams and data flow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development setup, code conventions, Svelte 5 patterns |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Google Cloud Run deployment guide |

## Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `PYTHONUNBUFFERED` | `1` | Disable output buffering (Docker) |
| `FRONTEND_URL` | — | Production frontend URL (for CORS) |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` for builds |
| `PORT` | `3000` | Production server port |
| `ORIGIN` | `http://localhost:3000` | SvelteKit origin URL |

## License

MIT License
