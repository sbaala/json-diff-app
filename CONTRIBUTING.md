# Contributing to Freebies JSON Comparer

Thank you for your interest in contributing! This document provides guidelines and context for development.

## Development Setup

### Prerequisites

- **Node.js** 20+ (for frontend)
- **Python** 3.13+ (for backend)
- **uv** (Python package manager) - `pip install uv`
- **Docker** (optional, for containerized development)

### Clone & Setup

```bash
git clone <repository-url>
cd json-diff-app

# Backend setup
cd backend
uv sync --dev

# Frontend setup
cd ../frontend
npm install
```

### Running Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Code Structure Guide

### Frontend (`/frontend`)

| Directory | Purpose |
|-----------|---------|
| `src/lib/components/` | Reusable Svelte components |
| `src/lib/api.ts` | API client functions |
| `src/lib/types.ts` | TypeScript interfaces |
| `src/routes/` | SvelteKit pages and layouts |
| `src/app.css` | Global styles and theme variables |

### Backend (`/backend`)

| Directory | Purpose |
|-----------|---------|
| `app/main.py` | FastAPI app entry point |
| `app/models.py` | Pydantic request/response models |
| `app/routers/` | API route handlers |
| `app/services/` | Business logic (diff service) |
| `tests/` | pytest test files |

## Development Guidelines

### Svelte 5 Patterns

We use Svelte 5 with runes:

```svelte
<script lang="ts">
  // Props with $props()
  let { value, label }: Props = $props();

  // Reactive state with $state()
  let count = $state(0);

  // Derived values with $derived()
  let doubled = $derived(count * 2);
</script>
```

### TypeScript

- All frontend code should be TypeScript
- Define interfaces in `src/lib/types.ts`
- Use strict typing, avoid `any`

### CSS/Styling

- Use CSS variables from `app.css` for theming
- Component styles should be scoped (`<style>` in Svelte)
- Follow the dark theme color palette

```css
/* Use theme variables */
.my-component {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

### Python/FastAPI

- Use type hints everywhere
- Pydantic models for request/response validation
- Keep business logic in `services/`
- Routes should be thin handlers

```python
# Good: Type hints + Pydantic
async def compare_json(request: CompareRequest) -> CompareResponse:
    service = JsonDiffService(ignore_order=request.ignore_order)
    differences = service.compare(request.left_json, request.right_json)
    return CompareResponse(...)
```

## Testing

### Backend Tests

```bash
cd backend
uv run pytest -v                    # Run all tests
uv run pytest tests/test_api.py    # Run specific file
uv run pytest -k "test_compare"    # Run tests matching pattern
uv run pytest --cov=app            # With coverage
```

### Frontend Tests

```bash
cd frontend
npm run test:run                   # Run once
npm run test                       # Watch mode
```

### Writing Tests

**Backend (pytest):**
```python
def test_compare_equal_json(client, sample_json_equal):
    response = client.post("/api/v1/compare", json={
        "left_json": sample_json_equal["left"],
        "right_json": sample_json_equal["right"],
    })
    assert response.status_code == 200
    assert response.json()["is_equal"] is True
```

**Frontend (Vitest):**
```typescript
import { render, screen } from '@testing-library/svelte';
import MyComponent from './MyComponent.svelte';

it('should render correctly', () => {
  render(MyComponent, { props: { value: 'test' } });
  expect(screen.getByText('test')).toBeTruthy();
});
```

## Making Changes

### Adding a New Feature

1. **Backend changes:**
   - Add models to `app/models.py`
   - Add service logic to `app/services/`
   - Add route to `app/routers/`
   - Write tests in `tests/`

2. **Frontend changes:**
   - Add types to `src/lib/types.ts`
   - Add API calls to `src/lib/api.ts`
   - Create/update components in `src/lib/components/`
   - Write tests alongside components

### Theme Changes

Edit `frontend/src/app.css`:

```css
:root {
  /* Modify these for theme changes */
  --color-primary: #8b5cf6;
  --color-secondary: #06b6d4;
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  /* ... */
}
```

### API Changes

1. Update Pydantic models in `backend/app/models.py`
2. Update TypeScript types in `frontend/src/lib/types.ts`
3. Update API client in `frontend/src/lib/api.ts`

## Commit Guidelines

Use conventional commits:

```
feat: add array order ignore option
fix: resolve diff highlighting for nested objects
docs: update API documentation
test: add tests for statistics endpoint
style: format code with prettier
refactor: extract diff logic to service class
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run all tests (both frontend and backend)
4. Update documentation if needed
5. Submit PR with clear description

## Code Review Checklist

- [ ] Tests pass locally
- [ ] TypeScript has no errors
- [ ] Python type hints are complete
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] CSS uses theme variables
- [ ] No hardcoded colors/values

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase

---

Happy coding! 🎉
