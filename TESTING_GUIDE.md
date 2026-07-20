# Spreadsheet Editor - Testing Guide

## Quick Start

### 1. Start the Dev Server
```bash
cd frontend
npm run dev
```
Navigate to: `http://localhost:5173/spreadsheet`

### 2. Create Test CSV Files

#### test-simple.csv
```csv
Name,Age,City
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago
```

#### test-data-types.csv
```csv
Name,Score,Pass,Note
Alice,95,true,Excellent
Bob,42,false,Needs improvement
Charlie,78,true,Good job
```

#### test-quoted-fields.csv
```csv
Company,Description,CEO
"Acme Corp","Makers of anvils and explosives","Wile E. Coyote"
"Tech Startup","Disrupting everything","Jane Doe"
```

---

## Testing Checklist

### Phase 1: Basic CSV Loading ✅

#### Test 1.1: Simple CSV Upload
- [ ] Create `test-simple.csv` (3 rows: 1 header + 2 data)
- [ ] Drag & drop file onto upload zone
- [ ] **Expected**: Grid appears with 3 rows
- [ ] **Verify**:
  - [ ] Headers display: Name, Age, City
  - [ ] Row 1: John, 30, New York
  - [ ] Row 2: Jane, 25, Los Angeles
  - [ ] Upload zone disappears

**Debugging if fails**:
```javascript
// In browser console
localStorage.getItem('spreadsheet_workbook')  // Check if data saved
```

#### Test 1.2: File Picker Upload
- [ ] Click "Choose File" button
- [ ] Select `test-simple.csv`
- [ ] **Expected**: Same result as 1.1

#### Test 1.3: CSV with Data Types
- [ ] Upload `test-data-types.csv`
- [ ] **Expected**:
  - [ ] Numbers appear right-aligned
  - [ ] Booleans show as true/false
  - [ ] Text is left-aligned

#### Test 1.4: CSV with Quoted Fields
- [ ] Upload `test-quoted-fields.csv`
- [ ] **Expected**:
  - [ ] Quotes are properly escaped
  - [ ] "Acme Corp" displays without extra quotes
  - [ ] Field with comma in description renders correctly

---

### Phase 2: Data Editing ✅

#### Test 2.1: Edit Cell Value
- [ ] Click on cell "John" (row 1, col 1)
- [ ] Change to "Johnny"
- [ ] Press Enter
- [ ] **Expected**:
  - [ ] Cell updates immediately
  - [ ] Auto-save indicator appears
  - [ ] Value persists after reload

**Test**:
```bash
# Open dev tools, look for "Saving..." notification
# Reload page with Cmd+R (Mac) or Ctrl+R (Windows)
```

#### Test 2.2: Insert Row
- [ ] Right-click on row number "2"
- [ ] Select "Insert row below"
- [ ] **Expected**: New empty row appears
- [ ] **Verify**: Existing rows shift down

#### Test 2.3: Insert Column
- [ ] Right-click on column header "D"
- [ ] Select "Insert column right"
- [ ] **Expected**: New empty column appears after City
- [ ] **Verify**: Existing columns stay in place

#### Test 2.4: Delete Row
- [ ] Right-click on row number "2"
- [ ] Select "Delete row"
- [ ] **Expected**: Row is removed
- [ ] **Verify**: Remaining rows shift up

#### Test 2.5: Delete Column
- [ ] Right-click on column header "A"
- [ ] Select "Delete column"
- [ ] **Expected**: Column removed
- [ ] **Verify**: Can't undo delete (limited feature)

---

### Phase 3: Undo/Redo ✅

#### Test 3.1: Undo Edit
- [ ] Edit a cell value
- [ ] Press Ctrl+Z (or Cmd+Z on Mac)
- [ ] **Expected**: Change is reverted

#### Test 3.2: Redo Edit
- [ ] After undo, press Ctrl+Y (or Cmd+Y on Mac)
- [ ] **Expected**: Change is restored

#### Test 3.3: Undo Insert Row
- [ ] Insert a row
- [ ] Press Ctrl+Z
- [ ] **Expected**: Row is removed

#### Test 3.4: Multiple Undos
- [ ] Make 5 edits
- [ ] Press Ctrl+Z five times
- [ ] **Expected**: All changes reverted in reverse order

---

### Phase 4: Multi-Sheet Support ✅

#### Test 4.1: Excel File with Multiple Sheets
- [ ] Create Excel file with 3 sheets:
  - Sheet1: 5 rows
  - Sheet2: 10 rows
  - Sheet3: 3 rows
- [ ] Upload to spreadsheet
- [ ] **Expected**:
  - [ ] All sheet tabs appear at bottom
  - [ ] Sheet1 is initially active
  - [ ] Sheet tabs show correct names

