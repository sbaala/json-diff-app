<p align="center">
  <img src="media/icon.png" width="88" height="88" alt="VinMi" />
</p>

# VinMi JSON Utilities — VS Code Extension

Brings the VinMi toolkit's 12 full pages and 66 single-purpose tools (JSON,
text, date, JWT/security, API) into VS Code, seeded from whatever you have
open in the editor.

## How it reuses the web app

The extension does not reimplement any tool or page. `vite.config.mts` aliases
`$lib` to `../frontend/src/lib`, so the webview compiles the **same Svelte
components, services, registries, route pages, and `app.css` design tokens**
the web app ships. A tool or page added to the toolkit appears here on the next
build with no extension changes.

Two shims stand in for the pieces of SvelteKit the reused tree still touches:
`webview/shims/app-environment.ts` (for `$lib/stores/theme.ts`) and
`webview/shims/app-stores.ts` (for the `/visualize` page's `$page` read).

```
src/          extension host (Node)   — commands, panel, editor bridge
  extension.ts   command registration + tool/page quick pick
  panel.ts       webview lifecycle, CSP, tab icon, theme sync
  editor.ts      read/write the active editor
  protocol.ts    host ↔ webview message types
webview/      webview (browser)       — Svelte 5 UI
  App.svelte     dashboard shell + page/tool host
  pages.ts       catalog of the 12 full pages
  toolBridge.ts  seeds input / reads output across any tool or page layout
media/        VinMi brand assets      — marketplace icon, editor-tab icon
```

## Branding

The marketplace/Extensions-view icon is `media/icon.png` (the VinMi tile,
512px). The editor tab for an open panel uses `media/tab-icon-dark.svg` /
`tab-icon-light.svg` — the same mark tuned for dark vs. light chrome, swapped
automatically by VS Code as the editor theme changes. Both are copies of the
canonical assets in `frontend/static/brand/`; see `frontend/BRAND.md` for the
brand rules. To pick up a brand refresh, re-copy from there and repackage —
see **Updating** below.

## Commands

Command Palette entries, all under the **VinMi** category:

| Command | Opens |
| --- | --- |
| `VinMi: Run a Tool…` (`Cmd/Ctrl+Alt+J`) | Quick pick over all 12 pages + 66 tools |
| `VinMi: Open Tools Dashboard` | The dashboard, tool/page catalog |
| `VinMi: Format JSON` | Formatter page |
| `VinMi: View JSON Tree` | Tree Viewer page |
| `VinMi: Open Grid` | Grid page |
| `VinMi: Compare JSON with…` | Offline JSON Comparator tool (prompts for the second file) |
| `VinMi: Text Diff` | Text Diff page |
| `VinMi: Convert JSON to YAML / CSV / XML` | Convert page |
| `VinMi: Convert SQL INSERTs to JSON` | SQL Inserts page |
| `VinMi: Lint JSON` | Lint page |
| `VinMi: Render Structure Graph` | Graph page |
| `VinMi: Visualize as Charts` | Charts page |
| `VinMi: Open Flow Diagram` | Flow Diagram page |
| `VinMi: Open Spreadsheet` | Spreadsheet page |
| `VinMi: Validate JSON` | JSON Validator tool |

Also under **VinMi Tools** in the editor right-click menu — where the SQL
entry appears for `.sql` files — and (for Compare) the Explorer right-click
menu on `.json` files.

> **JSON Diff page vs. Compare command:** the `/compare` **page** (opened from
> the dashboard) calls the VinMi API and needs a connection. The `VinMi:
> Compare JSON with…` **command** opens the offline JSON Comparator tool
> instead, so diffing works with no network.

## Editor integration

- Opening a tool or page seeds it with the current selection, or the whole
  file when nothing is selected (`vinmiTools.loadSelectionOnOpen`).
- **Load from editor** re-reads the active editor into whatever is open.
- **Replace selection** writes the output back over the range it came from.
- **Open as new file** puts the output in a new untitled editor.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `vinmiTools.theme` | `auto` | `auto` follows VS Code's light/dark; or pin `midnight`, `daylight`, `slate`, `ocean`, `sandstone`. |
| `vinmiTools.loadSelectionOnOpen` | `true` | Seed input from the editor. |

## Develop

```bash
npm install
npm run build      # webview (vite) + extension host (esbuild)
npm run typecheck
```

Then press **F5** to launch an Extension Development Host.

> Requires the sibling `../frontend` checkout — it is the source of every tool
> and page.

## Updating the plugin

There is no marketplace listing yet, so "update" means rebuilding the `.vsix`
and reinstalling it — there's no auto-update path until it's published.

1. **Make your changes** — to `src/`, `webview/`, or upstream in `../frontend`
   (a tool, page, or brand asset). Nothing needs copying for `src`/`lib`
   changes; they're picked up by the `$lib` alias on the next build.
2. **Bump the version** in `package.json` (`"version"`) — VS Code treats a
   `.vsix` with an unchanged version as identical and may skip the reinstall.
   Follow semver: patch for fixes, minor for new tools/pages/commands, major
   for breaking settings/keybinding changes.
3. **Rebuild and repackage:**
   ```bash
   cd json_utilities_plugin
   npm run typecheck   # catches drift against ../frontend before you package
   npx vsce package
   ```
   This runs `vscode:prepublish` (webview + extension host build) automatically,
   then produces `vinmi-json-utilities-<version>.vsix`.
4. **Reinstall:**
   ```bash
   code --install-extension vinmi-json-utilities-<version>.vsix
   ```
   Add `--force` if you rebuilt without bumping the version. Reload any VS
   Code windows with a VinMi panel already open — a running Extension Host
   doesn't pick up a new `dist/` until it restarts.

**If you only touched brand assets** (a new mark, a palette change in
`frontend/static/brand/`): re-copy the three files into `media/` before
repackaging —
```bash
cp ../frontend/static/brand/png/vinmi-icon-512.png media/icon.png
cp ../frontend/static/brand/svg/vinmi-icon.svg media/tab-icon-dark.svg
cp ../frontend/static/brand/svg/vinmi-icon-light.svg media/tab-icon-light.svg
```
`media/` isn't generated by the build, so this step doesn't happen
automatically — skip it and the packaged icon goes stale even though the web
app's already updated.

**Publishing to the Marketplace** (once you're ready to stop distributing the
`.vsix` by hand) additionally needs a `publisher` you control on the [VS Code
Marketplace](https://marketplace.visualstudio.com/manage) and a Personal
Access Token, then `npx vsce publish` in place of `vsce package`. Not set up
yet — `publisher: "vinmi"` in `package.json` is a placeholder until that
publisher id is registered.
