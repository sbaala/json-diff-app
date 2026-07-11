# Freebies JSON Tools — LLM Project Context

> **Purpose of this file**: Provide any LLM (ChatGPT, Claude, Gemini, Copilot, etc.) with enough context to understand, modify, debug, and deploy this project without needing to explore files first. Paste or attach this file at the start of a conversation.

---

## 1. What Is This Project?

**Freebies JSON Tools** is a full-stack web application that bundles eight JSON/text utilities under a single UI:

| # | Page | Route | Backend? | Description |
|---|------|-------|----------|-------------|
| 1 | **Format** | `/format` | No | Beautify, minify, sort keys, escape/unescape JSON |
| 2 | **Viewer** | `/viewer` | No | Interactive tree view with search, stats, expand/collapse |
| 3 | **Grid** | `/grid` | No | Spreadsheet-style table for arrays of objects — per-column filters, column hide/show, CSV export |
| 4 | **JSON Diff** | `/compare` | **Yes** | Side-by-side tree diff with color-coded add/remove/modify |
| 5 | **Text Diff** | `/text` | No | Line-by-line text comparison with unified/split view |
| 6 | **Convert** | `/convert` | No | JSON ↔ YAML / CSV / XML / TOML conversion |
| 7 | **Lint** | `/lint` | No | JSON schema validation and linting |
| 8 | **Graph** | `/graph` | No | Visual graph/tree rendering of JSON structure |

The root route (`/`) redirects to `/format` via a server-side 307 redirect in `+page.server.ts`.

---

## 2. Tech Stack

### Frontend
| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | SvelteKit | 2.x |
| UI Library | Svelte | 5 (uses runes: `$state`, `$derived`, `$props`) |
| Language | TypeScript | 5.x |
| Build | Vite | 5.x |
| Node adapter | `@sveltejs/adapter-node` | 5.x |
| Testing | Vitest + @testing-library/svelte | — |
| Styling | Scoped CSS + CSS custom properties (dark/light theme) | — |

### Backend
| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | FastAPI | ≥ 0.115 |
| Language | Python | 3.13 |
| Package Mgr | uv | latest |
| Data Processing | Polars | ≥ 1.17 |
| Validation | Pydantic | ≥ 2.10 |
| Server | Uvicorn | ≥ 0.32 |
| Testing | pytest + pytest-asyncio + httpx | — |

### Infrastructure
| Concern | Technology |
|---------|-----------|
| Containers | Docker (multi-stage builds) |
| Orchestration | Docker Compose (prod + dev) |
| Reverse Proxy | Nginx (routes `/api/*` → backend, `/*` → frontend) |
| Cloud Target | Google Cloud Run (see `DEPLOYMENT.md`) |

---

## 3. Project Structure

