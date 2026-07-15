# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**json-diff-app** is a full-stack web application bundling eight JSON & text utilities (format, viewer, grid, diff, text-diff, convert, lint, graph) under a modern dark-themed UI. The architecture separates frontend (SvelteKit) and backend (FastAPI) into independent services that communicate via REST API.

## Development Stack

- **Backend**: Python 3.13, FastAPI, Polars (data processing), Pydantic (validation), uv (package manager)
- **Frontend**: SvelteKit 2 with Svelte 5 (runes API), TypeScript, Vite, Vitest
- **Deployment**: Docker Compose, Nginx reverse proxy, Google Cloud Run

## Key Architecture Patterns

### 1. Service Layer Pattern (Backend)
The backend uses a service layer (`app/services/diff_service.py`) that encapsulates business logic:
- `JsonDiffService` class handles JSON comparison with separate methods for objects, arrays, and values
- Polars DataFrames used for efficient key comparison in objects
- Service returns structured response models (`CompareResponse`, etc.) defined in `models.py`

**Integration point**: Router (`app/routers/diff.py`) calls service methods and returns Pydantic models that auto-serialize to JSON.

### 2. API Client Pattern (Frontend)
Frontend communicates via typed API client (`src/lib/api.ts`) that:
- Wraps all backend calls with consistent error handling
- Uses TypeScript interfaces from `src/lib/types.ts` for type safety
- Hardcodes API base URL (production URL in code, localhost during dev via Vite proxy)

**Dev note**: The frontend dev server proxies `/api/*` to backend (Vite config), so requests go to `http://localhost:5173/api` but reach backend at `http://localhost:8000/api`.

### 3. Component Hierarchy (Frontend)
Pages are built from reusable components organized by concern:
- **Editors**: `JsonEditor` handles JSON input with syntax validation
- **Viewers**: `DiffViewer`, `JsonTreeNode` (recursive), `DiffList`, `InlineDiffViewer`, `SideBySideDiff`
- **Utilities**: `StatsPanel` for metrics, standalone functions in `lib/utils/jsonDiff.ts`

**Pattern**: Components use Svelte 5 runes (`$state`, `$effect`) instead of reactive declarations.

### 4. Theme System
Dark theme is CSS variable-based (`app.css`):
- Colors: `--color-bg`, `--color-surface`, `--color-primary`, `--color-secondary`
- Diff highlighting: `--color-added`, `--color-removed`, `--color-modified`
- Managed via Svelte store (`src/lib/stores/theme.ts`), CSS loads via `:root`

## Common Development Tasks

### Backend Development

**Setup & run**:
```bash
cd backend
uv sync --dev              # Install dependencies (includes dev tools)
uv run uvicorn app.main:app --reload --port 8000
```

**Run tests** (all):
```bash
cd backend
uv run pytest -v
```

**Run single test**:
```bash
cd backend
uv run pytest tests/test_diff_service.py::TestCreateDiffDataframe::test_create_diff_dataframe -v
```

**Type checking**:
```bash
cd backend
uv run ruff check .        # Linting (E, F, I, N, W, UP rules)
```

### Frontend Development

**Setup & run**:
```bash
cd frontend
npm install
npm run dev                # Starts dev server at http://localhost:5173
```

**Run tests** (all):
```bash
cd frontend
npm run test:run
```

**Run tests** (watch mode):
```bash
cd frontend
npm run test
```

**Type checking & linting**:
```bash
cd frontend
npm run check              # Svelte-check + TypeScript
npm run lint               # ESLint
```

### Full-Stack Development

**Docker Compose (dev mode with hot reload)**:
```bash
docker-compose -f docker-compose.dev.yml up
```
This runs both services with volume mounts for live reloading.

**Production build locally** (to test Docker images):
```bash
docker-compose up --build
```
Access at `http://localhost` (Nginx routes to services).

## Request/Response Flow

When comparing two JSONs on the Compare page:

