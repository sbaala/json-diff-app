# Excel/CSV Spreadsheet Editor - Implementation Guide

## Overview

The new spreadsheet editor at `/spreadsheet` provides full-featured Excel/CSV viewing and editing capabilities with auto-save to browser storage.

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access Spreadsheet Editor

Navigate to: `http://localhost:5173/spreadsheet`

## Features Implemented

### Phase 1: Foundation ✅
- [x] Handsontable + HyperFormula integration
- [x] Svelte store for workbook state management
- [x] localStorage auto-save (2-second debounce)
- [x] Multi-sheet tab support
- [x] Undo/redo functionality

### Phase 2: Core Editing ✅
- [x] File upload (drag-drop, file picker, paste)
- [x] CSV parsing and import
- [x] JSON import (arrays and objects)
- [x] Excel (.xlsx/.xls) import with multi-sheet detection
- [x] Sheet management (add, rename, delete sheets)
- [x] Cell editing with auto-save
- [x] Row/column insert/delete (right-click context menu)
- [x] Full undo/redo with keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
- [x] Export to CSV and JSON formats

### Phase 3: Advanced Features (In Progress)
- [ ] Cell formatting UI (bold, italic, colors, alignment)
- [ ] Excel formulas with HyperFormula
- [ ] Merged cells support
- [ ] Column hiding/showing
- [ ] Export to XLSX format
- [ ] Performance optimizations

## Architecture

```
frontend/src/
├── lib/
│   ├── components/spreadsheet/
│   │   ├── SpreadsheetEditor.svelte       # Main component
│   │   ├── SheetTabs.svelte              # Sheet tab management
│   │   ├── SpreadsheetToolbar.svelte     # Toolbar with buttons
│   │   ├── FileUploadZone.svelte         # File upload UI
│   │   └── ExportDialog.svelte           # Export options
│   ├── services/
│   │   ├── spreadsheet.service.ts        # Config & utilities
│   │   ├── spreadsheet-storage.service.ts # localStorage persistence
│   │   ├── spreadsheet-formatter.service.ts # Cell formatting
│   │   └── file-import.service.ts        # CSV/JSON/Excel import
│   ├── stores/
│   │   └── spreadsheet.store.ts          # Svelte store (workbook state)
│   └── spreadsheet.css                   # Handsontable theme
└── routes/
    └── spreadsheet/
        └── +page.svelte                  # Route wrapper
```

## Usage Guide

### Uploading Files

1. **Drag & Drop**: Drag CSV, JSON, or Excel files onto the upload zone
2. **File Picker**: Click "Choose File" button
3. **Paste**: Paste CSV data directly (Ctrl+V)

**Supported Formats**:
- CSV files (.csv)
- JSON files (.json) - arrays or objects
- Excel files (.xlsx, .xls) - with automatic sheet detection

### Editing Data

1. **Click cells** to edit directly
2. **Right-click rows/columns** for context menu:
   - Insert row above/below
   - Delete row
   - Insert column left/right
   - Delete column
3. **Undo/Redo**: Use toolbar buttons or Ctrl+Z / Ctrl+Shift+Z

### Sheet Management

1. **Add Sheet**: Click "+" button in sheet tabs
2. **Rename Sheet**: Right-click tab → "Rename Sheet"
3. **Delete Sheet**: Right-click tab → "Delete Sheet" (if multiple sheets exist)
4. **Switch Sheets**: Click any sheet tab

### Exporting Data

1. Click "Export" button in toolbar
2. Choose format:
   - **CSV**: Plain text format, opens in Excel/Sheets
   - **JSON**: Structured format with headers as keys
   - **XLSX**: (Planned) Full Excel format

### Data Persistence

- **Auto-save**: All changes auto-save to browser localStorage every 2 seconds
- **Reload Safe**: Reloading the page preserves your work
- **Size Limit**: 5MB per workbook (warns at 3MB)
- **Storage**: Data stays local to your browser

## Dependencies

```json
{
  "handsontable": "^14.1.0",    // Spreadsheet engine
  "hyperformula": "^2.6.0",     // Formula calculation
  "xlsx": "^0.18.5"             // Excel parsing
}
```

## API Reference

### SpreadsheetStorageService