```
json-diff-app/
├── backend/                         # Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app, CORS, router mount
│   │   ├── models.py                # Pydantic models (CompareRequest, CompareResponse, DiffItem, etc.)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   └── diff.py              # POST /api/v1/compare, /statistics, /validate
│   │   └── services/
│   │       ├── __init__.py
│   │       └── diff_service.py      # JsonDiffService — core diff logic using Polars
│   ├── tests/
│   │   ├── conftest.py              # pytest fixtures (FastAPI TestClient)
│   │   ├── test_api.py              # API integration tests
│   │   └── test_diff_service.py     # Unit tests for diff service
│   ├── Dockerfile                   # python:3.13-slim, uv sync, uvicorn
│   ├── pyproject.toml               # deps, ruff config, pytest config
│   └── uv.lock
│
├── frontend/                        # SvelteKit frontend
│   ├── src/
│   │   ├── app.html                 # HTML shell template
│   │   ├── app.css                  # Global styles, theme CSS variables
│   │   ├── app.d.ts                 # SvelteKit type declarations
│   │   ├── lib/
│   │   │   ├── index.ts             # Barrel exports
│   │   │   ├── api.ts               # HTTP client (fetch wrapper for /api/v1/*)
│   │   │   ├── api.test.ts
│   │   │   ├── types.ts             # TS interfaces matching Pydantic models
│   │   │   ├── stores/
│   │   │   │   └── theme.ts         # Dark/light theme store
│   │   │   ├── utils/
│   │   │   │   └── jsonDiff.ts      # Client-side diff utilities
│   │   │   └── components/
│   │   │       ├── index.ts
│   │   │       ├── JsonEditor.svelte       # JSON input editor with line numbers
│   │   │       ├── DiffViewer.svelte       # Side-by-side diff panels
│   │   │       ├── DiffNode.svelte         # Recursive tree diff node
│   │   │       ├── DiffList.svelte         # Flat list of differences
│   │   │       ├── DiffList.test.ts
│   │   │       ├── InlineDiffViewer.svelte # Inline diff view
│   │   │       ├── SideBySideDiff.svelte   # Side-by-side diff view
│   │   │       ├── StatsPanel.svelte       # Comparison stats sidebar
│   │   │       ├── StatsPanel.test.ts
│   │   │       └── JsonTreeNode.svelte     # Recursive tree viewer node
│   │   └── routes/
│   │       ├── +layout.svelte       # App shell — header, nav, footer, theme toggle
│   │       ├── +page.server.ts      # Root redirect → /format
│   │       ├── format/+page.svelte  # Format/beautify/minify
│   │       ├── viewer/+page.svelte  # Interactive JSON tree viewer
│   │       ├── grid/+page.svelte    # Grid/table view with column filters
│   │       ├── compare/+page.svelte # JSON diff (calls backend API)
│   │       ├── text/+page.svelte    # Text diff (client-side)
│   │       ├── convert/+page.svelte # JSON ↔ YAML/CSV/XML/TOML
│   │       ├── lint/+page.svelte    # JSON linting/validation
│   │       └── graph/+page.svelte   # JSON graph visualization
│   ├── static/                      # Static assets (favicon, etc.)
│   ├── Dockerfile                   # node:22-alpine multi-stage build
│   ├── package.json
│   ├── svelte.config.js             # adapter-node, aliases
│   ├── vite.config.ts               # dev proxy /api → localhost:8000
│   └── tsconfig.json
│
├── docker-compose.yml               # Production: backend + frontend + nginx
├── docker-compose.dev.yml           # Dev: hot-reload with volume mounts
├── nginx.conf                       # Reverse proxy config
├── CONTEXT.md                       # ← This file (LLM context)
├── ARCHITECTURE.md                  # System architecture diagrams
├── CONTRIBUTING.md                   # Developer guidelines
├── DEPLOYMENT.md                    # Google Cloud Run deployment guide
└── README.md                        # Project overview
```

---

## 4. API Endpoints (Backend)

Base path: `/api/v1`

| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| `POST` | `/api/v1/compare` | `CompareRequest` | `CompareResponse` | Diff two JSON documents |
| `POST` | `/api/v1/statistics` | `CompareRequest` | `StatisticsResponse` | Get doc stats (keys, depth, counts) |
| `POST` | `/api/v1/validate` | Any JSON | `{ valid, type }` | Validate JSON |
| `GET` | `/health` | — | `{ status, version }` | Health check |

### Key Models

```python
# CompareRequest
{
  "left_json": {...},        # dict or list
  "right_json": {...},       # dict or list
  "ignore_order": false      # optional
}

# CompareResponse
{
  "is_equal": bool,
  "diff_count": int,
  "added_count": int,
  "removed_count": int,
  "modified_count": int,
  "differences": [DiffItem],  # path, diff_type, left/right values
  "left_tree": AnnotatedNode, # tree with diff annotations for rendering
  "right_tree": AnnotatedNode
}

# DiffItem
{
  "path": "$.user.name",
  "diff_type": "added" | "removed" | "modified" | "type_changed",
  "left_value": any,
  "right_value": any,
  "left_type": "string" | null,
  "right_type": "string" | null
}
```

### CORS Configuration

Backend allows origins: `http://localhost:5173` (dev), `http://localhost:3000` (prod).
When deploying to Cloud Run, add your production domain to `allow_origins`.

---

## 5. Frontend Architecture

### Svelte 5 Patterns Used

```svelte
<script lang="ts">
  let { value, label }: Props = $props();     // Component props
  let count = $state(0);                       // Reactive state
  let doubled = $derived(count * 2);           // Derived values
  let result = $derived.by(() => { ... });     // Computed with function
</script>
```

### Routing

- SvelteKit file-based routing under `src/routes/`
- `+layout.svelte` provides the app shell (header with nav links, theme toggle, footer)
- `+page.server.ts` at root does a 307 redirect to `/format`
- Most pages are **client-only** (no backend call) except `/compare` which posts to the FastAPI backend
- `vite.config.ts` proxies `/api` requests to `http://localhost:8000` during development

