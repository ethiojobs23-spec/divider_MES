<template>
  <TabletLayout>
    <div class="emp-root">

      <!-- ══════════════════════════════════════════════════════════════════
           LEFT SUB-NAV — View tabs (mirrors ExecutiveAnalytics pattern)
           ══════════════════════════════════════════════════════════════════ -->
      <aside class="view-nav">
        <p class="nav-heading">EMPLOYEE VIEWS</p>

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

        <!-- Selected Operator Chip -->
        <div class="selected-op-block" v-if="selectedOp">
          <p class="nav-heading" style="margin-top:1rem">SELECTED OPERATOR</p>
          <div class="selected-op-card">
            <div class="op-avatar-sm" :class="selectedOp.color">{{ selectedOp.avatar }}</div>
            <div class="op-info">
              <p class="op-name-sm">{{ selectedOp.name }}</p>
              <p class="op-role-sm">{{ selectedOp.role }}</p>
            </div>
            <div class="op-status-dot" :class="selectedOp.status === 'active' ? 'dot--green' : 'dot--red'" />
          </div>
        </div>

        <!-- Export-style action button at bottom -->
        <button class="action-bottom-btn" @click="handleClockOut">
          <span class="material-symbols-rounded">logout</span>
          Clock Out Operator
        </button>
      </aside>

      <!-- ══════════════════════════════════════════════════════════════════
           MAIN CONTENT AREA
           ══════════════════════════════════════════════════════════════════ -->
      <main class="view-area">

        <!-- ─── VIEW A: Operator Roster & Assignment ──────────────────── -->
        <Transition name="view-fade" mode="out-in">
          <section v-if="activeView === 'roster'" class="view-panel" key="roster">

            <div class="panel-header">
              <h2 class="panel-title">Operator Roster & Shift Status</h2>
              <p class="panel-sub">Select an operator · Manage current shift assignment and real-time status</p>
            </div>

            <div class="employee-layout">

              <!-- Left: operator list -->
              <div class="operator-list">
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
                  :class="{ 'op-card--active': selectedOp?.id === op.id }"
                  @click="selectedOp = op"
                >
                  <div class="op-avatar-sm" :class="op.color">{{ op.avatar }}</div>
                  <div class="op-info">
                    <p class="op-name-sm">{{ op.name }}</p>
                    <p class="op-role-sm">{{ op.role }}</p>
                  </div>
                  <div class="op-status-dot" :class="op.status === 'active' ? 'dot--green' : 'dot--red'" />
                </button>

                <p v-if="filteredOperators.length === 0" class="empty-note">No operators found</p>
              </div>

              <!-- Right: detail card -->
              <div class="profile-area">
                <Transition name="profile-fade" mode="out-in">
                  <div v-if="selectedOp" class="profile-card" :key="selectedOp.id">

                    <!-- Profile header -->
                    <div class="profile-hdr">
                      <div class="profile-avatar" :class="selectedOp.color">{{ selectedOp.avatar }}</div>
                      <div>
                        <h3 class="profile-name">{{ selectedOp.name }}</h3>
                        <p class="profile-role-label">{{ selectedOp.role }}</p>
                      </div>
                      <div class="profile-badge" :class="selectedOp.status === 'active' ? 'badge--ok' : 'badge--critical'">
                        {{ selectedOp.status === 'active' ? 'On Shift' : 'Off Shift' }}
                      </div>
                    </div>

                    <!-- Assignment metrics -->
                    <div class="metric-section">
                      <p class="section-title">
                        <span class="material-symbols-rounded">assignment</span>
                        Current Assignment
                      </p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Line</span>
                          <span class="m-value m-value--good">{{ selectedOp.line }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Station</span>
                          <span class="m-value m-value--good">{{ selectedOp.station }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Shift</span>
                          <span class="m-value">{{ selectedOp.shift }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Start Time</span>
                          <span class="m-value">{{ selectedOp.startTime }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Attendance metrics -->
                    <div class="metric-section">
                      <p class="section-title">
                        <span class="material-symbols-rounded">calendar_month</span>
                        Attendance This Week
                      </p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Days Attended</span>
                          <span class="m-value m-value--good">{{ selectedOp.daysAttended }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Expected Days</span>
                          <span class="m-value">{{ selectedOp.expectedDays }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Attendance Rate</span>
                          <span class="m-value" :class="attendanceRate(selectedOp) >= 80 ? 'm-value--good' : 'm-value--bad'">
                            {{ attendanceRate(selectedOp) }}%
                          </span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Hours Logged</span>
                          <span class="m-value">{{ selectedOp.hoursLogged }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Recent Alerts -->
                    <div class="alert-section">
                      <p class="section-title">
                        <span class="material-symbols-rounded">notifications</span>
                        Recent Alerts
                      </p>
                      <div v-for="alert in selectedOp.alerts" :key="alert.id"
                           class="alert-item" :class="'alert-item--' + alert.type">
                        <span class="material-symbols-rounded alert-icon">{{ alert.icon }}</span>
                        <div class="alert-body">
                          <strong>{{ alert.label }}</strong>
                          <p>{{ alert.message }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Shift Action Buttons -->
                    <div class="shift-actions">
                      <button class="shift-btn shift-btn--break">
                        <span class="material-symbols-rounded">free_breakfast</span>
                        LOG BREAK
                      </button>
                      <button class="shift-btn shift-btn--end">
                        <span class="material-symbols-rounded">power_settings_new</span>
                        END SHIFT
                      </button>
                    </div>

                  </div>
                  <!-- Empty state -->
                  <div v-else class="profile-empty" key="empty">
                    <span class="material-symbols-rounded pe-icon">person_search</span>
                    <p>Select an operator from the list to view their profile</p>
                  </div>
                </Transition>
              </div>

            </div>
          </section>
        </Transition>

        <!-- ─── VIEW B: Performance & Production Logs ─────────────────── -->
        <Transition name="view-fade" mode="out-in">
          <section v-if="activeView === 'performance'" class="view-panel" key="performance">

            <div class="panel-header">
              <h2 class="panel-title">Operator Performance & Production Logs</h2>
              <p class="panel-sub">Daily KPIs · Units produced · Waste tracking · Efficiency rates</p>
            </div>

            <!-- KPI Cards (same as ExecutiveAnalytics) -->
            <div class="kpi-grid">
              <AnalyticsDataCard
                title="Total Units (Today)"
                value="1,402"
                icon="inventory_2"
                icon-bg="rgba(99,102,241,.15)"
                icon-color="#a5b4fc"
                :trend="12"
              />
              <AnalyticsDataCard
                title="Efficiency %"
                value="98.4%"
                icon="trending_up"
                icon-bg="rgba(16,185,129,.15)"
                icon-color="#34d399"
                :trend="2"
              />
              <AnalyticsDataCard
                title="Total Waste"
                value="07 pcs"
                icon="delete_sweep"
                icon-bg="rgba(239,68,68,.12)"
                icon-color="#f87171"
                :trend="-5"
                :trend-up-is-bad="true"
              />
            </div>

            <!-- Activity Logs Table (same chart-card style as ExecutiveAnalytics) -->
            <div class="chart-card" style="flex:1;min-height:0">
              <div class="card-hdr">
                <span class="material-symbols-rounded" style="color:#a5b4fc">history</span>
                <div>
                  <p class="card-hdr-title">Production Activity Log</p>
                  <p class="card-hdr-sub">Real-time shift entries for {{ selectedOp?.name ?? 'selected operator' }}</p>
                </div>
                <div class="badge" style="margin-left:auto">Today</div>
              </div>

              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Variant</th>
                      <th>Size</th>
                      <th>Placement</th>
                      <th class="num">Quantity</th>
                      <th class="num">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(log, idx) in activityLogs" :key="idx"
                        :class="{ 'row-error': log.status === 'REJECT' }">
                      <td class="font-mono">{{ log.time }}</td>
                      <td class="val-purple bold">{{ log.variant }}</td>
                      <td class="val-muted">{{ log.size }}</td>
                      <td class="val-muted">{{ log.placement }}</td>
                      <td class="num val-main">{{ log.qty }}</td>
                      <td class="num">
                        <span class="row-badge" :class="log.status === 'REJECT' ? 'row-badge--red' : 'row-badge--green'">
                          {{ log.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="chart-legend">
                <div class="leg-item"><span class="leg-dot" style="background:#34d399"/> Good Production</div>
                <div class="leg-item"><span class="leg-dot" style="background:#ef4444"/> Waste / Reject</div>
              </div>
            </div>

          </section>
        </Transition>

        <!-- ─── VIEW C: Financial History & Advances ───────────────────── -->
        <Transition name="view-fade" mode="out-in">
          <section v-if="activeView === 'financials'" class="view-panel" key="financials">

            <div class="panel-header">
              <h2 class="panel-title">Financial History & Advances</h2>
              <p class="panel-sub">Ledger transactions · Advance requests · Policy limits · {{ selectedOp?.name ?? 'No operator selected' }}</p>
            </div>

            <!-- Balance KPIs -->
            <div class="kpi-grid kpi-grid--2col">
              <AnalyticsDataCard
                title="Current Balance"
                value="ETB 1,240"
                icon="account_balance"
                icon-bg="rgba(16,185,129,.15)"
                icon-color="#34d399"
              />
              <AnalyticsDataCard
                title="Last Advance (Oct 24)"
                value="ETB 200"
                icon="money_off"
                icon-bg="rgba(239,68,68,.12)"
                icon-color="#f87171"
                trend-label="deducted"
              />
            </div>

            <!-- Two-column layout: ledger + actions -->
            <div class="fin-layout">

              <!-- Left: Transaction Ledger -->
              <div class="chart-card" style="flex:2;min-height:0">
                <div class="card-hdr">
                  <span class="material-symbols-rounded" style="color:#a5b4fc">receipt_long</span>
                  <div>
                    <p class="card-hdr-title">Transaction Ledger</p>
                    <p class="card-hdr-sub">Full financial history — advances, payroll deposits, expenses</p>
                  </div>
                  <button class="badge-btn" style="margin-left:auto">
                    <span class="material-symbols-rounded" style="font-size:1rem">print</span>
                    Print
                  </button>
                </div>

                <div class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th class="num">Amount (ETB)</th>
                        <th class="num">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(tx, idx) in transactions" :key="idx"
                          :style="tx.old ? 'opacity:0.45' : ''">
                        <td class="font-mono val-muted">{{ tx.date }}</td>
                        <td>
                          <span class="material-symbols-rounded icon-inline">{{ tx.icon }}</span>
                          <span :class="tx.colorClass">{{ tx.type }}</span>
                        </td>
                        <td class="num bold" :class="tx.colorClass">{{ tx.amount }}</td>
                        <td class="num">
                          <span class="row-badge" :class="tx.badgeClass">{{ tx.status }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Verification block -->
                <div class="verify-block">
                  <div class="verify-hdr">
                    <span class="val-muted" style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Latest Verification</span>
                    <span class="val-purple" style="font-size:.7rem;font-weight:700">REF: ADV-8921-X</span>
                  </div>
                  <div class="sig-placeholder">
                    <span class="material-symbols-rounded" style="font-size:2rem;color:#334155">draw</span>
                    <span class="val-muted" style="font-size:.75rem">Digital Signature Capture</span>
                  </div>
                </div>
              </div>

              <!-- Right: Actions + Policy -->
              <div class="fin-actions-col">
                <button class="fin-action-btn fin-action-btn--primary">
                  <span class="material-symbols-rounded">account_balance_wallet</span>
                  REQUEST ADVANCE
                </button>
                <button class="fin-action-btn fin-action-btn--secondary">
                  <span class="material-symbols-rounded">receipt_long</span>
                  LOG EXPENSE
                </button>

                <!-- Policy Limits card (same .chart-card style) -->
                <div class="chart-card" style="margin-top:auto">
                  <div class="card-hdr">
                    <span class="material-symbols-rounded" style="color:#fbbf24">policy</span>
                    <div>
                      <p class="card-hdr-title">Advance Policy Limits</p>
                    </div>
                  </div>

                  <div class="policy-rows">
                    <div class="policy-row">
                      <span class="m-label">Max Monthly Advance</span>
                      <span class="m-value">500 ETB</span>
                    </div>
                    <div class="policy-row">
                      <span class="m-label">Remaining This Month</span>
                      <span class="m-value m-value--good">300 ETB</span>
                    </div>
                    <div class="policy-row">
                      <span class="m-label">Approval Required Above</span>
                      <span class="m-value m-value--bad">150 ETB</span>
                    </div>
                  </div>

                  <div class="policy-warning">
                    <span class="material-symbols-rounded" style="font-size:1rem;color:#fbbf24">warning</span>
                    <p>Requests exceeding threshold require supervisor override.</p>
                  </div>
                </div>
              </div>

            </div>
          </section>
        </Transition>

      </main>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toastVisible" class="toast-msg">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toastMessage }}
        </div>
      </Transition>

    </div>
  </TabletLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import TabletLayout from '@/components/layout/TabletLayout.vue'
import AnalyticsDataCard from '@/components/ui/AnalyticsDataCard.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ── Tab definitions (identical pattern to ExecutiveAnalytics) ─────────────────
const TABS = [
  { id: 'roster',      icon: 'badge',                  title: 'Operator Roster',    sub: 'Status & assignment'    },
  { id: 'performance', icon: 'precision_manufacturing', title: 'Performance Logs',   sub: 'KPIs & daily output'    },
  { id: 'financials',  icon: 'account_balance_wallet',  title: 'Financial Overview', sub: 'Advances & expenses'    },
]
const activeView = ref('roster')

// ── Operator list (pulls from store + adds extra fields) ─────────────────────
const operatorExtras = {
  1: { status: 'active', line: '02', station: 'A', shift: 'Shift A', startTime: '06:00 AM', hoursLogged: '06:42:15', daysAttended: 5, expectedDays: 6,
       alerts: [
         { id: 1, type: 'info',  icon: 'info',    label: 'SYSTEM MSG - 06:15 AM',     message: 'Clock-in successful. Daily quota updated.' },
         { id: 2, type: 'warn',  icon: 'warning', label: 'SAFETY REMINDER - 08:00 AM', message: 'PPE check required before Sector 7 transition.' },
       ]},
  2: { status: 'active', line: '04', station: 'B', shift: 'Shift B', startTime: '06:14 AM', hoursLogged: '08:10:00', daysAttended: 6, expectedDays: 6,
       alerts: [
         { id: 1, type: 'info', icon: 'info', label: 'SYSTEM MSG - 06:14 AM', message: 'Clock-in successful.' },
       ]},
  3: { status: 'active', line: '01', station: 'C', shift: 'Shift A', startTime: '06:00 AM', hoursLogged: '07:30:00', daysAttended: 4, expectedDays: 6,
       alerts: [] },
  4: { status: 'active', line: '03', station: 'A', shift: 'Shift A', startTime: '06:00 AM', hoursLogged: '05:00:00', daysAttended: 6, expectedDays: 6,
       alerts: [] },
  5: { status: 'active', line: '02', station: 'D', shift: 'Shift B', startTime: '14:00 PM', hoursLogged: '04:00:00', daysAttended: 5, expectedDays: 6,
       alerts: [] },
  6: { status: 'inactive', line: '—',  station: '—',  shift: 'Off',     startTime: '—',        hoursLogged: '00:00:00', daysAttended: 4, expectedDays: 6,
       alerts: [] },
}

const operators = computed(() =>
  store.operators.map(op => ({ ...op, ...(operatorExtras[op.id] ?? {}) }))
)

// Search + selection
const empSearch = ref('')
const filteredOperators = computed(() => {
  const q = empSearch.value.trim().toLowerCase()
  return q ? operators.value.filter(o => o.name.toLowerCase().includes(q)) : operators.value
})

const selectedOp = ref(null)

const attendanceRate = (op) =>
  op.expectedDays > 0 ? Math.round((op.daysAttended / op.expectedDays) * 100) : 0

// ── Activity logs ─────────────────────────────────────────────────────────────
const activityLogs = ref([
  { time: '14:30:22', variant: 'PT-X99-ALPHA', size: '9cm', placement: 'ብተና',  qty: '250', status: 'OK'     },
  { time: '13:45:10', variant: 'PT-X99-BETA',  size: '7cm', placement: 'ውስጥ',  qty: '120', status: 'OK'     },
  { time: '12:15:05', variant: 'PT-X99-ALPHA', size: '9cm', placement: 'ብተና',  qty: '500', status: 'OK'     },
  { time: '11:02:44', variant: 'PT-X99-GAMMA', size: '7cm', placement: 'የተለየ', qty: '07',  status: 'REJECT' },
  { time: '09:30:00', variant: 'PT-X99-ALPHA', size: '9cm', placement: 'ብተና',  qty: '525', status: 'OK'     },
])

// ── Transactions ──────────────────────────────────────────────────────────────
const transactions = ref([
  { date: '24 OCT 2023', type: 'ADVANCE',     amount: '−200.00', status: 'CLEARED', icon: 'call_made', colorClass: 'val-red',    badgeClass: 'row-badge--yellow', old: false },
  { date: '15 OCT 2023', type: 'TOOL EXPENSE',amount: '45.00',   status: 'LOGGED',  icon: 'inventory', colorClass: 'val-purple', badgeClass: 'row-badge--neutral', old: false },
  { date: '01 OCT 2023', type: 'PAYROLL DEP', amount: '+1,400.00',status: 'CLEARED',icon: 'payments',  colorClass: 'val-green',  badgeClass: 'row-badge--green', old: false },
  { date: '12 SEP 2023', type: 'ADVANCE',     amount: '−150.00', status: 'CLEARED', icon: 'call_made', colorClass: 'val-red',    badgeClass: 'row-badge--yellow', old: true  },
])

// ── Toast ─────────────────────────────────────────────────────────────────────
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2500)
}

function handleClockOut() {
  if (selectedOp.value) {
    showToast(`${selectedOp.value.name} clocked out successfully`)
  }
}
</script>

<style scoped>
/* ══ Root — same flex pattern as analytics-root ══════════════════════════════ */
.emp-root {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ══ Left sub-nav — EXACT copy of ExecutiveAnalytics .view-nav ═══════════════ */
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

/* Selected operator chip in nav */
.selected-op-card {
  display: flex;
  align-items: center;
  gap: .6rem;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .65rem;
  padding: .6rem .75rem;
}
.op-status-dot {
  width: 8px; height: 8px; border-radius: 50%; margin-left: auto; flex-shrink: 0;
}
.dot--green { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,.6); }
.dot--red   { background: #ef4444; }

/* Bottom action button — mirrors .export-btn from ExecutiveAnalytics */
.action-bottom-btn {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .75rem 1rem;
  background: linear-gradient(135deg,#ef4444,#dc2626);
  border: none;
  border-radius: .75rem;
  color: #fff;
  font-size: .8rem;
  font-weight: 800;
  cursor: pointer;
  transition: filter .15s ease, transform .08s ease;
}
.action-bottom-btn:hover  { filter: brightness(1.1); }
.action-bottom-btn:active { transform: scale(.97); }

/* ══ Main view area — EXACT copy of ExecutiveAnalytics .view-area ════════════ */
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
.panel-sub { font-size: .7rem; color: #64748b; margin: .2rem 0 0; }

.view-fade-enter-active, .view-fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.view-fade-enter-from { opacity: 0; transform: translateX(12px); }
.view-fade-leave-to   { opacity: 0; transform: translateX(-12px); }

/* ══ KPI Grid — EXACT copy ═══════════════════════════════════════════════════ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .85rem;
  flex-shrink: 0;
}
.kpi-grid--2col { grid-template-columns: repeat(2, 1fr); }

/* ══ Chart card — EXACT copy ════════════════════════════════════════════════ */
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
.card-hdr { display: flex; align-items: center; gap: .65rem; flex-shrink: 0; }
.card-hdr .material-symbols-rounded { font-size: 1.3rem; }
.card-hdr-title { font-size: .88rem; font-weight: 800; color: #f1f5f9; }
.card-hdr-sub   { font-size: .62rem; color: #64748b; }
.badge {
  background: rgba(99,102,241,.15);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  font-size: .6rem;
  font-weight: 700;
  padding: .15rem .5rem;
  border-radius: 999px;
}

/* ══ Table — based on ExecutiveAnalytics .cost-table ════════════════════════ */
.table-scroll { flex: 1; overflow-y: auto; min-height: 0; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .8rem;
}
.data-table th, .data-table td {
  padding: .65rem .75rem;
  border-bottom: 1px solid rgba(255,255,255,.05);
  text-align: left;
}
.data-table th {
  background: #0f172a;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-size: .65rem;
  position: sticky; top: 0; z-index: 1;
}
.data-table tbody tr:hover td { background: rgba(255,255,255,.03); }
.row-error td { background: rgba(239,68,68,.06) !important; }

.num       { text-align: right; font-variant-numeric: tabular-nums; }
.bold      { font-weight: 700; }
.font-mono { font-variant-numeric: tabular-nums; }
.val-main   { color: #f1f5f9; font-weight: 700; font-size: .9rem; }
.val-purple { color: #c084fc; }
.val-green  { color: #34d399; }
.val-red    { color: #f87171; }
.val-muted  { color: #94a3b8; }
.icon-inline { font-size: .9rem !important; vertical-align: middle; margin-right: .3rem; }

.row-badge {
  display: inline-block;
  padding: .12rem .5rem;
  border-radius: .3rem;
  font-size: .6rem;
  font-weight: 800;
  text-transform: uppercase;
}
.row-badge--green  { background: rgba(16,185,129,.15);  color: #34d399; }
.row-badge--red    { background: rgba(239,68,68,.15);   color: #f87171; }
.row-badge--yellow { background: rgba(245,158,11,.15);  color: #fbbf24; }
.row-badge--neutral{ background: rgba(100,116,139,.15); color: #94a3b8; }

.chart-legend { display: flex; gap: 1rem; flex-shrink: 0; }
.leg-item { display: flex; align-items: center; gap: .35rem; font-size: .65rem; color: #64748b; }
.leg-dot  { width: .5rem; height: .5rem; border-radius: 50%; flex-shrink: 0; }

/* ══ Roster view — Employee layout (EXACT copy from ExecutiveAnalytics) ══════ */
.employee-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

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

.search-wrap { position: relative; flex-shrink: 0; margin-bottom: .25rem; }
.search-icon {
  position: absolute; left: .6rem; top: 50%;
  transform: translateY(-50%); font-size: 1rem; color: #475569;
}
.search-input {
  width: 100%; background: #0f172a;
  border: 1px solid rgba(255,255,255,.08); border-radius: .55rem;
  padding: .55rem .75rem .55rem 2.2rem;
  font-size: .8rem; color: #e2e8f0; outline: none; font-family: inherit;
}
.search-input:focus { border-color: rgba(99,102,241,.4); }
.search-input::placeholder { color: #334155; }

.op-card {
  display: flex; align-items: center; gap: .65rem; padding: .65rem;
  border-radius: .65rem; border: 1px solid rgba(255,255,255,.05);
  background: #0f172a; cursor: pointer; text-align: left;
  transition: all .15s ease; -webkit-tap-highlight-color: transparent;
}
.op-card:hover { border-color: rgba(255,255,255,.1); background: rgba(255,255,255,.03); }
.op-card--active { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.4); }

.op-avatar-sm {
  width: 2.25rem; height: 2.25rem; border-radius: .5rem;
  display: flex; align-items: center; justify-content: center;
  font-size: .85rem; font-weight: 800; color: #fff; flex-shrink: 0;
}
.op-info { flex: 1; min-width: 0; }
.op-name-sm  { font-size: .82rem; font-weight: 700; color: #f1f5f9; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.op-role-sm  { font-size: .62rem; color: #64748b; margin: 0; }
.empty-note  { font-size: .75rem; color: #334155; text-align: center; padding: 1rem 0; }

/* Profile area */
.profile-area { flex: 1; min-width: 0; overflow-y: auto; }
.profile-fade-enter-active, .profile-fade-leave-active { transition: opacity .18s ease, transform .18s ease; }
.profile-fade-enter-from { opacity: 0; transform: translateY(8px); }
.profile-fade-leave-to   { opacity: 0; }

.profile-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
  min-height: 100%;
}
.profile-hdr { display: flex; align-items: center; gap: .85rem; flex-shrink: 0; }
.profile-avatar {
  width: 3.5rem; height: 3.5rem; border-radius: .85rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; font-weight: 800; color: #fff; flex-shrink: 0;
}
.profile-name { font-size: 1.2rem; font-weight: 900; color: #f1f5f9; margin: 0; }
.profile-role-label { font-size: .72rem; color: #94a3b8; margin: 0; }
.profile-badge {
  margin-left: auto; padding: .25rem .65rem; border-radius: 999px;
  font-size: .65rem; font-weight: 700;
}
.badge--ok       { background: rgba(16,185,129,.15); color: #34d399; }
.badge--critical { background: rgba(239,68,68,.15);  color: #f87171; }
.badge--warn     { background: rgba(245,158,11,.15); color: #fbbf24; }

.metric-section {
  background: #0f172a; border: 1px solid rgba(255,255,255,.05);
  border-radius: .75rem; padding: .9rem 1rem;
  display: flex; flex-direction: column; gap: .65rem; flex-shrink: 0;
}
.section-title {
  display: flex; align-items: center; gap: .4rem;
  font-size: .7rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .08em; margin: 0;
}
.section-title .material-symbols-rounded { font-size: 1rem; color: #6366f1; }
.metric-row { display: flex; gap: .85rem; }
.metric-item { flex: 1; display: flex; flex-direction: column; gap: .2rem; }
.m-label { font-size: .62rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.m-value { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.m-value--good { color: #34d399; }
.m-value--bad  { color: #f87171; }

/* Alerts */
.alert-section { display: flex; flex-direction: column; gap: .5rem; }
.alert-item {
  display: flex; align-items: flex-start; gap: .65rem;
  padding: .65rem .85rem; border-radius: .5rem;
  border-left: 3px solid;
}
.alert-item--info { background: rgba(99,102,241,.08); border-color: #6366f1; }
.alert-item--warn { background: rgba(245,158,11,.08); border-color: #f59e0b; }
.alert-icon { font-size: 1.1rem; margin-top: .05rem; }
.alert-item--info .alert-icon { color: #818cf8; }
.alert-item--warn .alert-icon { color: #fbbf24; }
.alert-body strong { display: block; font-size: .68rem; font-weight: 800; color: #e2e8f0; margin-bottom: .15rem; }
.alert-body p { font-size: .75rem; color: #94a3b8; margin: 0; }

/* Shift actions */
.shift-actions { display: flex; gap: .85rem; margin-top: auto; }
.shift-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: .5rem; height: 3.75rem; border-radius: .75rem;
  font-size: .9rem; font-weight: 800; letter-spacing: .04em;
  border: none; cursor: pointer; transition: filter .15s, transform .08s;
  color: #fff;
}
.shift-btn:hover  { filter: brightness(1.1); }
.shift-btn:active { transform: scale(.97); }
.shift-btn--break { background: linear-gradient(135deg,#6366f1,#8b5cf6); }
.shift-btn--end   { background: linear-gradient(135deg,#ef4444,#dc2626); }

/* Empty state */
.profile-empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem;
  color: #334155;
}
.pe-icon { font-size: 4rem !important; }
.profile-empty p { font-size: .9rem; }

/* ══ Financials layout ═══════════════════════════════════════════════════════ */
.fin-layout {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.fin-actions-col {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.fin-action-btn {
  width: 100%; height: 5rem; border-radius: .85rem;
  border: none; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: .35rem; font-size: .85rem; font-weight: 800; letter-spacing: .04em;
  transition: filter .15s, transform .08s;
  color: #fff;
}
.fin-action-btn .material-symbols-rounded { font-size: 1.5rem; }
.fin-action-btn:hover  { filter: brightness(1.1); }
.fin-action-btn:active { transform: scale(.97); }
.fin-action-btn--primary   { background: linear-gradient(135deg,#6366f1,#8b5cf6); }
.fin-action-btn--secondary { background: #1e293b; border: 1px solid rgba(255,255,255,.1); color: #94a3b8; }

.badge-btn {
  display: flex; align-items: center; gap: .3rem; margin-left: auto;
  background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc; font-size: .7rem; font-weight: 700;
  padding: .25rem .65rem; border-radius: .4rem; cursor: pointer;
  transition: background .15s;
}
.badge-btn:hover { background: rgba(99,102,241,.22); }

.policy-rows { display: flex; flex-direction: column; gap: .65rem; }
.policy-row { display: flex; justify-content: space-between; align-items: center; }

.policy-warning {
  display: flex; align-items: flex-start; gap: .5rem;
  background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.2);
  border-radius: .5rem; padding: .6rem .75rem;
}
.policy-warning p { font-size: .7rem; color: #92400e; margin: 0; line-height: 1.4; }

/* Verification block */
.verify-block {
  background: #0f172a; border: 1px solid rgba(255,255,255,.05);
  border-radius: .65rem; padding: .75rem; flex-shrink: 0;
}
.verify-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.sig-placeholder {
  height: 5rem; border: 1px dashed rgba(255,255,255,.1);
  border-radius: .5rem; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: .4rem;
}

/* ══ Toast ═══════════════════════════════════════════════════════════════════ */
.toast-msg {
  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,.9); color: #fff;
  border-radius: .65rem; padding: .75rem 1.5rem;
  font-size: .9rem; font-weight: 700;
  display: flex; align-items: center; gap: .4rem;
  backdrop-filter: blur(8px); z-index: 999;
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>
