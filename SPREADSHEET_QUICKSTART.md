# Spreadsheet Editor - Quick Start Guide

## Getting Started

### 1. Access the Spreadsheet Editor
Navigate to: `http://localhost:5173/spreadsheet`

### 2. Load Your Data
Choose one of these options:
- **Drag & Drop**: Drag CSV, JSON, or Excel file onto the upload area
- **File Picker**: Click "Choose File" button
- **Paste Data**: Paste CSV text (Ctrl+V)
- **Start Empty**: Click "+" in sheet tabs to start fresh

### 3. Start Editing
- Click cells to edit
- Enter formulas starting with `=`
- Right-click for advanced options
- Auto-saves every 2 seconds to browser storage

---

## Features at a Glance

| Feature | How to Use |
|---------|-----------|
| **Edit Cell** | Click cell, type, press Enter |
| **Add Row** | Right-click row number → "Insert row below" |
| **Add Column** | Right-click column letter → "Insert column right" |
| **Delete Row** | Right-click row number → "Delete row" |
| **Delete Column** | Right-click column letter → "Delete column" |
| **Bold Text** | Select cells, click **B** or Ctrl+B |
| **Italic Text** | Select cells, click *I* or Ctrl+I |
| **Text Color** | Click "A" color picker, choose color |
| **Background Color** | Click "■" color picker, choose color |
| **Merge Cells** | Select range, click "Merge" button |
| **Unmerge Cells** | Click merged cell, click "Unmerge" |
| **Hide Column** | Right-click column → "Hide column" |
| **Show All Columns** | Right-click column → "Show all columns" |
| **Resize Column** | Drag column border left/right |
| **Add Sheet** | Click "+" in sheet tabs |
| **Rename Sheet** | Right-click tab → "Rename Sheet" |
| **Delete Sheet** | Right-click tab → "Delete Sheet" (need 2+ sheets) |
| **Undo** | Click ↶ or Ctrl+Z |
| **Redo** | Click ↷ or Ctrl+Y |
| **Export CSV** | Click "Export" → "Export as CSV" |
| **Export JSON** | Click "Export" → "Export as JSON" |

---

## Formulas Quick Reference

### Basic Math
```
=2+2           → 4
=A1+B1         → sum of cells A1 and B1
=A1*B1         → multiply
=A1/B1         → divide
=A1^2          → square
```

### Common Functions
```
=SUM(A1:A10)           → add range A1 through A10
=AVERAGE(A1:A10)       → average of range
=COUNT(A1:A10)         → count cells with numbers
=MIN(A1:A10)           → minimum value
=MAX(A1:A10)           → maximum value
=LEN(A1)               → length of text
=UPPER(A1)             → convert to uppercase
=LOWER(A1)             → convert to lowercase
```

### Conditional Logic
```
=IF(A1>10,"Yes","No")                    → if A1 greater than 10, show "Yes", else "No"
=IF(AND(A1>5, B1<20),"Pass","Fail")     → multiple conditions with AND
=IF(OR(A1=1, A1=2),"Match","No Match")  → OR for either condition
```

### Text Operations
```
=CONCAT(A1,B1)         → combine text from cells
=CONCATENATE(A1," - ",B1) → same as CONCAT
=TRIM(A1)              → remove extra spaces
=SUBSTITUTE(A1,"old","new") → find and replace
```

### Examples
```
A1: 100
B1: 200
C1: =A1+B1            → 300
D1: =IF(C1>250,"High","Low")  → "High"
E1: =UPPER("hello")   → "HELLO"
```

---

## Keyboard Shortcuts

### Editing
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo last action |
| `Ctrl+Y` | Redo last undo |
| `Ctrl+B` | Make text bold |
| `Ctrl+I` | Make text italic |
| `Ctrl+C` | Copy selection |
| `Ctrl+X` | Cut selection |
| `Ctrl+V` | Paste |
| `Enter` | Confirm cell edit and move down |
| `Tab` | Move to next cell |
| `Shift+Tab` | Move to previous cell |
| `Esc` | Cancel edit |

### Mac Users
Replace `Ctrl` with `Cmd` for all shortcuts:
- `Cmd+Z` instead of `Ctrl+Z`
- `Cmd+B` instead of `Ctrl+B`
- etc.

---

## File Formats

### CSV (Comma-Separated Values)
Best for: Excel, Google Sheets, data analysis
```
Name,Age,City
John,30,New York
Jane,25,Los Angeles
```

