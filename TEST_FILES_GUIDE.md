# Large JSON Test Files — Performance Testing Guide

Three production-ready test files have been generated for testing JSON Diff at scale.

---

## **📊 Test Files**

| File | Size | Type | Use Case |
|------|------|------|----------|
| `test-large-config.json` | **12 MB** | Nested config (300 services) | Config comparison baseline |
| `test-large-config-modified.json` | **12 MB** | Modified config (with changes) | Diff comparison test |
| `test-large-api.json` | **26 MB** | Array of 10,000 users | Large dataset performance |

**Total: 50 MB across all files** ✨

---

## **🎯 What Each File Contains**

### **test-large-config.json** (12 MB)
- 300 microservices configurations
- Each service has:
  - 80 API endpoints (path, method, timeout, auth, caching)
  - 150 environment variables
  - 8 database connections
  - Health check config
  - Metrics configuration
- Global config with:
  - 1,000 feature flags
  - 1,000 monitoring metrics
  - 500 logging outputs
  - 1,000 firewall rules
  - 200 TLS ciphers

**Perfect for:** Testing nested object comparison, performance on large configs

---

### **test-large-config-modified.json** (12 MB)
**Same structure as above, with intentional differences:**
- Version bumped (2.1.0 → 2.2.0)
- Some replicas changed
- Some services disabled
- 5 new services added
- 3 services removed
- Various config values modified

**Perfect for:** Comparing diffs, seeing what changed

---

### **test-large-api.json** (26 MB)
- 10,000 user objects, each with:
  - id, username, email
  - Profile (name, bio, avatar, location)
  - Account status and subscription
  - User preferences (notifications, theme, language)
  - Stats (posts, followers, engagement)
  - 20 recent activity records per user

**Perfect for:** Testing large array handling, performance on repetitive data

---

## **🔧 How to Test**

### **Test 1: Config Comparison (Nested Objects)**

```bash
# Open the app and compare:
# Left:  test-large-config.json
# Right: test-large-config-modified.json

# Expected:
# ✅ Should complete in <2-3 seconds
# ✅ Should show diffs clearly
# ✅ Should list changed services, new services, removed services
# ✅ UI should remain responsive while scrolling
```

---

### **Test 2: Massive Array Comparison (26 MB)**

```bash
# Open the app and load:
# Left:  test-large-api.json
# Right: test-large-api.json (same file)

# Expected (identical files):
# ✅ Should complete in <2-3 seconds
# ✅ Should show "0 differences"
# ✅ No hanging, smooth scrolling

# Then modify one file:
# sed -i '' 's/"username": "user_0"/"username": "updated_user_0"/' test-large-api-modified.json
# And compare again to see diff highlighting
```

---

### **Test 3: Performance Metrics**

Use these to benchmark your JSON Diff:

```bash
# Measure comparison time for config files:
time (curl -X POST http://localhost:8000/api/v1/compare \
  -H "Content-Type: application/json" \
  -d @payload.json)

# Where payload.json contains both JSONs
```

**Target metrics:**
- ⚡ Config comparison: <2 seconds
- ⚡ API response: <3 seconds  
- ⚡ UI response: Smooth 60fps scrolling
- ⚡ Memory usage: <500MB for 26MB JSON

---

## **📈 Stress Test Scenarios**

### **Scenario A: Small Diff, Large File**
```bash
# Compare 12MB config files with only 2-3 changes
# Expected: <2 seconds, easily scrollable results
```

### **Scenario B: Ignore Order**
```bash
# Load test-large-api.json for both left and right
# Reorder an array element randomly
# Use "Ignore Order" mode
# Expected: Should show 0 differences (order doesn't matter)
```

### **Scenario C: Deep Nesting**
```bash
# Load test-large-config files
# Drill into service-0000 → database_config → connections
# Expected: Should navigate smoothly, show specific diffs
```

### **Scenario D: Rapid Reload**
```bash
# Load the 26MB file
# Click compare
# Immediately scroll
# Click compare again while scrolling
# Expected: Should queue/cancel smoothly, no crashes
```

---

## **🎬 For Video Demo**

