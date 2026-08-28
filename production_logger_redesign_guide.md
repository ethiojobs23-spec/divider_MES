# 🏭 Production Logger Redesign — LOCKED FINAL Guide (v5)

> **Status:** 🔒 All details confirmed — Implementation begins now.

---

## 1. All 5 Worker Categories — Final Confirmed

| Code | Display Label | Type | Placement | Size | Qty Fields |
|---|---|---|---|---|---|
| `MFG` | Manufacturing | ✅ (50,40,30,16,12,45,other) | ✅ (ብተና, ውስጥ, other) | ✅ (9cm, 7cm) | Good + Waste |
| `PP` | Paper Placement | ✅ (50,40,30,16,12,45,other) | ❌ Not used | ✅ (9cm, 7cm) | Qty only |
| `PL` | Plaster Placement | ✅ (50,40,30,16,12,45,other) | ❌ Not used | ✅ (9cm, 7cm) | Qty only |
| `C` | Wood Preparation | ✅ (50,40,30,16,12,45,other) | ✅ (ብተና, ውስጥ, other) | ✅ (9cm, 7cm) | Qty only |
| `TIME` | Hourly Work | ❌ Not used | ❌ Not used | ❌ Not used | Hours |

### Key Confirmed Points
- ✅ **C (Wood Preparation)** uses Type + Placement + Size — same dimensions as MFG
- ✅ **PP and PL** do NOT use placement style
- ✅ **"Other"** is a special admin-configurable slot for both Divider Types and Placements
- ✅ All entries are **entry-by-entry** (not end-of-shift batch)

---

## 2. The "Other" Feature — Admin-Configurable Custom Slots

The PDF's "other" column is a flexible slot for work that falls outside the standard divider types (50, 40, 30, 16, 12, 45) or standard placements (ብተና, ውስጥ).

### How "Other" Works

**Admin configures "Other" in Admin Settings:**
```
┌─────────────────────────────────────────────────────────┐
│  Custom "Other" Divider Type                            │
│  Label:  [ Special Cut        ]  (text box)             │
│  Enabled: [✓]                                           │
│                                                         │
│  Rates for "Other" Divider Type:                        │
│  MFG:  9cm: [X.XX]  7cm: [X.XX]  (per placement)      │
│  PP:   9cm: [X.XX]  7cm: [X.XX]                        │
│  PL:   9cm: [X.XX]  7cm: [X.XX]                        │
│  C:    9cm: [X.XX]  7cm: [X.XX]  (per placement)       │
├─────────────────────────────────────────────────────────┤
│  Custom "Other" Placement Style                         │
│  Label:  [ Outside Frame      ]  (text box)             │
│  Enabled: [✓]                                           │
│  Rate for "Other" Placement (MFG & C):                  │
│  Per type+size → same rate grid as ብተና/ውስጥ above      │
└─────────────────────────────────────────────────────────┘
```

**On the Production Logger for workers:**
- The "Other" button appears in the Divider Type toggle group (if admin enabled it)
- The "Other" button appears in the Placement toggle group for MFG and C workers (if enabled)
- It shows the admin's custom label in the summary card and toast

### Storage
Stored in `systemConfig` (already in mesStore) under:
```js
systemConfig.value.otherDividerType = {
  enabled: true,
  label: 'Special Cut'
}
systemConfig.value.otherPlacement = {
  enabled: true,
  label: 'Outside Frame'
}
```
Rates stored in the same `pieceRates` object under the key `'other'`:
```js
pieceRates.MFG['other'] = { '9cm': { 'ብተና': 0, 'ውስጥ': 0, 'other': 0 }, '7cm': { ... } }
pieceRates.PP['other']  = { '9cm': 0, '7cm': 0 }
// etc.
```

---

## 3. Piece Rate Tables — Complete Structure

```js
pieceRates = {
  MFG: {
    // [type][size][placement]
    '50': { '9cm': { 'ብተና': 2.50, 'ውስጥ': 3.00, 'other': 0 },
            '7cm': { 'ብተና': 2.00, 'ውስጥ': 2.50, 'other': 0 } },
    '40': { ... }, '30': { ... }, '16': { ... },
    '12': { ... }, '45': { ... }, 'other': { ... }
  },
  PP: {
    // [type][size]  — no placement
    '50': { '9cm': 0, '7cm': 0 },
    '40': { '9cm': 0, '7cm': 0 },
    '30': { '9cm': 0, '7cm': 0 },
    '16': { '9cm': 0, '7cm': 0 },
    '12': { '9cm': 0, '7cm': 0 },
    '45': { '9cm': 0, '7cm': 0 },
    'other': { '9cm': 0, '7cm': 0 }
  },
  PL: {
    // [type][size]  — no placement (same structure as PP)
    '50': { '9cm': 0, '7cm': 0 }, ...
  },
  C: {
    // [type][size][placement]  — same structure as MFG
    '50': { '9cm': { 'ብተና': 0, 'ውስጥ': 0, 'other': 0 },
            '7cm': { 'ብተና': 0, 'ውስጥ': 0, 'other': 0 } },
    '40': { ... }, '30': { ... }, '16': { ... },
    '12': { ... }, '45': { ... }, 'other': { ... }
  }
}
```

