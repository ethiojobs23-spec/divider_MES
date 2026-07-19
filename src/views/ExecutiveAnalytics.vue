<template>
  <TabletLayout>
    <div class="analytics-root">

      <!-- ══════════════════════════════════════════════════════════════════
           LEFT NAV — View tabs
           ══════════════════════════════════════════════════════════════════ -->
      <aside class="view-nav">
        <p class="nav-heading">DASHBOARD VIEWS</p>

        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="nav-tab"
          :class="{ 'nav-tab--active': activeView === tab.id }"
          @click="activeView = tab.id"
        >
          <span class="material-symbols-rounded tab-icon">{{ tab.icon }}</span>
          <div class="tab-labels">
            <span class="tab-title">{{ tab.title }}</span>
            <span class="tab-sub">{{ tab.sub }}</span>
          </div>
          <span v-if="activeView === tab.id" class="tab-indicator" />
        </button>

        <!-- Export -->
        <button class="export-btn" @click="exportTelegram">
          <span class="material-symbols-rounded">send</span>
          Export to Frezer
        </button>
      </aside>

      <!-- ══════════════════════════════════════════════════════════════════
           MAIN CONTENT AREA
           ══════════════════════════════════════════════════════════════════ -->
      <main class="view-area">

        <!-- ─── VIEW A: Global Factory Overview ──────────────────────── -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'global'" class="view-panel" key="global">

          <div class="panel-header">
            <h2 class="panel-title">Global Factory Overview</h2>
            <p class="panel-sub">{{ store.currentProductionWeek }} · All operators · All variants</p>
          </div>

          <!-- KPI Row -->
          <div class="kpi-grid">
            <AnalyticsDataCard
              title="Total Dividers Produced"
              :value="store.totalGoodAllTime.toLocaleString()"
              icon="factory"
              icon-bg="rgba(99,102,241,.15)"
              icon-color="#a5b4fc"
              :trend="kpiTrends.production"
            />
            <AnalyticsDataCard
              title="Total Waste Units"
              :value="store.totalWasteAllTime.toLocaleString()"
              icon="delete_sweep"
              icon-bg="rgba(239,68,68,.12)"
              icon-color="#f87171"
              :trend="kpiTrends.waste"
              :trend-up-is-bad="true"
            />
            <AnalyticsDataCard
              title="Overall Waste Rate"
              :value="store.overallWastePct + '%'"
              icon="percent"
              icon-bg="rgba(245,158,11,.12)"
              icon-color="#fbbf24"
              :trend="kpiTrends.wasteRate"
              :trend-up-is-bad="true"
            />
            <AnalyticsDataCard
              title="Total Payroll Liability"
              :value="'ETB ' + totalPayrollLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })"
              icon="account_balance_wallet"
              icon-bg="rgba(139,92,246,.15)"
              icon-color="#c084fc"
              :trend="null"
            />
          </div>

          <!-- 7-Day Bar Chart -->
          <div class="chart-card" style="flex:1;min-height:0">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#6366f1">trending_up</span>
              <div>
                <p class="card-hdr-title">7-Day Production Trend</p>
                <p class="card-hdr-sub">Good output (purple) vs. waste (red)</p>
              </div>
              <div class="badge">7-Day</div>
            </div>
            <div class="bar-chart">
              <div v-for="day in store.sevenDayTrend" :key="day.label" class="bar-col">
                <div class="bar-col-inner">
                  <div class="bar-seg bar-seg--waste" :style="{ height: barH(day.waste) + '%' }" :title="`Waste: ${day.waste}`" />
                  <div class="bar-seg bar-seg--good"  :style="{ height: barH(day.good)  + '%' }" :title="`Good: ${day.good}`" />
                </div>
                <div class="bar-values">
                  <span class="bv-good">{{ day.good }}</span>
                  <span class="bv-waste">{{ day.waste }}</span>
                </div>
                <p class="bar-label">{{ day.label }}</p>
              </div>
            </div>
            <div class="chart-legend">
              <div class="leg-item"><span class="leg-dot" style="background:#6366f1"/> Good Production</div>
              <div class="leg-item"><span class="leg-dot" style="background:#ef4444"/> Waste Material</div>
            </div>
          </div>

        </section>
        </Transition>

        <!-- ─── VIEW B: Employee Performance & Pay ───────────────────── -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'employee'" class="view-panel" key="employee">

          <div class="panel-header">
            <h2 class="panel-title">Employee Performance & Pay</h2>
            <p class="panel-sub">Tap an operator to expand their full profile</p>
          </div>

          <div class="employee-layout">

            <!-- Left: operator list -->
            <div class="operator-list">
              <!-- Search -->
              <div class="search-wrap">
                <span class="material-symbols-rounded search-icon">search</span>
                <input
                  v-model="empSearch"
                  class="search-input"
                  placeholder="Search operator…"
                  type="text"
                />
              </div>

              <button
                v-for="op in filteredOperators"
                :key="op.id"
                class="op-card"
                :class="{ 'op-card--active': selectedOpId === op.id }"
                @click="selectedOpId = op.id"
              >
                <div class="op-avatar" :class="op.color">{{ op.avatar }}</div>
                <div class="op-info">
                  <p class="op-name">{{ op.name }}</p>
                  <p class="op-role">{{ op.role }}</p>
                </div>
                <div class="op-quick">
                  <span class="quick-val">{{ op.good }}</span>
                  <span class="quick-lbl">units</span>
                </div>
              </button>

              <p v-if="filteredOperators.length === 0" class="empty-note">No operators found</p>
            </div>

            <!-- Right: detail profile -->
            <div class="profile-area">
              <Transition name="profile-fade" mode="out-in">
                <div v-if="selectedProfile" class="profile-card" :key="selectedProfile.id">

                  <!-- Header -->
                  <div class="profile-hdr">
                    <div class="profile-avatar" :class="selectedProfile.color">{{ selectedProfile.avatar }}</div>
                    <div>
                      <h3 class="profile-name">{{ selectedProfile.name }}</h3>
                      <p class="profile-role">{{ selectedProfile.role }}</p>
                    </div>
                    <div
                      class="profile-badge"
                      :class="selectedProfile.wastePercent >= 15 ? 'badge--critical' : selectedProfile.wastePercent >= 8 ? 'badge--warn' : 'badge--ok'"
                    >
                      {{ selectedProfile.wastePercent }}% Waste
                    </div>
                  </div>

                  <!-- Metric blocks -->
                  <div class="metric-grid">

                    <!-- Production -->
                    <div class="metric-section">
                      <p class="section-title"><span class="material-symbols-rounded">factory</span> Production</p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Units Produced</span>
                          <span class="m-value m-value--good">{{ selectedProfile.good.toLocaleString() }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Waste Units</span>
                          <span class="m-value m-value--bad">{{ selectedProfile.waste.toLocaleString() }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Waste %</span>
                          <span class="m-value">{{ selectedProfile.wastePercent }}%</span>
                        </div>
                      </div>
                      <!-- Waste bar -->
                      <div class="waste-bar-track">
                        <div
                          class="waste-bar-fill"
                          :class="selectedProfile.wastePercent >= 15 ? 'fill--critical' : selectedProfile.wastePercent >= 8 ? 'fill--warn' : 'fill--ok'"
                          :style="{ width: Math.min(100, selectedProfile.wastePercent) + '%' }"
                        />
                      </div>
                    </div>

                    <!-- Attendance -->
                    <div class="metric-section">
                      <p class="section-title"><span class="material-symbols-rounded">calendar_month</span> Attendance</p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Days Attended</span>
                          <span class="m-value">{{ selectedProfile.pay.daysAttended }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Expected Days</span>
                          <span class="m-value">{{ selectedProfile.pay.expectedDays }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Attendance Rate</span>
                          <span class="m-value m-value--good">
                            {{ Math.round((selectedProfile.pay.daysAttended / selectedProfile.pay.expectedDays) * 100) }}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Financials -->
                    <div class="metric-section metric-section--financial">
                      <p class="section-title"><span class="material-symbols-rounded">account_balance_wallet</span> Financials</p>
                      <div class="financial-rows">
                        <div class="fin-row">
                          <span class="fin-label">Gross Earnings</span>
                          <span class="fin-value">ETB {{ selectedProfile.pay.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                        <div class="fin-row fin-row--deduct">
                          <span class="fin-label">Loan Deductions</span>
                          <span class="fin-value fin-value--red">− ETB {{ selectedProfile.pay.loanDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                        <div class="fin-row fin-row--deduct">
                          <span class="fin-label">Advance Deductions</span>
                          <span class="fin-value fin-value--red">− ETB {{ selectedProfile.pay.advanceDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                        <div class="fin-divider" />
                        <div class="fin-row fin-row--net">
                          <span class="fin-label-net">NET PAYOUT</span>
                          <span class="fin-value-net">ETB {{ selectedProfile.pay.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                      </div>
                    </div>

                  </div><!-- /metric-grid -->

                  <!-- Per-variant breakdown -->
                  <div class="variant-section">
                    <p class="section-title"><span class="material-symbols-rounded">category</span> Production by Variant</p>
                    <div class="variant-table">
                      <div class="vt-header">
                        <span>Variant</span><span>Size</span><span>Placement</span><span>Good</span><span>Waste</span><span>Rate (ETB)</span>
                      </div>
                      <div v-for="row in selectedProfile.variants" :key="row.key" class="vt-row">
                        <span class="vt-badge">{{ row.dividerType }}</span>
                        <span>{{ row.size }}</span>
                        <span>{{ row.placement }}</span>
                        <span class="vt-good">{{ row.good }}</span>
                        <span class="vt-waste">{{ row.waste }}</span>
                        <span class="vt-rate">ETB {{ row.rate.toFixed(2) }}</span>
                      </div>
                      <div v-if="!selectedProfile.variants.length" class="vt-empty">No production entries</div>
                    </div>
                  </div>

                </div>
                <div v-else class="profile-empty" key="empty">
                  <span class="material-symbols-rounded pe-icon">person_search</span>
                  <p>Select an operator to view their profile</p>
                </div>
              </Transition>
            </div>

          </div><!-- /employee-layout -->
        </section>
        </Transition>

        <!-- ─── VIEW C: Payroll Cost Analysis ────────────────────────── -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'payroll'" class="view-panel" key="payroll">

          <div class="panel-header">
            <h2 class="panel-title">Payroll Cost Analysis</h2>
            <p class="panel-sub">Labor cost per unit · M&amp;T / W&amp;T / F&amp;S breakdown · {{ store.currentProductionWeek }}</p>
          </div>

          <!-- Cost per unit KPIs -->
          <div class="cpu-kpi-row">
            <div class="cpu-kpi">
              <p class="cpu-label">Total Payroll Liability</p>
              <p class="cpu-value">ETB {{ totalPayrollLiability.toFixed(2) }}</p>
            </div>
            <div class="cpu-kpi">
              <p class="cpu-label">Total Good Production</p>
              <p class="cpu-value">{{ store.totalGoodAllTime.toLocaleString() }} units</p>
            </div>
            <div class="cpu-kpi cpu-kpi--highlight">
              <p class="cpu-label">Avg. Cost per Unit</p>
              <p class="cpu-value">
                ETB {{ store.totalGoodAllTime > 0
                  ? (totalPayrollLiability / store.totalGoodAllTime).toFixed(4)
                  : '—' }}
              </p>
            </div>
          </div>

          <!-- Per-operator cost table -->
          <div class="chart-card" style="flex:1;min-height:0;overflow:hidden">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#c084fc">bar_chart</span>
              <div>
                <p class="card-hdr-title">Cost per Unit by Operator</p>
                <p class="card-hdr-sub">Gross Earnings ÷ Units Produced</p>
              </div>
            </div>

            <div class="cost-table-wrap">
              <table class="cost-table">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Units Produced</th>
                    <th>Gross (ETB)</th>
                    <th>Deductions (ETB)</th>
                    <th>Net Payout (ETB)</th>
                    <th>Cost / Unit (ETB)</th>
                    <th>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in costAnalysisRows" :key="row.id">
                    <td>
                      <div class="op-cell">
                        <div class="op-dot" :class="row.color">{{ row.avatar }}</div>
                        <span>{{ row.name }}</span>
                      </div>
                    </td>
                    <td class="num">{{ row.good.toLocaleString() }}</td>
                    <td class="num">{{ row.gross.toFixed(2) }}</td>
                    <td class="num red">{{ (row.loanDeduction + row.advanceDeduction).toFixed(2) }}</td>
                    <td class="num green">{{ row.net.toFixed(2) }}</td>
                    <td class="num purple">{{ row.good > 0 ? row.costPerUnit.toFixed(4) : '—' }}</td>
                    <td class="bar-cell">
                      <div class="cost-bar-track">
                        <div
                          class="cost-bar-fill"
                          :style="{ width: row.good > 0 ? Math.min(100, (row.costPerUnit / maxCostPerUnit) * 100) + '%' : '0%' }"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="costAnalysisRows.length === 0">
                    <td colspan="7" class="empty-td">No payroll data for current week</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Week breakdown: M&T / W&T / F&S -->
            <div class="week-breakdown">
              <p class="section-title" style="margin-bottom:.75rem">
                <span class="material-symbols-rounded">date_range</span> Weekly Period Breakdown
              </p>
              <div class="period-bars">
                <div v-for="(val, key) in store.weeklyAggregation" :key="key" class="period-item">
                  <div class="period-bar-wrap">
                    <div
                      class="period-bar"
                      :style="{ height: weekAggMax > 0 ? Math.max(6, (val / weekAggMax) * 100) + '%' : '6%' }"
                    />
                  </div>
                  <span class="period-val">{{ val }}</span>
                  <span class="period-label">{{ key }}</span>
                </div>
              </div>
            </div>

          </div>
        </section>
        </Transition>

      </main><!-- /view-area -->

    </div><!-- /analytics-root -->

    <!-- Export toast -->
    <Transition name="toast">
      <div v-if="exportToast" class="export-toast">
        <span class="material-symbols-rounded">send</span>
        Report compiled &amp; forwarded to Frezer
      </div>
    </Transition>
  </TabletLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import TabletLayout from '@/components/layout/TabletLayout.vue'
import AnalyticsDataCard from '@/components/ui/AnalyticsDataCard.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'global',   icon: 'dashboard',   title: 'Global Overview',       sub: 'KPIs & production trend'    },
  { id: 'employee', icon: 'badge',        title: 'Employee Performance',  sub: 'Per-operator pay & output'  },
  { id: 'payroll',  icon: 'payments',     title: 'Payroll Cost Analysis', sub: 'Cost per unit & liability'  },
]
const activeView = ref('global')

// ── Mock weekly payroll data linked to operators ──────────────────────────────
// In production this comes from payrollStore / API. Here we model it richly
// so every screen shows real structural relationships.
const WEEK = store.currentProductionWeek

const mockPayroll = {
  1: { // Zelalem
    daysAttended: 5, expectedDays: 6,
    gross: 1250.00, loanDeduction: 200.00, advanceDeduction: 150.00,
    variants: [
      { key: 'Z1', dividerType: '50', size: '9cm', placement: 'ብተና', good: 180, waste: 14, rate: 2.50 },
      { key: 'Z2', dividerType: '40', size: '7cm', placement: 'ውስጥ',  good: 120, waste:  9, rate: 2.25 },
      { key: 'Z3', dividerType: '30', size: '9cm', placement: 'የተለየ', good:  80, waste:  6, rate: 3.00 },
    ],
  },
  2: { // Aben
    daysAttended: 6, expectedDays: 6,
    gross: 1380.00, loanDeduction: 0,    advanceDeduction: 100.00,
    variants: [
      { key: 'A1', dividerType: '50', size: '9cm', placement: 'ብተና', good: 210, waste: 10, rate: 2.50 },
      { key: 'A2', dividerType: '45', size: '7cm', placement: 'ውስጥ',  good:  90, waste:  8, rate: 2.40 },
    ],
  },
  3: { // Teme
    daysAttended: 4, expectedDays: 6,
    gross: 980.00, loanDeduction: 300.00, advanceDeduction: 0,
    variants: [
      { key: 'T1', dividerType: '30', size: '9cm', placement: 'ብተና', good: 140, waste: 22, rate: 2.00 },
      { key: 'T2', dividerType: '16', size: '7cm', placement: 'ውስጥ',  good:  75, waste: 12, rate: 1.75 },
    ],
  },
  4: { // Selam (Supervisor — lighter production)
    daysAttended: 6, expectedDays: 6,
    gross: 900.00, loanDeduction: 0, advanceDeduction: 0,
    variants: [
      { key: 'S1', dividerType: '50', size: '9cm', placement: 'ውስጥ', good: 100, waste: 5, rate: 3.00 },
    ],
  },
  5: { // Biruk
    daysAttended: 5, expectedDays: 6,
    gross: 1100.00, loanDeduction: 100.00, advanceDeduction: 50.00,
    variants: [
      { key: 'B1', dividerType: '40', size: '9cm', placement: 'ብተና', good: 190, waste: 18, rate: 2.25 },
      { key: 'B2', dividerType: '12', size: '7cm', placement: 'የተለየ', good:  60, waste:  7, rate: 2.00 },
    ],
  },
  6: { // Meron
    daysAttended: 6, expectedDays: 6,
    gross: 1290.00, loanDeduction: 0, advanceDeduction: 200.00,
    variants: [
      { key: 'M1', dividerType: '50', size: '9cm', placement: 'ብተና', good: 200, waste: 12, rate: 2.50 },
      { key: 'M2', dividerType: '45', size: '9cm', placement: 'ውስጥ',  good: 115, waste:  9, rate: 2.90 },
    ],
  },
}

// ── Enriched operator list (for View B list) ──────────────────────────────────
const enrichedOperators = computed(() =>
  store.operatorEfficiency.map(op => ({
    ...op,
    pay: {
      ...mockPayroll[op.id],
      net: Math.max(0,
        (mockPayroll[op.id]?.gross ?? 0)
        - (mockPayroll[op.id]?.loanDeduction ?? 0)
        - (mockPayroll[op.id]?.advanceDeduction ?? 0)
      ),
    },
    variants: mockPayroll[op.id]?.variants ?? [],
  }))
)

// ── Employee search / selection ────────────────────────────────────────────────
const empSearch    = ref('')
const selectedOpId = ref(null)

const filteredOperators = computed(() => {
  const q = empSearch.value.trim().toLowerCase()
  return q ? enrichedOperators.value.filter(o => o.name.toLowerCase().includes(q)) : enrichedOperators.value
})

const selectedProfile = computed(() =>
  enrichedOperators.value.find(o => o.id === selectedOpId.value) ?? null
)

// ── Total payroll liability ───────────────────────────────────────────────────
const totalPayrollLiability = computed(() =>
  Object.values(mockPayroll).reduce((sum, p) => sum + p.gross, 0)
)

// ── Cost analysis rows (View C) ───────────────────────────────────────────────
const costAnalysisRows = computed(() =>
  enrichedOperators.value.map(op => ({
    ...op,
    gross:           mockPayroll[op.id]?.gross           ?? 0,
    loanDeduction:   mockPayroll[op.id]?.loanDeduction   ?? 0,
    advanceDeduction:mockPayroll[op.id]?.advanceDeduction ?? 0,
    net:             op.pay.net,
    costPerUnit:     op.good > 0 ? (mockPayroll[op.id]?.gross ?? 0) / op.good : 0,
  }))
)

const maxCostPerUnit = computed(() =>
  Math.max(...costAnalysisRows.value.map(r => r.costPerUnit), 0.01)
)

// ── Week agg max (for period bars) ───────────────────────────────────────────
const weekAggMax = computed(() =>
  Math.max(...Object.values(store.weeklyAggregation), 1)
)

// ── KPI trends (mocked — in prod these compare to last week from API) ─────────
const kpiTrends = { production: 12, waste: -5, wasteRate: -3 }

// ── Bar chart helpers ─────────────────────────────────────────────────────────
const maxTrend = computed(() => Math.max(...store.sevenDayTrend.map(d => d.good + d.waste), 1))
const barH = (val) => maxTrend.value > 0 ? Math.max(2, (val / maxTrend.value) * 100) : 2

// ── Export ────────────────────────────────────────────────────────────────────
const exportToast = ref(false)
let exportTimer = null
function exportTelegram() {
  exportToast.value = true
  clearTimeout(exportTimer)
  exportTimer = setTimeout(() => { exportToast.value = false }, 3500)
}
</script>

<style scoped>
/* ══ Root layout ══════════════════════════════════════════════════════════════ */
.analytics-root {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ══ Left view-nav ══════════════════════════════════════════════════════════════ */
.view-nav {
  width: 220px;
  flex-shrink: 0;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,.06);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: .5rem;
  overflow-y: auto;
}

.nav-heading {
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .16em;
  color: #334155;
  text-transform: uppercase;
  padding: 0 .5rem;
  margin: 0 0 .25rem;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .85rem .9rem;
  border-radius: .75rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
  position: relative;
  color: #64748b;
  -webkit-tap-highlight-color: transparent;
}
.nav-tab:hover { background: rgba(255,255,255,.04); color: #94a3b8; }
.nav-tab--active {
  background: rgba(99,102,241,.15);
  border-color: rgba(99,102,241,.3);
  color: #a5b4fc;
}

.tab-icon { font-size: 1.3rem; flex-shrink: 0; }
.tab-labels { display: flex; flex-direction: column; gap: .1rem; }
.tab-title { font-size: .82rem; font-weight: 700; line-height: 1.2; }
.tab-sub   { font-size: .6rem; opacity: .6; }

.tab-indicator {
  position: absolute;
  left: 0; top: 25%; bottom: 25%;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #6366f1;
}

.export-btn {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .75rem 1rem;
  background: linear-gradient(135deg,#2563eb,#3b82f6);
  border: none;
  border-radius: .75rem;
  color: #fff;
  font-size: .8rem;
  font-weight: 800;
  cursor: pointer;
  transition: filter .15s ease, transform .08s ease;
}
.export-btn:hover  { filter: brightness(1.1); }
.export-btn:active { transform: scale(.97); }

/* ══ Main view area ══════════════════════════════════════════════════════════ */
.view-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}

.view-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.25rem 1.5rem;
  gap: 1rem;
  overflow: hidden;
}

.panel-header { flex-shrink: 0; }
.panel-title {
  font-size: 1.3rem;
  font-weight: 900;
  color: #f1f5f9;
  margin: 0;
}
.panel-sub {
  font-size: .7rem;
  color: #64748b;
  margin: .2rem 0 0;
}

/* View transitions */
.view-fade-enter-active, .view-fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.view-fade-enter-from { opacity: 0; transform: translateX(12px); }
.view-fade-leave-to   { opacity: 0; transform: translateX(-12px); }

/* ══ KPI Grid ════════════════════════════════════════════════════════════════ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .85rem;
  flex-shrink: 0;
}

/* ══ Chart card (shared) ═════════════════════════════════════════════════════ */
.chart-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  overflow: hidden;
}
.card-hdr {
  display: flex;
  align-items: center;
  gap: .65rem;
  flex-shrink: 0;
}
.card-hdr .material-symbols-rounded { font-size: 1.3rem; }
.card-hdr-title { font-size: .88rem; font-weight: 800; color: #f1f5f9; }
.card-hdr-sub   { font-size: .62rem; color: #64748b; }
.badge {
  margin-left: auto;
  background: rgba(99,102,241,.15);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  font-size: .6rem;
  font-weight: 700;
  padding: .15rem .5rem;
  border-radius: 999px;
}

/* ══ Bar chart ═══════════════════════════════════════════════════════════════ */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: .5rem;
  flex: 1;
  min-height: 0;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .2rem;
  height: 100%;
}
.bar-col-inner {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 1px;
}
.bar-seg { width: 80%; border-radius: .25rem; min-height: 2px; transition: height .4s ease; }
.bar-seg--good  { background: linear-gradient(180deg,#6366f1,#8b5cf6); }
.bar-seg--waste { background: rgba(239,68,68,.7); }
.bar-values { display: flex; flex-direction: column; align-items: center; }
.bv-good    { font-size: .52rem; color: #a5b4fc; font-weight: 700; font-variant-numeric: tabular-nums; }
.bv-waste   { font-size: .52rem; color: #f87171; font-variant-numeric: tabular-nums; }
.bar-label  { font-size: .58rem; color: #475569; white-space: nowrap; }

.chart-legend { display: flex; gap: 1rem; flex-shrink: 0; }
.leg-item { display: flex; align-items: center; gap: .35rem; font-size: .65rem; color: #64748b; }
.leg-dot  { width: .5rem; height: .5rem; border-radius: 50%; flex-shrink: 0; }

/* ══ Employee layout ═════════════════════════════════════════════════════════ */
.employee-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

/* Operator list */
.operator-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  overflow-y: auto;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  padding: .85rem .75rem;
}

.search-wrap {
  position: relative;
  flex-shrink: 0;
  margin-bottom: .25rem;
}
.search-icon {
  position: absolute;
  left: .6rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #475569;
}
.search-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .55rem;
  padding: .55rem .75rem .55rem 2.2rem;
  font-size: .8rem;
  color: #e2e8f0;
  outline: none;
  font-family: inherit;
}
.search-input:focus { border-color: rgba(99,102,241,.4); }
.search-input::placeholder { color: #334155; }

.op-card {
  display: flex;
  align-items: center;
  gap: .65rem;
  padding: .65rem .75rem;
  border-radius: .65rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
  -webkit-tap-highlight-color: transparent;
}
.op-card:hover { background: rgba(255,255,255,.04); }
.op-card--active { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.3); }

.op-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: .5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .95rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.op-info { flex: 1; min-width: 0; }
.op-name { font-size: .82rem; font-weight: 700; color: #e2e8f0; margin: 0; }
.op-role { font-size: .6rem; color: #64748b; margin: 0; }

.op-quick { text-align: right; flex-shrink: 0; }
.quick-val { display: block; font-size: .9rem; font-weight: 800; color: #a5b4fc; font-variant-numeric: tabular-nums; }
.quick-lbl { display: block; font-size: .55rem; color: #475569; }

.empty-note { font-size: .75rem; color: #334155; text-align: center; padding: 1rem 0; }

/* Profile area */
.profile-area {
  overflow-y: auto;
}

.profile-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  padding: 1.25rem;
  min-height: 100%;
}

.profile-hdr {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}
.profile-avatar {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: .85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 900;
  color: #fff;
  flex-shrink: 0;
}
.profile-name { font-size: 1.3rem; font-weight: 900; color: #f1f5f9; margin: 0; }
.profile-role { font-size: .7rem; color: #64748b; text-transform: uppercase; letter-spacing: .07em; margin: 0; }
.profile-badge {
  margin-left: auto;
  font-size: .75rem;
  font-weight: 800;
  padding: .3rem .85rem;
  border-radius: 999px;
}
.badge--ok       { background: rgba(16,185,129,.15); color: #34d399; }
.badge--warn     { background: rgba(245,158,11,.15); color: #fbbf24; }
.badge--critical { background: rgba(239,68,68,.15);  color: #f87171; }

/* Metric grid */
.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: .85rem;
}

.metric-section {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.06);
  border-radius: .85rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .65rem;
}
.metric-section--financial { grid-column: span 1; }

.section-title {
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #475569;
  display: flex;
  align-items: center;
  gap: .35rem;
  margin: 0;
}
.section-title .material-symbols-rounded { font-size: .9rem; }

.metric-row { display: flex; gap: .75rem; flex-wrap: wrap; }
.metric-item { display: flex; flex-direction: column; gap: .15rem; }
.m-label { font-size: .62rem; color: #64748b; text-transform: uppercase; letter-spacing: .07em; }
.m-value { font-size: 1.4rem; font-weight: 900; color: #f1f5f9; font-variant-numeric: tabular-nums; }
.m-value--good { color: #34d399; }
.m-value--bad  { color: #f87171; }

.waste-bar-track { height: .45rem; background: rgba(255,255,255,.07); border-radius: 999px; overflow: hidden; }
.waste-bar-fill  { height: 100%; border-radius: 999px; transition: width .5s ease; }
.fill--ok       { background: #10b981; }
.fill--warn     { background: #f59e0b; }
.fill--critical { background: #ef4444; }

/* Financial rows */
.financial-rows { display: flex; flex-direction: column; gap: .5rem; }
.fin-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: .82rem;
}
.fin-row--deduct { opacity: .8; }
.fin-row--net {
  background: rgba(16,185,129,.1);
  border: 1px solid rgba(16,185,129,.25);
  border-radius: .5rem;
  padding: .5rem .65rem;
}
.fin-label { color: #64748b; font-weight: 600; }
.fin-value { font-weight: 700; color: #e2e8f0; font-variant-numeric: tabular-nums; }
.fin-value--red { color: #f87171; }
.fin-divider { height: 1px; background: rgba(255,255,255,.06); margin: .15rem 0; }
.fin-label-net { font-size: .75rem; font-weight: 800; color: #34d399; letter-spacing: .06em; }
.fin-value-net { font-size: 1.15rem; font-weight: 900; color: #34d399; font-variant-numeric: tabular-nums; }

/* Variant section */
.variant-section { flex-shrink: 0; }
.variant-table { display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,.06); border-radius: .75rem; overflow: hidden; }
.vt-header {
  display: grid;
  grid-template-columns: 70px 60px 80px 1fr 1fr 100px;
  padding: .5rem .85rem;
  background: rgba(255,255,255,.04);
  font-size: .6rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .07em;
}
.vt-row {
  display: grid;
  grid-template-columns: 70px 60px 80px 1fr 1fr 100px;
  padding: .55rem .85rem;
  font-size: .8rem;
  color: #e2e8f0;
  border-top: 1px solid rgba(255,255,255,.04);
  align-items: center;
}
.vt-row:hover { background: rgba(255,255,255,.02); }
.vt-badge { background: rgba(99,102,241,.15); color: #a5b4fc; border-radius: .3rem; padding: .1rem .4rem; font-size: .7rem; font-weight: 700; width: fit-content; }
.vt-good  { color: #34d399; font-weight: 700; }
.vt-waste { color: #f87171; font-weight: 700; }
.vt-rate  { color: #fbbf24; font-weight: 700; }
.vt-empty { font-size: .75rem; color: #334155; padding: 1rem; text-align: center; }

/* Profile empty state */
.profile-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: .75rem;
  color: #334155;
  font-size: .85rem;
}
.pe-icon { font-size: 3.5rem; opacity: .4; }

.profile-fade-enter-active, .profile-fade-leave-active { transition: opacity .18s ease; }
.profile-fade-enter-from,   .profile-fade-leave-to     { opacity: 0; }

/* ══ Cost analysis (View C) ══════════════════════════════════════════════════ */
.cpu-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .85rem;
  flex-shrink: 0;
}
.cpu-kpi {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1rem 1.25rem;
}
.cpu-kpi--highlight {
  border-color: rgba(139,92,246,.3);
  background: linear-gradient(135deg, #1e293b, rgba(139,92,246,.1));
}
.cpu-label { font-size: .6rem; color: #64748b; text-transform: uppercase; letter-spacing: .1em; margin: 0 0 .35rem; }
.cpu-value { font-size: 1.6rem; font-weight: 900; color: #f1f5f9; margin: 0; font-variant-numeric: tabular-nums; }
.cpu-kpi--highlight .cpu-value { color: #c084fc; }

.cost-table-wrap { flex: 1; overflow-y: auto; min-height: 0; }
.cost-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: .8rem;
}
.cost-table thead th {
  text-align: left;
  padding: .4rem .65rem;
  font-size: .6rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .07em;
  border-bottom: 1px solid rgba(255,255,255,.06);
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: #1e293b;
}
.cost-table tbody td { padding: .5rem .65rem; border-bottom: 1px solid rgba(255,255,255,.04); }
.cost-table tbody tr:hover td { background: rgba(255,255,255,.03); }

.op-cell { display: flex; align-items: center; gap: .5rem; }
.op-dot {
  width: 1.75rem; height: 1.75rem;
  border-radius: .35rem;
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 800; color: #fff; flex-shrink: 0;
}
.num    { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: #e2e8f0; }
.red    { color: #f87171; }
.green  { color: #34d399; }
.purple { color: #c084fc; }
.empty-td { text-align: center; color: #334155; padding: 2rem; font-size: .8rem; }

.bar-cell { min-width: 80px; }
.cost-bar-track { background: rgba(255,255,255,.07); border-radius: 999px; height: .45rem; overflow: hidden; }
.cost-bar-fill  { height: 100%; background: linear-gradient(90deg,#7c3aed,#c084fc); border-radius: 999px; transition: width .5s ease; }

/* Period bars */
.week-breakdown { flex-shrink: 0; padding-top: .5rem; border-top: 1px solid rgba(255,255,255,.06); }
.period-bars { display: flex; gap: 1.5rem; align-items: flex-end; height: 5rem; }
.period-item { display: flex; flex-direction: column; align-items: center; gap: .25rem; }
.period-bar-wrap { flex: 1; display: flex; align-items: flex-end; height: 3.5rem; width: 60px; background: rgba(255,255,255,.04); border-radius: .4rem; overflow: hidden; }
.period-bar { width: 100%; background: linear-gradient(180deg,#6366f1,#8b5cf6); border-radius: .4rem; transition: height .4s ease; }
.period-val   { font-size: .82rem; font-weight: 800; color: #a5b4fc; font-variant-numeric: tabular-nums; }
.period-label { font-size: .65rem; color: #475569; font-weight: 700; }

/* ══ Export toast ════════════════════════════════════════════════════════════ */
.export-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg,#1d4ed8,#3b82f6);
  color: #fff;
  border-radius: .65rem;
  padding: .85rem 1.75rem;
  font-size: .9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: .5rem;
  z-index: 100;
  white-space: nowrap;
}
.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
