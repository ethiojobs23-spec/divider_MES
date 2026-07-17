# Divider MES — Project Summary

> **Dev server running at:** [http://localhost:5173](http://localhost:5173)

---

## File Tree Generated

```
divider_MES/
├── vite.config.js               ← Vite + Tailwind v4 + @ alias
├── src/
│   ├── main.js                  ← App entry (Vue + Pinia + Router)
│   ├── App.vue                  ← Root (router-view only)
│   ├── style.css                ← Inter font, Material Symbols, global reset
│   ├── store/
│   │   └── mesStore.js          ← Pinia store (all MES state)
│   ├── router/
│   │   └── index.js             ← 6-route Vue Router config
│   ├── components/
│   │   ├── layout/
│   │   │   └── TabletLayout.vue ← 25/75 split + live clock sidebar
│   │   └── ui/
│   │       └── VirtualNumpad.vue← Massive 0-9 + CLR/DEL keypad
│   └── views/
│       ├── KioskLogin.vue       ← Screen 1: Operator profiles + modal
│       ├── ProductionLogger.vue ← Screen 2: Divider type toggles + numpad
│       ├── DowntimeTracker.vue  ← Screen 3: SVG stopwatch + stoppage reasons
│       ├── InventoryManager.vue ← Screen 4: Material list + ADD/USE numpad
│       ├── CashAdvanceHub.vue   ← Screen 5: Advance/Expense logger + presets
│       └── PayrollDashboard.vue ← Screen 6: Weekly aggregation table
```

---

## Screens at a Glance

| # | Route | Screen | Key Features |
|---|-------|---------|--------------|
| 1 | `/login` | **KioskLogin** | 3×2 operator grid, Clock In (emerald) / Clock Out (rose) modal |
| 2 | `/production` | **ProductionLogger** | Divider Type [50,40,30,16,12,45], Placement [ብተና/ውስጥ/የተለየ], Size [9cm/7cm], numpad, SAVE TO LEDGER |
| 3 | `/downtime` | **DowntimeTracker** | Animated SVG ring stopwatch, 5 stoppage reasons, FLAG/RESOLVE buttons |
| 4 | `/inventory` | **InventoryManager** | 7 raw materials sidebar, ADD/USE mode, confirm button |
| 5 | `/cash` | **CashAdvanceHub** | Advance vs Expense type, operator selector, 50/100/200/500/1000 presets |
| 6 | `/payroll` | **PayrollDashboard** | M&T, W&T, F&S, TOTAL production + NOW, WITHDR, BONUS, PREVIOUS, TOTAL financial |

---

## Pinia Store (`mesStore.js`) State Shape

| State | Type | Description |
|-------|------|-------------|
| `operators` | `Operator[]` | 6 factory operators (Zelalem, Aben, Teme, Selam, Biruk, Meron) |
| `activeOperator` | `Operator\|null` | Currently active operator |
| `clockedInOperators` | `Record<id, ISO>` | Clock-in timestamps per operator |
| `currentProductionWeek` | `string` | e.g. `W29-2026` |
| `ledgerEntries` | `Entry[]` | All production log entries |
| `inventory` | `Material[]` | 7 raw materials with live qty |
| `cashEntries` | `CashEntry[]` | All advance / expense entries |
| `activeDowntime` | `Downtime\|null` | Currently running stoppage session |
| `downtimeSessions` | `Downtime[]` | Resolved stoppage history |

---

## Design System

- **Font:** Inter (Google Fonts) — `font-weight` 400–900
- **Icons:** Material Symbols Rounded (filled variant)
- **Color palette:**
  - Background: `#0f172a` (navy) / `#1e293b` (slate)
  - Accent: `#6366f1` indigo / `#8b5cf6` violet
  - Success: `#10b981` emerald
  - Danger: `#ef4444` rose
  - Warning: `#f59e0b` amber
- **Touch targets:** `min-height: 3rem–5.5rem` on all interactive elements
- **No native keyboard:** All numeric entry via `VirtualNumpad`

---

> [!TIP]
> To persist state across page refreshes, install `pinia-plugin-persistedstate` and set `persist: true` in the store definition.

> [!NOTE]
> The `PayrollDashboard` financial columns (WITHDR, BONUS, PREVIOUS) are derived live from `cashEntries`. Connect to a real backend or expand the ledger schema as your payroll logic grows.