These files are **perfect for recording demo videos:**

```bash
# 1. Load test-large-config.json (12 MB)
# 2. Compare with test-large-config-modified.json
# 3. Show the speed: "Comparing 12MB config files... Done in 2 seconds!"
# 4. Scroll through results smoothly
# 5. Switch view modes (tree → side-by-side → flat list)
# 6. Highlight the responsiveness: "Even at 26MB, smooth scrolling"

# This demonstrates:
# ✅ No hanging (responsive UI)
# ✅ Fast (sub-2s comparison)
# ✅ Flexible (multiple view modes, ignore order)
```

---

## **📝 File Structure Reference**

### **Config File Structure**
```json
{
  "version": "2.1.0",
  "timestamp": "2024-09-13T19:30:00Z",
  "services": {
    "service-0000": {
      "enabled": true,
      "replicas": 5,
      "endpoints": {
        "endpoint-000": {
          "path": "/api/v1/...",
          "method": "GET",
          ...
        }
      },
      "environment_variables": {
        "VAR_0000": "value",
        ...
      },
      "database_config": {
        "connections": [
          {
            "name": "db-0",
            "host": "db0.example.com",
            ...
          }
        ]
      },
      ...
    },
    ... (300 services)
  },
  "global_config": {
    "features": { ... },
    "monitoring": { ... },
    "logging": { ... },
    "security": { ... }
  }
}
```

### **API File Structure**
```json
{
  "meta": {
    "status": "success",
    "timestamp": "2024-09-13T19:30:00Z",
    "request_id": "req-..."
  },
  "data": {
    "users": [
      {
        "id": "user-000000",
        "username": "user_0",
        "email": "user0@example.com",
        "profile": { ... },
        "account": { ... },
        "preferences": { ... },
        "stats": { ... },
        "recent_activity": [ ... ]
      },
      ... (10,000 users)
    ]
  }
}
```

---

## **⚙️ Generate Your Own Test Files**

Want to create custom test files? The script is in the project:

```python
# To regenerate:
python3 << 'EOF'
# [Python code from above script]
EOF
```

**Or customize parameters:**
- Services: Change `range(300)` to `range(500)` for 500 services
- Array size: Change `range(10000)` to `range(50000)` for 50K users
- Complexity: Add more nested fields

---

## **📊 Monitoring During Tests**

Open **Activity Monitor** to track:

```bash
# Terminal 1: Monitor CPU & Memory
top -o MEM

# Terminal 2: Monitor disk I/O
iostat -w 1

# Terminal 3: Monitor network (if testing API)
netstat -an | grep ESTABLISHED | wc -l
```

Expected during JSON Diff:
- CPU: Spike to 80–100% briefly
- Memory: Peak at <500MB for 26MB JSON
- Network: Low (depends on backend)

---

## **✅ Checklist: Ready to Test**

- [ ] All three test files present in project root
- [ ] Frontend dev server running (`npm run dev`)
- [ ] Backend API running (`uvicorn app.main:app --reload`)
- [ ] Browser DevTools open (Network tab)
- [ ] Activity Monitor running (optional, for metrics)

---

## **🚀 Quick Start**

1. **Load the app:** `localhost:5173`
2. **Upload test-large-config.json** to left pane
3. **Upload test-large-config-modified.json** to right pane
4. **Click Compare**
5. **Watch it complete in <2 seconds** ⚡

---

## **Questions?**

- **"Why 12MB and not 5MB?"** — 12MB is more realistic for production configs, better for performance testing
- **"Can I use different sizes?"** — Yes, split/duplicate files as needed with `head -c 5M` or `dd`
- **"Are these files compressed?"** — No, they're plain JSON. Add `.gz` compression if needed.
- **"How do I modify them?"** — Use `jq` (JSON query tool) or edit directly

```bash
# Extract just the services (no global config)
jq '.services' test-large-config.json > services-only.json

# Modify a value
jq '.version = "3.0.0"' test-large-config.json > modified.json

# Count keys
jq '.services | keys | length' test-large-config.json
```

---

**Test away! 🎯** These files will show whether your JSON Diff can handle real-world datasets without hanging or slowing down.