### JSON (JavaScript Object Notation)
Best for: Web development, APIs, data processing
```json
[
  {"Name": "John", "Age": 30, "City": "New York"},
  {"Name": "Jane", "Age": 25, "City": "Los Angeles"}
]
```

### Excel (XLSX)
Best for: Full features, formatting, charts (coming soon)

---

## Tips & Tricks

### 1. **Bulk Edit Multiple Cells**
Select multiple cells → Apply formatting → All selected cells update together

### 2. **Copy Formulas**
Copy a cell with formula → Paste to other cells → References auto-adjust

Example:
```
A1: 10
B1: =A1*2  (result: 20)
Copy B1 → Paste to B2  (becomes =A2*2)
```

### 3. **Use Cell References in Formulas**
Instead of typing numbers, reference cells:
```
Bad:  =10+20
Good: =A1+B1  (more flexible if values change)
```

### 4. **Quick Resize**
Double-click column border to auto-fit width to content

### 5. **Select All**
Click top-left corner (above row numbers, left of column letters) to select entire sheet

### 6. **Export for Sharing**
Export as CSV to share with anyone who uses Excel or Google Sheets

---

## Common Tasks

### Task: Create a Budget Spreadsheet
```
1. Add column headers: "Category", "Budget", "Actual", "Difference"
2. Add your expense categories in column A
3. Enter budgeted amounts in column B
4. Enter actual spending in column C
5. Formula in D: =C2-B2  (copy down for all rows)
6. Total row: =SUM(D2:D10)
```

### Task: Calculate Sales Commission
```
A: Salesperson names
B: Sales amount
C: Commission rate (e.g., 0.1 for 10%)
D: Commission = B*C  (formula: =B2*C2)
```

### Task: Grade Student Scores
```
A: Student names
B: Test score
C: Grade with formula:
   =IF(B2>=90,"A",IF(B2>=80,"B",IF(B2>=70,"C","F")))
```

### Task: Create Invoice
```
Row headers: Item | Quantity | Unit Price | Total
Column D: Total = B*C  (formula: =B2*C2)
Bottom: Grand Total = SUM(D:D)
```

---

## Data Persistence

### Auto-Save
✅ Every edit automatically saves to your browser  
✅ Works offline  
✅ Data persists after closing browser  

### Storage Limit
- Maximum: 5MB per spreadsheet
- Warning: Shows at 3MB
- Tip: Export large files to keep storage clean

### Clear Storage
To delete all saved spreadsheets from your browser:
1. Open browser settings
2. Clear site data for this website
3. Confirm deletion

---

## Troubleshooting

### "Data Won't Save"
→ Check if auto-save message appears (lower right)  
→ Try exporting as backup
→ Check browser storage settings

### "Formula Shows as Text"
→ Make sure formula starts with `=`
→ Check formula syntax (no spaces before =)
→ Look for formula errors in cell

### "Can't Paste Data"
→ Make sure data is copied (Ctrl+C)
→ Click target cell first
→ Use Ctrl+V to paste
→ Try Paste Special if issues persist

### "Merged Cells Not Working"
→ Select rectangular range (not scattered cells)
→ Try unmerging first, then remerge
→ Check no cells already merged in selection

### "Column Too Narrow"
→ Position mouse on column border
→ Drag right to widen
→ Double-click to auto-fit

---

## Export Checklist

Before exporting:
- [ ] Review all data is correct
- [ ] Check formulas calculate properly
- [ ] Verify formatting looks good
- [ ] Hide any unnecessary columns
- [ ] All sheets contain needed data

When exporting:
1. Click "Export" button
2. Choose format:
   - CSV: For Excel/Sheets/data analysis
   - JSON: For web development/APIs
   - XLSX: Coming soon!
3. Click "Export as [FORMAT]"
4. File downloads to computer

---

## Need Help?

| Issue | Solution |
|-------|----------|
| Lost my data | Check if auto-saved to browser storage (reload page) |
| Accidentally deleted | Use Undo (Ctrl+Z) |
| File too large | Split into multiple sheets |
| Formulas too complex | Break into smaller steps |
| Performance slow | Hide unused columns, reduce sheet size |

---

## What's Coming Next?

- 🎨 More formatting options (alignment, borders, fonts)
- 📊 Charts and graphs
- 🔗 Links between sheets
- 💾 Direct cloud save
- 📱 Mobile optimization
- 🤝 Shared editing
- 📝 Comments on cells

---

**Last Updated**: 2026-07-20  
**Spreadsheet Version**: Phase 3 (Advanced Features)

Happy spreadsheeting! 📊
