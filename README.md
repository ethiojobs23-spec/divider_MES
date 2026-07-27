# Divider MES — Manufacturing Execution System

**Status: ✅ FULLY IMPLEMENTED & DEPLOYED**  
**Live Demo:** [https://divider-mes.vercel.app](https://divider-mes.vercel.app)

---

## Overview

Divider MES is a **production-ready, tablet-optimized Manufacturing Execution System** designed specifically for divider factories. It combines a Vue 3 + Vite frontend with a Supabase PostgreSQL backend to provide real-time production tracking, inventory management, downtime logging, and financial transaction recording.

### Key Capabilities

- ✅ **Operator Authentication** — PIN-based login for 6 factory operators with clock in/out tracking
- ✅ **Production Logging** — Capture production events with divider type (50, 40, 30, 16, 12, 45mm), placement style, size, and waste metrics
- ✅ **Inventory Management** — Track 7 raw materials with live stock levels and usage adjustments
- ✅ **Downtime Tracking** — SVG-powered stopwatch with 5 issue categories and resolution tracking
- ✅ **Financial Ledger** — Record advances, expenses, bonuses, and withdrawals per operator
- ✅ **Payroll Dashboard** — Weekly aggregation of production metrics and financial summaries
- ✅ **Responsive Design** — Tablet-first UI with 25/75 split layout and virtual numpad for all input

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vue 3 (Composition API), Pinia (state management), Vue Router (6 routes) |
| **UI Framework** | Tailwind CSS v4, Headless UI, Material Symbols Rounded icons |
| **Build Tool** | Vite 8 with PWA support |
| **Backend** | Supabase (PostgreSQL + REST API) |
| **Database** | PostgreSQL with 7 custom tables + Row-Level Security |
| **Hosting** | Vercel (frontend), Supabase Cloud (backend) |

---

## System Architecture

### Database Schema (Supabase PostgreSQL)

```sql
mes_operators          — PIN-based operator profiles (6 employees + admin)
mes_inventory          — 7 raw materials with stock tracking
mes_production_logs    — Production events (divider type, size, placement, waste)
mes_financial_ledger   — Financial transactions (advances, expenses, bonuses)
mes_downtime_logs      — Machine/line stoppages with duration & resolution
mes_attendance         — Clock in/out records per operator per day
mes_loans              — Interest-bearing loans to operators
```

**Row-Level Security:** Enabled on all tables with anonymous read/write for PIN-authenticated access.

### Frontend Architecture

```
src/
├── main.js                    ← Vue + Pinia + Router entrypoint
├── App.vue                    ← Root component (router-view only)
├── style.css                  ← Inter font, Material Symbols, global reset
├── store/
│   └── mesStore.js            ← Pinia store with all MES state
├── router/
│   └── index.js               ← 6-route Vue Router (login, production, downtime, inventory, cash, payroll)
├── components/
│   ├── layout/
│   │   └── TabletLayout.vue   ← 25/75 split sidebar + content area
│   └── ui/
│       └── VirtualNumpad.vue  ← Massive touch-friendly 0-9 keypad
└── views/
    ├── KioskLogin.vue         ← Operator selector + clock in/out modal
    ├── ProductionLogger.vue   ← Divider type + placement + size + qty logger
    ├── DowntimeTracker.vue    ← Animated SVG stopwatch + issue categories
    ├── InventoryManager.vue   ← Material list + ADD/USE mode toggle
    ├── CashAdvanceHub.vue     ← Advance/Expense logger with presets
    └── PayrollDashboard.vue   ← Weekly production & financial summary
```

---

## Features by Screen

| Screen | Route | Purpose | Input Method |
|--------|-------|---------|--------------|
| **1. Kiosk Login** | `/login` | Operator authentication & attendance | 3×2 operator grid, 4-digit PIN, clock buttons |
| **2. Production Logger** | `/production` | Record production events | Divider type toggles, placement selector, size radio, numpad |
| **3. Downtime Tracker** | `/downtime` | Log machine stoppages | SVG stopwatch (auto-capture duration), issue category dropdown |
| **4. Inventory Manager** | `/inventory` | Adjust raw material stock | Material sidebar, ADD/USE mode, quantity input via numpad |
| **5. Cash Advance Hub** | `/cash` | Record financial transactions | Operator selector, type (Advance/Expense), amount presets or numpad |
| **6. Payroll Dashboard** | `/payroll` | View weekly summaries | Read-only aggregation of production & financial data |

### Production Logger Details

- **Divider Types:** 50mm, 40mm, 30mm, 16mm, 12mm, 45mm (toggle buttons)
- **Placement Style:** ብተና (Beteña), ውስጥ (Wisit), የተለየ (Yeteleye) — Amharic labeling
- **Size:** 9cm or 7cm (radio buttons)
- **Entry Fields:** Quantity produced, waste (numeric input via virtual numpad)
- **Persistence:** All entries saved to `mes_production_logs` table with timestamp & operator reference

---

## State Management (Pinia Store)

### Global State (`mesStore.js`)

```javascript
// Operators & Attendance
operators              // Array of 6 operator profiles
activeOperator         // Currently logged-in operator
clockedInOperators     // Record<operatorId, ISO8601 timestamp>

// Production
currentProductionWeek  // e.g., "W29-2026"
ledgerEntries          // Array of production log entries
productionByOperator   // Aggregated production metrics per operator

// Inventory
inventory              // Array of 7 materials with live qty
inventoryHistory       // Audit trail of stock adjustments

// Financial
cashEntries            // Array of financial transactions
totalAdvances          // Sum of all operator advances
totalExpenses          // Sum of all expenses
totalBonuses           // Sum of bonuses awarded

// Downtime
activeDowntime         // Currently running stoppage session
downtimeSessions       // Array of resolved downtime events
downtimeReasons        // 5 predefined stoppage categories

// UI State
sidebarOpen            // Mobile-responsive sidebar toggle
liveTime               // Current time for dashboard display
```

---

## Deployment & Environment

### Frontend (Vercel)
- **Build:** `npm run build` → generates optimized static bundle
- **Environment:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` in Vercel dashboard
- **Deploy:** Git push to main branch → automatic Vercel build + deployment

### Backend (Supabase)
- **Database:** PostgreSQL 15
- **REST API:** Auto-generated OpenAPI endpoints for all tables
- **Auth:** Supabase RLS policies (set to "allow all" for PIN-based access; upgrade to JWT in production)
- **Real-time:** Supabase real-time subscriptions available (opt-in per table)

### Development Setup

```bash
# Install dependencies
npm install

# Set up environment file
cp .env.example .env.local
# Add your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_KEY=your-anon-key

# Run dev server
npm run dev
# Open http://localhost:5173
```

---

## Key Workflows

### Production Entry Flow
1. Operator clock in → Navigate to Production Logger
2. Select divider type (e.g., 50mm)
3. Choose placement style (Beteña/Wisit/Yeteleye)
4. Select size (9cm/7cm)
5. Enter quantity produced & waste via numpad
6. **SAVE TO LEDGER** → Entry inserted into `mes_production_logs`
7. Pinia store updates, UI re-renders production summary

### Downtime Tracking Flow
1. Operator clicks "START STOPPAGE" on Downtime Tracker
2. SVG ring stopwatch animates in real-time
3. Select issue category (5 options: Mechanical, Material, Electrical, Software, Other)
4. Click **RESOLVE** when machine is back online
5. Duration calculated & entry saved to `mes_downtime_logs` with timestamp

### Financial Transaction Flow
1. Operator selects type: Advance or Expense
2. Enter amount via numpad (or tap preset: 50, 100, 200, 500, 1000)
3. Optional notes field
4. Click **SUBMIT** → Entry inserted into `mes_financial_ledger`
5. Payroll Dashboard updates totals in real-time

---

## UI Design System

| Aspect | Details |
|--------|---------|
| **Typography** | Inter font family (400–900 weight), scale: 12px–48px |
| **Icons** | Material Symbols Rounded (filled variant) |
| **Color Palette** | Navy (`#0f172a`) bg, Indigo/Violet accents, Emerald (success), Rose (danger), Amber (warning) |
| **Touch Targets** | Minimum 48px height on all buttons; virtual numpad keys 60×60px |
| **Layout** | 25% sidebar + 75% content on desktop; full-width on mobile |
| **Animations** | SVG stopwatch, smooth transitions, no jank on 60fps tablets |
| **Accessibility** | Semantic HTML, ARIA labels on custom components, keyboard support (Numpad) |

---

## Production Checklist

- ✅ **Database** — 7 tables created, schema tested with seed data
- ✅ **Frontend** — 6 views built, all routes functional, state management via Pinia
- ✅ **API Integration** — Supabase REST client initialized, CRUD operations tested
- ✅ **Authentication** — PIN-based operator login with session tracking
- ✅ **Inventory** — Stock level tracking with ADD/USE operations
- ✅ **Financial Ledger** — Advances, expenses, bonuses, withdrawals recording
- ✅ **Payroll Dashboard** — Weekly aggregation of production & financial metrics
- ✅ **Downtime Logging** — Stopwatch timer with stoppage reason tracking
- ✅ **Deployment** — Live on Vercel; database on Supabase Cloud
- ✅ **Testing** — Manual verification of all screens + workflows

---

## Known Limitations & Future Enhancements

| Limitation | Note | Workaround |
|------------|------|-----------|
| Anonymous Supabase RLS | Currently "allow all" for simplicity | Upgrade to JWT-based auth for stricter access control |
| No offline support | Requires internet connection | Add `pinia-plugin-persistedstate` + Service Worker caching |
| Manual payroll calculation | Bonuses/deductions not auto-calculated | Extend `mes_financial_ledger` schema + add business rules |
| No audit trail for edits | Insert-only ledger tables | Add `updated_at`, `updated_by` columns + soft deletes |

---

## Quick Links

- **Live Demo:** [https://divider-mes.vercel.app](https://divider-mes.vercel.app)
- **Supabase Project:** [https://app.supabase.com](https://app.supabase.com)
- **GitHub Repo:** [ethiojobs23-spec/divider_MES](https://github.com/ethiojobs23-spec/divider_MES)
- **Schema Guide:** See [`supabase_schema.sql`](./supabase_schema.sql)
- **Project Summary:** See [`divider_mes_summary.md`](./divider_mes_summary.md)

---

## Support & Troubleshooting

### Dev Server Not Starting
```bash
npm install
npm run dev
# Check that VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set in .env.local
```

### Supabase Connection Error
- Verify API URL and anon key in `.env.local`
- Check Supabase project status at [app.supabase.com](https://app.supabase.com)
- Ensure RLS policies are set to "Allow all" (or configure custom policies for production)

### Production Data Not Persisting
- Check browser console for Supabase errors
- Verify `mes_production_logs` table exists in Supabase
- Check network tab for failed API requests

---

## License

Divider MES is licensed under **GPL-2.0-or-later**.

---

## Contributing

Contributions welcome! Please:
1. Open an issue to discuss larger changes
2. Keep changes scoped and focused
3. Include manual testing steps or unit tests
4. Follow Vue 3 Composition API best practices

---

**Last Updated:** July 27, 2026  
**Version:** 1.0.0 (Production)