### Styling

- CSS custom properties defined in `app.css` (e.g., `--color-surface`, `--color-primary`, `--color-border`)
- Dark theme is default; light theme toggle via `$lib/stores/theme.ts`
- Component styles are scoped via Svelte `<style>` blocks
- Common classes: `.container`, `.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`

### Key Frontend Files to Edit

| If you want to… | Edit this file |
|-----------------|---------------|
| Add a new page/route | Create `src/routes/<name>/+page.svelte` and add nav link in `+layout.svelte` |
| Change theme colors | `src/app.css` |
| Modify API client | `src/lib/api.ts` |
| Update TypeScript types | `src/lib/types.ts` |
| Add a reusable component | `src/lib/components/` |
| Change the header/nav | `src/routes/+layout.svelte` |

---

## 6. Development Commands

```bash
# ─── Backend ───
cd backend
uv sync --dev                                           # Install all deps
uv run uvicorn app.main:app --reload --port 8000        # Dev server with hot reload
uv run pytest -v                                        # Run tests
uv run pytest --cov=app -v                              # Tests with coverage
uv run ruff check app/                                  # Lint

# ─── Frontend ───
cd frontend
npm install                                             # Install deps
npm run dev                                             # Dev server (port 5173)
npm run build                                           # Production build → ./build/
npm run preview                                         # Preview production build
npm run test:run                                        # Run tests
npm run check                                           # Type check

# ─── Docker ───
docker-compose up --build                               # Production (nginx:80, frontend:3000, backend:8000)
docker-compose -f docker-compose.dev.yml up --build     # Dev with hot reload
```

---

## 7. Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `PYTHONUNBUFFERED` | `1` | Disable Python output buffering (for Docker logs) |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` for builds |
| `PORT` | `3000` | Production server port |
| `ORIGIN` | `http://localhost:3000` | SvelteKit origin (required in production) |

---

## 8. Docker Setup

### Production (`docker-compose.yml`)
Three services: `backend` (port 8000), `frontend` (port 3000), `nginx` (port 80).
Nginx routes `/api/*` → backend, everything else → frontend.

### Development (`docker-compose.dev.yml`)
Two services with volume mounts for hot-reload:
- Backend mounts `./backend/app` → container `/app/app`
- Frontend mounts `./frontend/src` → container `/app/src`

### Dockerfiles
- **Backend**: `python:3.13-slim` → install uv → `uv sync --no-dev` → `CMD uvicorn`
- **Frontend**: Multi-stage — `node:22-alpine` build stage → `node:22-alpine` prod with `node build`

---

## 9. Common Modification Patterns

### Adding a new frontend-only page
1. Create `frontend/src/routes/<name>/+page.svelte`
2. Add a `<a href="/<name>">` link in `frontend/src/routes/+layout.svelte` nav section
3. Page is entirely self-contained — no backend needed

### Adding a new API endpoint
1. Add Pydantic models to `backend/app/models.py`
2. Add route handler to `backend/app/routers/diff.py` (or create a new router file)
3. Register new router in `backend/app/main.py` if it's a new file
4. Add TypeScript types to `frontend/src/lib/types.ts`
5. Add fetch function to `frontend/src/lib/api.ts`

### Changing the theme
Edit CSS custom properties in `frontend/src/app.css` under `:root` and `[data-theme="light"]`.

---

## 10. Testing

### Backend
```bash
cd backend && uv run pytest -v
```
- `tests/conftest.py` — creates `httpx.AsyncClient` with FastAPI app
- `tests/test_api.py` — integration tests for all API endpoints
- `tests/test_diff_service.py` — unit tests for `JsonDiffService`

### Frontend
```bash
cd frontend && npm run test:run
```
- Uses `vitest` + `jsdom` + `@testing-library/svelte`
- Test files co-located: `*.test.ts` next to source files
- Setup in `vitest-setup.ts`

---

## 11. Deployment

See **`DEPLOYMENT.md`** for a complete Google Cloud Run deployment guide covering:
- Single-service architecture (combined frontend + backend)
- Separate multi-service deployment
- CI/CD with Cloud Build
- Custom domain mapping
- Environment variable configuration