### Rate Lookup Logic by Category
```js
function getRate(category, type, size, placement) {
  if (category === 'MFG' || category === 'C') {
    return pieceRates[category]?.[type]?.[size]?.[placement] ?? 0
  }
  if (category === 'PP' || category === 'PL') {
    return pieceRates[category]?.[type]?.[size] ?? 0
  }
  if (category === 'TIME') {
    return operatorConfig.hourlyRate ?? 0   // per hour, not per piece
  }
  return 0
}
```

---

## 4. Data Structure Per Entry Type

### MFG
```js
{ work_category: 'MFG', divider_type: '50', placement_style: 'ብተና',
  size_cm: 9, qty_produced: 120, qty_waste: 3, hours_worked: null }
```

### PP
```js
{ work_category: 'PP', divider_type: '50', placement_style: null,
  size_cm: 9, qty_produced: 85, qty_waste: 0, hours_worked: null }
```

### PL
```js
{ work_category: 'PL', divider_type: '50', placement_style: null,
  size_cm: 9, qty_produced: 72, qty_waste: 0, hours_worked: null }
```

### C — Wood Preparation
```js
{ work_category: 'C', divider_type: '50', placement_style: 'ብተና',
  size_cm: 9, qty_produced: 60, qty_waste: 0, hours_worked: null }
```

### TIME
```js
{ work_category: 'TIME', divider_type: null, placement_style: null,
  size_cm: null, qty_produced: 0, qty_waste: 0, hours_worked: 4.5 }
```

---

## 5. Dynamic UI Forms — Per Category

### MFG Form
```
SIDEBAR                          MAIN
────────────────────────────     ──────────────────────────────────
Divider Type                     [✓ Good Production]  [🗑 Waste]
  [50] [40] [30] [16] [12] [45]
  [other*]  ← shows if admin      Good: 0   Waste: 0
             enabled + label
                                  [Virtual Numpad]
Placement
  [ብተና] [ውስጥ]
  [other*]  ← shows label          [SAVE TO LEDGER — ETB X.XX]

Size
  [9cm]  [7cm]

Summary Card
  50 · ብተና · 9cm · ETB 2.50/pc
  Today: 3 entries · ETB 300.00
```

### PP Form (Paper Placement)
```
SIDEBAR                          MAIN
────────────────────────────     ──────────────────────────────────
Divider Type                     "Papers Applied (pcs)"
  [50] [40] [30] [16] [12] [45]
  [other*]                        [Virtual Numpad]

Size
  [9cm]  [7cm]
                                  [SAVE — ETB X.XX]
[ NO Placement row ]

Summary Card
  50 · 9cm · ETB X.XX/pc
  Today: 2 entries · ETB X.XX
```

### PL Form (Plaster Placement)
> Identical to PP, but:
> - Label: "Plaster Keys Placed (pcs)"
> - Rates from `pieceRates.PL`
> - `work_category: 'PL'`

### C Form (Wood Preparation)
```
SIDEBAR                          MAIN
────────────────────────────     ──────────────────────────────────
Divider Type                     "Units Completed (pcs)"
  [50] [40] [30] [16] [12] [45]
  [other*]                        [Virtual Numpad]

Placement
  [ብተና] [ውስጥ]                    [SAVE — ETB X.XX]
  [other*]

Size
  [9cm]  [7cm]

Summary Card
  50 · ብተና · 9cm · ETB X.XX/pc
  Today: 1 entry · ETB X.XX
```

### TIME Form (Hourly)
```
MAIN
──────────────────────────────────────────────────
  Your Rate: ETB [hourly_rate] / hour

  Hours this entry:
  [ −0.5 ]   [ 4.0 hrs ]   [ +0.5 ]
  (or custom via numpad)

  Running total today: 6.5 hrs → ETB X.XX

  [SAVE HOURS]
```

---

## 6. Operator Work Config JSON (Admin Assigns)

```json
// MFG worker — types 50 & 40, placements ብተና & ውስጥ, both sizes
{
  "work_types": {
    "categories": ["MFG"],
    "divider_types": ["50", "40"],
    "placements": ["ብተና", "ውስጥ"],
    "sizes": ["9cm", "7cm"],
    "hourly_rate": null
  }
}

// PP worker — types 50, 40, 30, both sizes
{
  "work_types": {
    "categories": ["PP"],
    "divider_types": ["50", "40", "30"],
    "placements": [],
    "sizes": ["9cm", "7cm"],
    "hourly_rate": null
  }
}

// C worker — type 50, both placements, both sizes
{
  "work_types": {
    "categories": ["C"],
    "divider_types": ["50"],
    "placements": ["ብተና", "ውስጥ"],
    "sizes": ["9cm", "7cm"],
    "hourly_rate": null
  }
}

// Worker who does BOTH PP and PL
{
  "work_types": {
    "categories": ["PP", "PL"],
    "divider_types": ["50", "40"],
    "placements": [],
    "sizes": ["9cm", "7cm"],
    "hourly_rate": null
  }
}

// TIME worker
{
  "work_types": {
    "categories": ["TIME"],
    "divider_types": [],
    "placements": [],
    "sizes": [],
    "hourly_rate": 20
  }
}
```

