# VinMi — Building Intelligent Enterprise Solutions

A professional full-stack application bundling a suite of JSON & text utilities plus a **65-tool developer dashboard** with a multi-theme design system. Part of the VinMi platform for intelligent enterprise solutions.

## Features

### Core Pages

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | VinMi landing page — brand overview, service offerings, toolkit index, and contact |
| **Tools Dashboard** | `/tools` | 65 client-side developer tools across 5 categories (see below) |
| **Format** | `/format` | Beautify, minify, sort keys, escape/unescape JSON |
| **Viewer** | `/viewer` | Interactive tree view with search, stats, expand/collapse |
| **Grid** | `/grid` | Spreadsheet-style table for JSON arrays — per-column filters, column show/hide, CSV export |
| **JSON Diff** | `/compare` | Side-by-side tree diff with color-coded additions, removals, modifications |
| **Text Diff** | `/text` | Line-by-line text comparison with unified/split view |
| **Convert** | `/convert` | JSON ↔ YAML / CSV / XML / TOML conversion |
| **Lint** | `/lint` | JSON schema validation and linting |
| **Graph** | `/graph` | Visual graph/tree rendering of JSON structure |

### Tools Dashboard (`/tools`)

A searchable, categorized dashboard of **65 developer tools** that run **100% client-side** — no data ever leaves the browser. Tools are declared in a registry and lazy-loaded on demand.

| Category | Count | Highlights |
|----------|-------|------------|
| **JSON & API** | 15 | Formatter, validator, tree viewer, comparator, JSON ↔ YAML/XML/CSV, JSONPath, jq playground, schema generator/validator, GraphQL formatter, Swagger validator, OpenAPI viewer, mock generator |
| **Text Utilities** | 13 | Case converter, base64/HTML/Unicode encoders, JSON escape, text diff, line sorter, whitespace cleaner, regex tester, word counter |
| **Date & Time** | 9 | Timezone converter, cron parser & builder, business-day calculator, ISO 8601, relative time, timestamp generator |
| **JWT & Security** | 14 | JWT validator (HMAC verify), OAuth URL builder, ULID generator, password hasher (PBKDF2), AES-256-GCM encrypt/decrypt, self-contained QR code generator |
| **API Development** | 14 | REST client, GraphQL client, Postman generator, request/response diff, SOAP builder, webhook tester, rate-limiter calculator |

All cryptography uses the browser's native **SubtleCrypto**; conversions use **DOMParser** and pure-TypeScript encoders — nothing is sent to a server.

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
- **VinMi Design System** — 5 professional multi-themes (Midnight, Daylight, Slate, Ocean, Sandstone)

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
├── frontend/               # SvelteKit frontend (VinMi Design System)
│   ├── src/
│   │   ├── app.html        # HTML shell with theme pre-paint script
│   │   ├── app.css         # VinMi Design System tokens (5 themes)
│   │   ├── lib/
│   │   │   ├── api.ts      # API client
│   │   │   ├── types.ts    # TypeScript interfaces
│   │   │   ├── stores/     # theme.ts (multi-theme store)
│   │   │   ├── utils/      # Utility functions
│   │   │   ├── services/   # Client-side logic (converters, schema, crypto, date, text)
│   │   │   ├── tools/      # Tools dashboard: registry.ts, loader.ts, 65 lazy-loaded tool components
│   │   │   └── components/ # Reusable Svelte components
│   │   └── routes/         # Page routes: home (/), tools, format, viewer, grid, compare, text, convert, lint, graph
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

## Google Cloud Run Quick Deploy

The fastest way to deploy both services:

### Prerequisites
```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install
# Set your GCP project
gcloud config set project YOUR_PROJECT_ID
```

### Step 1: Authenticate
```bash
gcloud auth application-default login
```

### Step 2: Deploy Backend
```bash
cd backend
gcloud run deploy json-diff \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```
Save the **backend URL** — you'll need it for the frontend.

### Step 3: Deploy Frontend
```bash
cd frontend
export BACKEND_URL=https://json-diff-xxxxx.run.app  # Replace with your backend URL
gcloud run deploy frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ORIGIN=https://frontend-xxxxx.run.app
```

### Alternative: One-liner Deploy
```bash
# Backend
cd backend && gcloud run deploy json-diff --source .

# Frontend
cd frontend && gcloud run deploy frontend --source .
```

> **Note:** See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed options, CI/CD setup, custom domains, and cost optimization.

## Full Deployment Guide

See [DEPLOYMENT.md](DEPLOYMENT.md) for a comprehensive deployment guide covering:
- Step-by-step GCP project setup
- Two-service vs. single-service architecture
- CI/CD with Cloud Build
- Custom domain mapping
- Environment variables & secrets
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
| `FRONTEND_URL` | — | Production frontend URL (for CORS). Set in Cloud Run: `https://frontend-xxxxx.run.app` |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` for builds |
| `PORT` | `3000` | Production server port |
| `ORIGIN` | `http://localhost:3000` | **Required for production.** Set in Cloud Run: `https://frontend-xxxxx.run.app` |
| `VITE_API_BASE` | `/api` | Backend API base URL (for dev proxy). In Cloud Run, requests route through Nginx/frontend to backend |

## License

MIT License
