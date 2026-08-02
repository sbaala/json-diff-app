# VinMi brand assets in the frontend

Master kit lives at the repo root in [`vinmi-brand/`](../vinmi-brand) (regenerate
with `python3 vinmi-brand/build_icons.py`). The web-facing copies live here:

| Path | What it is |
| --- | --- |
| `static/favicon.ico` | Multi-resolution favicon (16–256) |
| `static/favicon.svg` | Fattened 16–32px favicon cut |
| `static/apple-touch-icon.png` | 180px full-bleed iOS icon |
| `static/site.webmanifest` | PWA manifest (icons point at `/brand/png/…`) |
| `static/brand/svg/*` | Vector masters — icon, glyph, wordmark, lockup |
| `static/brand/png/*` | Raster sizes, maskable icons, OG card |

All of the above are wired in `src/app.html` (favicons, manifest, theme colour,
`og:image` → `/brand/png/vinmi-og-1200x630.png`).

## Using the mark in the UI

Prefer the components over the static files — they are drawn inline, so the mark
picks up the active theme's `--color-primary` / `--color-secondary` instead of
being frozen at the brand's default indigo→cyan.

```svelte
import { BrandMark, BrandWordmark, BrandLockup, BrandBadge } from '$lib/components';

<BrandMark size={42} variant="tile" />   <!-- tile | plain | mono -->
<BrandWordmark height={22} />            <!-- drawn "VinMi", never typeset -->
<BrandLockup size="md" />                <!-- mark + wordmark + tagline -->
<BrandBadge />                           <!-- page-header tile, 38px -->
```

Where they appear: site header and footer (`src/routes/+layout.svelte`), home
hero and contact card, the leading badge of every tool page header, the tools
dashboard header, the spreadsheet toolbar and the flow builder header.

## Rules worth repeating

- Don't recolour the gradient by hand, rotate the mark, or retype the wordmark
  in a font. The node stays light and stays at the V's tip.
- Minimum sizes: tiled icon 16px, bare glyph 20px, wordmark 160px wide, full
  lockup 320px wide — drop the tagline instead of shrinking the lockup.
- On busy imagery use the mono variants (`variant="mono"`, `mono` prop).
