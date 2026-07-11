# Freebies JSON Comparer - Frontend

SvelteKit frontend for JSON comparison tool.

## Features

- Side-by-side JSON editors with syntax highlighting
- Visual diff display with tree and list views
- Real-time JSON validation
- Format and minify JSON
- Statistics panel showing document metrics
- Responsive design

## Setup


```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Testing

```bash
# Run tests
npm run test

# Run tests once
npm run test:run
```

## Development

The frontend proxies API requests to `http://localhost:8000` during development. Make sure the backend is running.

## Project Structure

```
src/
├── lib/
│   ├── api.ts          # API client
│   ├── types.ts        # TypeScript types
│   └── components/     # Svelte components
│       ├── JsonEditor.svelte
│       ├── DiffViewer.svelte
│       ├── DiffNode.svelte
│       ├── DiffList.svelte
│       └── StatsPanel.svelte
├── routes/
│   ├── +layout.svelte  # App layout
│   └── +page.svelte    # Main page
├── app.css             # Global styles
└── app.html            # HTML template
```