#### Test 4.2: Switch Between Sheets
- [ ] Click on "Sheet2" tab
- [ ] **Expected**:
  - [ ] Sheet2 data displays (10 rows)
  - [ ] Sheet2 tab is highlighted
  - [ ] Sheet1 tab is no longer highlighted

#### Test 4.3: Add New Sheet
- [ ] Click "+" button next to sheet tabs
- [ ] **Expected**: New empty sheet appears
- [ ] **Verify**: 
  - [ ] New sheet gets name "Sheet 4"
  - [ ] New sheet is active

#### Test 4.4: Rename Sheet
- [ ] Right-click on "Sheet 1" tab
- [ ] Click "Rename Sheet"
- [ ] Type "Employees"
- [ ] **Expected**: Tab name updates to "Employees"

#### Test 4.5: Delete Sheet
- [ ] Right-click on "Sheet 3" tab
- [ ] Click "Delete Sheet"
- [ ] **Expected**:
  - [ ] Sheet deleted
  - [ ] Remaining sheets still exist
  - [ ] Can't delete if only 1 sheet remains

---

### Phase 5: Formatting ✅

#### Test 5.1: Bold Text
- [ ] Select cells in row 1 (headers)
- [ ] Click Bold button (B) in toolbar
- [ ] **Expected**: Headers appear bold

#### Test 5.2: Italic Text
- [ ] Select a cell
- [ ] Click Italic button (I)
- [ ] **Expected**: Text appears italicized

#### Test 5.3: Text Color
- [ ] Select cells
- [ ] Click text color picker (A icon)
- [ ] Choose red
- [ ] **Expected**: Text turns red

#### Test 5.4: Background Color
- [ ] Select cells
- [ ] Click background color picker (■ icon)
- [ ] Choose yellow
- [ ] **Expected**: Cell background is yellow

#### Test 5.5: Formatting Persistence
- [ ] Format some cells
- [ ] Reload page
- [ ] **Expected**: Formatting persists

---

### Phase 6: Formulas ✅

#### Test 6.1: Simple Formula
- [ ] Create 3-column CSV: A (value1), B (value2), C (sum)
- [ ] In C1, type: `=A1+B1`
- [ ] Press Enter
- [ ] **Expected**: Result calculates immediately

#### Test 6.2: SUM Function
- [ ] In a new column, type: `=SUM(A1:A10)`
- [ ] **Expected**: Sum of A1 to A10 displays

#### Test 6.3: IF Function
- [ ] In a cell, type: `=IF(A1>50,"Pass","Fail")`
- [ ] **Expected**: Shows "Pass" or "Fail" based on value

#### Test 6.4: Formula Updates
- [ ] Change value in A1
- [ ] **Expected**: C1 formula result updates automatically

#### Test 6.5: Formula Persistence
- [ ] Create formula in sheet
- [ ] Reload page
- [ ] **Expected**: Formula still works

---

### Phase 7: Export ✅

#### Test 7.1: Export as CSV
- [ ] Click "Export" button
- [ ] Select "Export as CSV"
- [ ] **Expected**:
  - [ ] File downloads as `SheetName.csv`
  - [ ] File opens correctly in Excel

#### Test 7.2: Export as JSON
- [ ] Click "Export" button
- [ ] Select "Export as JSON"
- [ ] **Expected**:
  - [ ] File downloads as `SheetName.json`
  - [ ] JSON structure is valid

#### Test 7.3: Multi-Sheet Export
- [ ] Create workbook with 3 sheets
- [ ] Open export dialog
- [ ] **Expected**:
  - [ ] Option to "Export all sheets" appears
  - [ ] Can select which format to use

---

### Phase 8: Data Persistence ✅

#### Test 8.1: Auto-Save
- [ ] Edit a cell
- [ ] Wait 2-3 seconds
- [ ] **Expected**: "Auto-saved" notification appears

#### Test 8.2: Reload Persistence
- [ ] Create spreadsheet with data
- [ ] Edit multiple cells
- [ ] Reload page (Cmd+R / Ctrl+R)
- [ ] **Expected**:
  - [ ] Workbook still open
  - [ ] All data intact
  - [ ] Edits saved

#### Test 8.3: Browser Close/Reopen
- [ ] Create and edit spreadsheet
- [ ] Close browser tab
- [ ] Reopen spreadsheet page
- [ ] **Expected**:
  - [ ] Data still there
  - [ ] Full workbook restored

#### Test 8.4: Storage Quota
- [ ] Upload very large CSV (10MB+)
- [ ] **Expected**:
  - [ ] Warning at 3MB limit
  - [ ] Block at 5MB limit
  - [ ] Clear message about storage

---

### Phase 9: Edge Cases ⚠️

#### Test 9.1: Empty CSV
- [ ] Upload file with just headers
- [ ] **Expected**: Displays header row only