```typescript
// Load all workbooks from storage
const workbooks = spreadsheetStorageService.loadWorkbooks();

// Load specific workbook
const workbook = spreadsheetStorageService.loadWorkbook(id);

// Save workbook to storage
const success = spreadsheetStorageService.saveWorkbook(workbook);

// Delete workbook
spreadsheetStorageService.deleteWorkbook(id);

// Auto-save with debounce (2 seconds)
spreadsheetStorageService.autoSave(workbook, (success) => {
  console.log('Auto-save result:', success);
});

// Check storage usage
const { used, percentage } = spreadsheetStorageService.getStorageUsage();
```

### FileImportService

```typescript
// Import file (auto-detects format)
const result = await fileImportService.importFile(file);
if (result.error) {
  console.error(result.error);
} else {
  // result.sheets contains imported sheets
  // result.workbookName is the workbook name
}

// Import from text (CSV/JSON)
const result = await fileImportService.importFromText(text, 'csv');
```

### SpreadsheetStore

```typescript
// Initialize new workbook
spreadsheetStore.initWorkbook('My Workbook');

// Load existing workbook
spreadsheetStore.loadWorkbook(workbook);

// Sheet operations
spreadsheetStore.addSheet('New Sheet');
spreadsheetStore.renameSheet(sheetId, 'Renamed');
spreadsheetStore.deleteSheet(sheetId);
spreadsheetStore.setActiveSheet(sheetId);

// Update data
spreadsheetStore.updateSheetData(sheetId, data);
spreadsheetStore.updateSheetSettings(sheetId, { formulas: {...} });

// Workbook operations
spreadsheetStore.renameWorkbook('New Name');
spreadsheetStore.reset();
```

## Troubleshooting

### File Won't Upload
- Check file format (CSV, JSON, XLSX, XLS only)
- Check file size (should be under 10MB)
- Open browser console for error details

### Data Not Saving
- Check browser localStorage is enabled
- Check available storage space (quota: 50MB typical)
- Reload page to verify persistence

### Formulas Not Calculating
- Formulas are parsed but may not calculate until formula support is enabled
- Currently formulas show as text
- Formula evaluation will be added in Phase 3

### Handsontable Not Rendering
- Ensure CSS imports are working
- Check browser console for errors
- Verify `npm install` completed successfully

## Performance Tips

1. **Large Files**: Keep spreadsheets under 50MB
2. **Many Sheets**: Limit to 20-30 sheets per workbook
3. **Complex Formulas**: Will be optimized in Phase 3
4. **Auto-save**: Default 2-second debounce, adjust if needed

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (14+)
- Mobile browsers: ⚠️ Limited (no touch support yet)

## Next Steps (Phase 3)

- [ ] Cell formatting UI (colors, fonts, alignment)
- [ ] Formula support with real-time calculation
- [ ] Merged cells
- [ ] Column width persistence
- [ ] Export to XLSX (currently exports as CSV)
- [ ] Keyboard shortcuts guide
- [ ] Mobile optimization
- [ ] Collaborative editing (future)

## Testing Checklist

- [ ] Upload CSV file
- [ ] Upload Excel file with multiple sheets
- [ ] Edit cells and verify auto-save
- [ ] Add/delete rows and columns
- [ ] Rename and delete sheets
- [ ] Export to CSV and JSON
- [ ] Undo/redo operations
- [ ] Paste CSV data
- [ ] Reload page and verify data persists
- [ ] Test with dark/light theme toggle

## Known Limitations

1. **XLSX Export**: Currently exports as CSV (full XLSX support planned for Phase 3)
2. **Formulas**: Parse but don't calculate yet (HyperFormula integration in progress)
3. **Large Files**: May be slow loading files >10MB (optimize pending)
4. **Touch Support**: Mobile devices not yet optimized
5. **Concurrent Edits**: Single-user only (no sync across tabs)

## Contributing

When adding new features:
1. Follow existing component structure
2. Update types in `spreadsheet.store.ts`
3. Add localStorage migrations in `spreadsheet-storage.service.ts`
4. Test with sample data files
5. Update this guide

---

**Last Updated**: 2026-07-20
**Status**: Phase 2 Complete, Phase 3 In Progress