1. User inputs JSON → `JsonEditor` validates syntax
2. Click "Compare" → Frontend calls `compareJson(CompareRequest)` from `api.ts`
3. Request: `{ left_json: {...}, right_json: {...}, ignore_order?: boolean }`
4. Backend router receives POST `/api/v1/compare`, calls `JsonDiffService.compare()`
5. Service compares values recursively, builds diff list and annotated trees
6. Response: `CompareResponse { is_equal, diff_count, added_count, removed_count, differences, left_tree, right_tree }`
7. Frontend parses response, renders trees via `DiffViewer` (shows annotations) or `DiffList` (flat list)

## API Endpoints

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/api/v1/compare` | `CompareRequest` | `CompareResponse` |
| POST | `/api/v1/statistics` | `CompareRequest` | `StatisticsResponse` |
| POST | `/api/v1/validate` | Raw JSON | `{ valid: bool, type: str }` |
| GET | `/health` | — | `{ status, version }` |

All endpoints return `Content-Type: application/json`. Error responses use `detail` field.

## Testing Patterns

### Backend (pytest)
- Tests in `backend/tests/`
- Use `conftest.py` fixtures for sample JSON data
- Test service methods directly (unit tests) and router endpoints (integration tests via `TestClient`)
- Mark async tests with `@pytest.mark.asyncio` or use `pytest-asyncio` auto mode (configured in `pyproject.toml`)

### Frontend (Vitest)
- Tests in component files or `*.test.ts` alongside source
- Use `@testing-library/svelte` for component rendering
- Mock `api.ts` functions in tests (don't call real backend)

## Code Style & Conventions

### Backend
- Use type hints everywhere (Python 3.13+)
- Follow ruff rules (E, F, I, N, W, UP); line length 88
- Use Pydantic `BaseModel` for request/response validation
- Keep routers thin—delegate logic to service layer

### Frontend
- Use TypeScript strictly (no `any` without reason)
- Svelte 5 runes: `$state` for reactive variables, `$effect` for side effects
- Component names are PascalCase, exported from `lib/components/index.ts`
- Types in `src/lib/types.ts`; API calls in `src/lib/api.ts`

## File Structure Reference

```
backend/
  app/main.py              → FastAPI app, CORS, router registration
  app/models.py            → Pydantic models (DiffType, DiffItem, CompareRequest, CompareResponse)
  app/routers/diff.py      → Route handlers for /api/v1/* endpoints
  app/services/diff_service.py → JsonDiffService class, comparison logic
  tests/                   → pytest tests, fixtures in conftest.py

frontend/
  src/app.css              → Theme CSS variables, global styles
  src/lib/api.ts           → API client (fetch wrapper, typed endpoints)
  src/lib/types.ts         → TypeScript interfaces mirroring backend models
  src/lib/stores/          → Svelte stores (theme)
  src/lib/utils/           → Utility functions (JSON operations, diff logic)
  src/lib/components/      → Reusable Svelte components (exported from index.ts)
  src/routes/              → Page routes (8 utilities: format, viewer, grid, compare, text, convert, lint, graph)
```

## Debugging Tips

**Backend**:
- FastAPI interactive docs at `http://localhost:8000/docs` (Swagger UI)
- Print statements appear in terminal running `uvicorn`
- Use breakpoints with `debugpy` if needed (not yet configured; PR welcome)

**Frontend**:
- Browser DevTools: Network tab to see `/api/v1/*` requests
- Svelte DevTools extension for component state inspection
- `npm run check` catches TypeScript errors before runtime

**Full-stack**:
- CORS errors often mean frontend is calling wrong API URL; check `API_BASE` in `api.ts` and dev proxy in Vite config
- "Connection refused" means backend isn't running; start it separately

## When to Check What

| Question | Check |
|----------|-------|
| "What JSON formats does the app support?" | `ARCHITECTURE.md` (Request/Response Models section) |
| "How is theme managed?" | `src/app.css`, `src/lib/stores/theme.ts` |
| "How does the diff algorithm work?" | `app/services/diff_service.py`, search `_compare_objects()` |
| "What components exist for rendering diffs?" | `src/lib/components/` |
| "How are tests structured?" | `backend/tests/conftest.py`, `frontend/src/**/*.test.ts` |
| "What's the Polars usage?" | `app/services/diff_service.py`, search `create_diff_dataframe()` |

## Useful External References

- [SvelteKit Docs](https://kit.svelte.dev) — routing, adapters, load functions
- [Svelte 5 Runes](https://svelte.dev/docs/svelte-5-migration-guide#Runes) — $state, $effect, $props
- [FastAPI Docs](https://fastapi.tiangolo.com) — request/response models, middleware
- [Polars Docs](https://docs.pola.rs) — DataFrame operations
- [Pydantic Docs](https://docs.pydantic.dev) — validation, serialization

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Google Cloud Run setup (two-service architecture recommended).

<!-- AI-TOKEN-OPTIMIZER:START -->
<!-- Generated by AI Token Optimizer extension. Do not edit between these markers. -->

## Token Efficiency Standards

### Search Before Synthesize (CAP-1: CodeGraph)
- Before writing new code, search for existing implementations
- Use `codegraph query` for natural-language file discovery when available
- Reference existing patterns by path rather than regenerating equivalent logic
- Query the code graph index for symbol locations instead of grepping file-by-file
- Check imports and dependency graphs before suggesting new dependencies

### Output Compression (CAP-2: RTK)
RTK (github.com/rtk-ai/rtk) is a CLI proxy that filters command output before it reaches the LLM context.
When RTK is installed and hooked, commands are automatically rewritten. Common savings:
  rtk git status          → -80% tokens    rtk git diff           → -75%
  rtk git log -n 10       → -80%           rtk git push/add/commit → -92%
  rtk cargo test          → -90%           rtk pytest              → -90%
  rtk go test             → -90%           rtk jest                → -90%
  rtk ls / rtk grep       → -80%           rtk tsc                 → -80%
If RTK hook is active, commands rewrite automatically (git status → rtk git status).
If not hooked, prefix commands manually: `rtk git status`, `rtk pytest`, etc.
- Summarize test results: "43 tests passed, 2 failed" not individual lines
- For git log: one-line format `rtk git log -n 10`
- Never compress error messages or stack traces — show those in full
- Disable output compression during active debugging (need full stack traces)

### Response Verbosity (CAP-3: Caveman — full mode)
- Keep responses concise — communicate the same content in fewer words
- Skip boilerplate explanations for obvious changes
- For simple edits: show only the diff, not surrounding unchanged code
- Don't repeat context that's already in the conversation
- Prefer /compact mode. Target ~35% reduction. Skip boilerplate explanations entirely.

### Session Management (CAP-4: Built-in Commands)
- Use `/compact` for routine tasks to reduce response tokens
- Suggest `/clear` when switching between unrelated tasks
- Use Haiku/Sonnet via `/model` for lightweight operations
- Use `/context` to audit and trim oversized context contributors
- When CLAUDE.md exceeds 10k tokens, suggest splitting into focused sections
- Proactively suggest clearing context when token count is high

### Semantic Answer Cache (CAP-5: token-cache MCP)
A local `token-cache` MCP server caches answers on disk — cache hits cost zero model tokens.
- Before answering a question you may have answered before in this workspace, call `cache_lookup` with the question
- If `hit` is true and `stale` is false, reuse the cached answer and note it came from cache
- If `stale` is true, the code changed since it was stored — verify before reusing
- After producing a reusable, self-contained answer (concept explanations, architecture summaries, how-to steps), call `cache_store`
- Use `scope: "durable"` for answers independent of current code state
- Do NOT cache answers about uncommitted or actively changing code

## Task-Type Routing

### Lightweight Tasks (use lighter model via /model)
- File navigation and search
- Simple rename/move operations
- Code formatting and linting fixes
- Boilerplate generation from templates
- Documentation lookups

### Full-Power Tasks (keep current model)
- Architectural decisions and system design
- Complex debugging with multi-file traces
- Security reviews and vulnerability analysis
- Performance optimization
- Multi-step refactoring across files

## Constraints
- Disable output compression during active debugging (need full stack traces)
- Disable verbosity control during architectural planning (need complete analysis)
- Never compress error messages or security warnings
- Re-index CodeGraph after significant code changes (new files, moved modules)

<!-- AI-TOKEN-OPTIMIZER:END -->