#### Test 9.2: Large File
- [ ] Upload CSV with 10,000+ rows
- [ ] **Expected**:
  - [ ] File loads (may take 1-2 seconds)
  - [ ] Scrolling works smoothly
  - [ ] No crashes

#### Test 9.3: Special Characters
- [ ] Include emoji, accents, symbols
- [ ] Upload and edit
- [ ] **Expected**: All characters display correctly

#### Test 9.4: Unicode/Non-ASCII
- [ ] Include Japanese, Arabic, Chinese text
- [ ] **Expected**: Displays and edits correctly

#### Test 9.5: Very Long Cell Values
- [ ] Add cell with 1000+ character string
- [ ] **Expected**: Cell expands to show content

---

### Phase 10: Keyboard Shortcuts ✅

#### Test 10.1: Ctrl+Z Undo
- [ ] Make edit
- [ ] Press Ctrl+Z
- [ ] **Expected**: Change reverts

#### Test 10.2: Ctrl+Y Redo
- [ ] After undo, press Ctrl+Y
- [ ] **Expected**: Change restored

#### Test 10.3: Ctrl+B Bold
- [ ] Select cells
- [ ] Press Ctrl+B
- [ ] **Expected**: Cells become bold

#### Test 10.4: Ctrl+I Italic
- [ ] Select cells
- [ ] Press Ctrl+I
- [ ] **Expected**: Cells become italic

#### Test 10.5: Ctrl+C Copy
- [ ] Select cells with Ctrl+C
- [ ] **Expected**: Cells copied to clipboard

#### Test 10.6: Ctrl+V Paste
- [ ] Copy cells with Ctrl+C
- [ ] Click another cell
- [ ] Press Ctrl+V
- [ ] **Expected**: Cells pasted

---

## Debugging Guide

### Issue: Empty Sheet After Upload

**Check these**:
```javascript
// 1. Verify file was parsed
console.log('Spreadsheet state:', localStorage.getItem('spreadsheet_workbook'));

// 2. Check for errors in console
console.error() // Look for any red errors

// 3. Verify active sheet
localStorage.getItem('active_sheet_id')

// 4. Check data array
const state = JSON.parse(localStorage.getItem('spreadsheet_workbook'));
console.log('Sheets:', state.workbook.sheets);
console.log('Data length:', state.workbook.sheets[0].data.length);
```

### Issue: Data Not Saving

**Check these**:
```javascript
// 1. Verify auto-save is working
// Look for "Saving..." indicator in UI

// 2. Check localStorage quota
navigator.storage?.estimate().then(est => {
  console.log('Used:', est.usage, 'Available:', est.quota);
});

// 3. Verify storage service
// Should save within 2 seconds of edit
```

### Issue: Formulas Not Calculating

**Check these**:
```javascript
// 1. Verify formula starts with =
// Formula should start with = character

// 2. Check cell references exist
// Reference cells must have values

// 3. Look for formula errors
// Handsontable shows errors in cell
```

### Issue: Performance Slow

**Check these**:
1. File size (consider splitting large files)
2. Number of formulas (complex formulas = slower)
3. Browser memory (check DevTools)
4. Storage space (clear old workbooks)

---

## Test Results Template

```markdown
## Test Results - [Date]

### Setup
- Node Version: [npm -v]
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]

### CSV Loading
- [ ] Simple CSV: PASS/FAIL
- [ ] Multi-sheet Excel: PASS/FAIL
- [ ] Large file: PASS/FAIL

### Data Editing
- [ ] Edit cell: PASS/FAIL
- [ ] Insert/delete row: PASS/FAIL
- [ ] Insert/delete column: PASS/FAIL

### Features
- [ ] Undo/Redo: PASS/FAIL
- [ ] Formatting: PASS/FAIL
- [ ] Formulas: PASS/FAIL
- [ ] Export: PASS/FAIL

### Persistence
- [ ] Auto-save: PASS/FAIL
- [ ] Reload: PASS/FAIL

### Issues Found
1. [Issue description]
   - Steps to reproduce
   - Expected vs actual
   - Screenshots if applicable

### Recommendations
- [Future improvement]
```

---

## Performance Benchmarks

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| File upload | <1s | <2s |
| Cell edit | Instant | <100ms |
| 100 cell edit | <500ms | <1s |
| Formula calc | <50ms | <200ms |
| Sheet switch | <100ms | <300ms |
| Undo | Instant | <50ms |
| Reload page | <2s | <5s |

---

## Browser Support Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (14+)
- [ ] Edge (latest)
- [ ] Mobile Safari (iPad/iOS)
- [ ] Chrome Mobile (Android)

---

**Created**: 2026-07-20  
**Status**: Ready for Testing  
**Owner**: QA Team
