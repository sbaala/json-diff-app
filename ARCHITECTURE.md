# Free-bies JSON TOOLS - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              SvelteKit Frontend (Port 5173/3000)           │ │
│  │                                                            │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │                  Navigation                         │   │ │
│  │  │   [Compare]     [Format]     [Viewer]               │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                           │                                │ │
│  │  ┌────────────┬───────────┴───────────┬────────────────┐  │ │
│  │  │            │                       │                │  │ │
│  │  ▼            ▼                       ▼                │  │ │
│  │ /compare    /format               /viewer              │  │ │
│  │ (Compare)   (Format)              (Viewer)             │  │ │
│  │                                                        │  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐             │  │ │
│  │  │DiffViewer│ │Formatter │ │JsonTreeNode│             │  │ │
│  │  │DiffList  │ │          │ │            │             │  │ │
│  │  │StatsPanel│ │          │ │            │             │  │ │
│  │  └──────────┘ └──────────┘ └────────────┘             │  │ │
│  │                       │                                │  │ │
│  │                 ┌─────▼─────┐                          │  │ │
│  │                 │  api.ts   │ HTTP Client              │  │ │
│  └─────────────────┴─────┬─────┴──────────────────────────┘  │ │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP (JSON)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy (Port 80)                │
│              Routes /api/* → Backend, /* → Frontend             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
┌─────────────────────┐             ┌─────────────────────┐
│  FastAPI Backend    │             │  SvelteKit SSR      │
│    (Port 8000)      │             │    (Port 3000)      │
│                     │             │                     │
│  ┌───────────────┐  │             │  Server-side        │
│  │  diff.py      │  │             │  rendering for      │
│  │  (Router)     │  │             │  initial page load  │
│  └───────┬───────┘  │             └─────────────────────┘
│          │          │
│  ┌───────▼───────┐  │
│  │ diff_service  │  │
│  │ (Polars DF)   │  │
│  └───────────────┘  │
└─────────────────────┘
```

## Data Flow

### 1. JSON Comparison Flow

```
User Input          Frontend              API                 Service
    │                  │                   │                     │
    │ Enter JSON       │                   │                     │
    ├─────────────────►│                   │                     │
    │                  │                   │                     │
    │ Click Compare    │                   │                     │
    ├─────────────────►│                   │                     │
    │                  │ POST /api/v1/compare                    │
    │                  ├──────────────────►│                     │
    │                  │                   │ JsonDiffService     │
    │                  │                   ├────────────────────►│
    │                  │                   │                     │
    │                  │                   │ Compare with Polars │
    │                  │                   │◄────────────────────┤
    │                  │                   │                     │
    │                  │ CompareResponse   │                     │
    │                  │◄──────────────────┤                     │
    │                  │                   │                     │
    │ Display Diff     │                   │                     │
    │◄─────────────────┤                   │                     │
    │                  │                   │                     │
```

### 2. Request/Response Models

```typescript
// CompareRequest (Frontend → Backend)
{
  left_json: object | array,    // First JSON document
  right_json: object | array,   // Second JSON document
  ignore_order?: boolean        // Ignore array order
}

// CompareResponse (Backend → Frontend)
{
  is_equal: boolean,           // Are JSONs identical?
  diff_count: number,          // Total differences
  added_count: number,         // New keys/values
  removed_count: number,       // Deleted keys/values
  modified_count: number,      // Changed values
  differences: DiffItem[],     // List of all differences
  left_tree: AnnotatedNode,    // Left JSON with annotations
  right_tree: AnnotatedNode    // Right JSON with annotations
}

// DiffItem
{
  path: string,                // JSONPath (e.g., "$.user.name")
  diff_type: 'added' | 'removed' | 'modified' | 'type_changed',
  left_value: any,
  right_value: any,
  left_type: string | null,
  right_type: string | null
}

// AnnotatedNode (for tree rendering)
{
  value: any,
  path: string,
  diff_type: string,
  children?: Record<string, AnnotatedNode> | AnnotatedNode[]
}
```

## Component Architecture

### Frontend Pages & Components

```
+layout.svelte (App Shell)
├── Navigation (Compare | Format | Viewer)
├── Header with branding
└── Footer

/routes/+page.svelte (Compare Page)
├── State Management
│   ├── leftJson, rightJson (input state)
│   ├── compareResult (API response)
│   └── UI state (loading, errors, tabs)
├── JsonEditor (×2 - left & right)
│   ├── Textarea with line numbers
│   ├── Format/Minify/Clear actions
│   └── Error display
├── DiffViewer (Tree View)
│   ├── Left Panel → DiffNode (recursive)
│   └── Right Panel → DiffNode (recursive)
├── DiffList (List View)
│   └── Flat list of all differences
└── StatsPanel (Sidebar)
    └── Difference breakdown

/routes/format/+page.svelte (Format Page)
├── Input textarea
├── Action buttons
│   ├── Format / Beautify
│   ├── Minify
│   ├── Sort Keys
│   ├── Escape JSON
│   └── Unescape JSON
├── Indent size selector
└── Output with line numbers

/routes/viewer/+page.svelte (Viewer Page)
├── Input panel
│   ├── JSON input textarea
│   └── View JSON button
├── Viewer panel
│   ├── Search box
│   ├── View toggle (Tree | Raw)
│   ├── Expand/Collapse all
│   ├── Stats bar (keys, depth, size)
│   └── JsonTreeNode (recursive)
│       ├── Expand/collapse toggle
│       ├── Key/value display
│       ├── Type badges
│       ├── Copy path/value buttons
│       └── Search highlighting
└── Download button
```

### Backend Services

```
app/main.py
├── FastAPI app initialization
├── CORS middleware configuration
└── Router registration

app/routers/diff.py
├── POST /api/v1/compare     → Compare two JSONs
├── POST /api/v1/statistics  → Get document stats
└── POST /api/v1/validate    → Validate JSON

app/services/diff_service.py
├── JsonDiffService class
│   ├── compare()           → Main entry point
│   ├── _compare_values()   → Type dispatch
│   ├── _compare_objects()  → Object diff (uses Polars)
│   └── _compare_arrays()   → Array diff
│
├── get_json_statistics()   → Document metrics
├── create_diff_dataframe() → Polars DataFrame for analysis
└── annotate_tree()         → Add diff markers to JSON tree
```

## Polars Integration

The backend uses Polars for efficient key comparison in objects:

```python
# In _compare_objects()
df = pl.DataFrame({
    "key": all_keys,
    "in_left": [k in left_keys for k in all_keys],
    "in_right": [k in right_keys for k in all_keys],
})

# Find removed keys
removed = df.filter(pl.col("in_left") & ~pl.col("in_right"))

# Find added keys  
added = df.filter(~pl.col("in_left") & pl.col("in_right"))

# Find common keys
common = df.filter(pl.col("in_left") & pl.col("in_right"))
```

## Theme System

CSS variables in `app.css` control the entire visual appearance:

```css
:root {
  /* Colors */
  --color-bg: #0f172a;           /* Page background */
  --color-surface: #1e293b;      /* Card/panel background */
  --color-primary: #8b5cf6;      /* Accent purple */
  --color-secondary: #06b6d4;    /* Accent teal */
  
  /* Diff highlighting */
  --color-added: #064e3b;        /* Added background */
  --color-removed: #4c0519;      /* Removed background */
  --color-modified: #422006;     /* Modified background */
  
  /* Effects */
  --gradient-primary: linear-gradient(135deg, #8b5cf6, #06b6d4);
  --shadow-glow: 0 0 20px rgba(139, 92, 246, 0.3);
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/compare` | Compare two JSON documents |
| POST | `/api/v1/statistics` | Get JSON document statistics |
| POST | `/api/v1/validate` | Validate JSON input |

## Error Handling

### Frontend
- JSON parse errors shown inline under editors
- API errors displayed as alerts
- Loading states during API calls

### Backend
- Pydantic validation for request bodies
- HTTPException for API errors
- Detailed error messages in responses

## Testing Strategy

### Backend (pytest)
- Unit tests for `JsonDiffService` methods
- API endpoint integration tests
- Fixtures for sample JSON data

### Frontend (Vitest)
- Component rendering tests
- API client mock tests
- User interaction tests

## Deployment Options

1. **Development**: `npm run dev` + `uvicorn --reload`
2. **Docker Dev**: `docker-compose -f docker-compose.dev.yml up`
3. **Production**: `docker-compose up --build`