---

## 7. Admin Assignment UI — `ShiftApprovals.vue`

```
┌─ [Avatar]  Operator Name ─────────────────────────────────────┐
│                                                                │
│  ① Job Categories                                             │
│  [✓ MFG]  [ PP]  [ PL]  [✓ C]  [ TIME]                      │
│                                                                │
│  ② Divider Types  (for MFG / PP / PL / C)                    │
│  [✓ 50]  [✓ 40]  [ 30]  [ 16]  [ 12]  [ 45]                 │
│  [✓ other]  ← includes "other" if enabled in settings         │
│                                                                │
│  ③ Placement Styles  (only shown if MFG or C is checked)     │
│  [✓ ብተና]  [ ውስጥ]  [ other]                                   │
│                                                                │
│  ④ Sizes  (only shown if NOT TIME-only)                       │
│  [✓ 9cm]  [✓ 7cm]                                             │
│                                                                │
│  ⑤ Hourly Rate  (only shown if TIME is checked)              │
│  [ 20 ] ETB / hr                                              │
│                                                                │
│  [SAVE WORK CONFIG]                                           │
└───────────────────────────────────────────────────────────────┘
```

---

## 8. Admin Settings — Rate Editor Tabs

| Tab | Rate Lookup | Grid Size |
|---|---|---|
| Manufacturing (existing, renamed) | `MFG[type][size][placement]` | 7 types × 2 sizes × 3 placements |
| Paper Placement (new) | `PP[type][size]` | 7 types × 2 sizes |
| Plaster Placement (new) | `PL[type][size]` | 7 types × 2 sizes |
| Wood Preparation (new) | `C[type][size][placement]` | 7 types × 2 sizes × 3 placements |
| Custom "Other" Labels (new) | `systemConfig.otherDividerType` + `systemConfig.otherPlacement` | Text boxes + prices |

---

## 9. Database Changes

```sql
ALTER TABLE mes_production_logs
  ADD COLUMN IF NOT EXISTS work_category VARCHAR(5) NOT NULL DEFAULT 'MFG',
  ADD COLUMN IF NOT EXISTS hours_worked  NUMERIC(6, 2) DEFAULT NULL;

UPDATE mes_production_logs
  SET work_category = 'MFG'
  WHERE work_category IS NULL OR work_category = '';
```

---

## 10. Files to Modify

| File | Change |
|---|---|
| `ProductionLogger.vue` | **Full rewrite** — 5-type dynamic form |
| `ShiftApprovals.vue` | Structured config form (categories, types, placements, sizes, rate) |
| `mesStore.js` | Extended pieceRates, `getOperatorWorkConfig()`, updated payload + mapper |
| `AdminSettings.vue` | New rate editor tabs (PP, PL, C) + "Other" custom label/price fields |
| `EmployeeProfileView.vue` | Add `work_category` column to activity log |
| `DailyProductionLog.vue` | Group/filter by `work_category` |
| `supabase_migration.sql` | Add `work_category` + `hours_worked` |

---

## 11. Implementation Phases

### ✅ Phase 1 — Admin Assignment UI
> Files: `ShiftApprovals.vue`, `mesStore.js`

1. Add `CATEGORIES`, `DIVIDER_TYPES`, `PLACEMENTS`, `SIZES` constants
2. Replace flat chip list with grouped form (4 sections, smart show/hide)
3. Update `setOperatorWorkTypes()` to save structured JSON
4. Add `getOperatorWorkConfig(operatorId)` helper
5. Update `fetchInitialData()` to parse both old + new format

### ✅ Phase 2 — Database + Store
> Files: `mesStore.js`, Supabase

6. Run migration SQL
7. Restructure `pieceRates` default value (add MFG, PP, PL, C keys)
8. Find & replace all legacy `pieceRates['50']` → `pieceRates.MFG['50']`
9. Update `submitProductionLog()` payload
10. Update `mapSupabaseLedgerToLocal()` to read new fields

### ✅ Phase 3 — ProductionLogger.vue Rewrite
> File: `ProductionLogger.vue`

11. On operator select → call `getOperatorWorkConfig()`
12. If 1 category → auto-select. If 2+ → show category picker
13. Render each form (MFG / PP / PL / C / TIME) based on selection
14. Filter toggles to only show admin-assigned options
15. Wire up `getRate()` helper per category
16. Wire `saveEntry()` with `work_category` in payload

### ✅ Phase 4 — Settings + Reporting
> Files: `AdminSettings.vue`, `EmployeeProfileView.vue`, `DailyProductionLog.vue`

17. Add PP, PL, C rate editor tabs
18. Add "Other" custom label + price config panel
19. Update activity log table with `work_category` column
20. Update daily log grouping

---

*v5 LOCKED — No open questions. Starting Phase 1 now.*
