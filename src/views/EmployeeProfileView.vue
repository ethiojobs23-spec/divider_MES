<template>
  <TabletLayout>
    <div class="analytics-root">

      <!-- ══════════════════════════════════════════════════════════════════
           LEFT NAV — View tabs
           ══════════════════════════════════════════════════════════════════ -->
      <aside class="view-nav">
        <p class="nav-heading">EMPLOYEE PROFILE VIEWS</p>

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

        <!-- Current Operator Info Card in Nav -->
        <div class="current-operator" v-if="currentEmployee">
          <p class="nav-heading" style="margin-top: 1.5rem">SELECTED OPERATOR</p>
          <div class="op-nav-card">
            <div class="op-nav-avatar" :class="currentEmployee.status === 'active' ? 'bg-green' : 'bg-red'">
              {{ currentEmployee.initials }}
            </div>
            <div class="op-nav-info">
              <span class="op-nav-name">{{ currentEmployee.name }}</span>
              <span class="op-nav-role">{{ currentEmployee.level }}</span>
            </div>
          </div>
        </div>

      </aside>

      <!-- ══════════════════════════════════════════════════════════════════
           MAIN CONTENT AREA
           ══════════════════════════════════════════════════════════════════ -->
      <main class="view-area">

        <!-- ─── VIEW A: Roster & Dashboard ──────────────────────── -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'dashboard'" class="view-panel" key="dashboard">

          <div class="panel-header">
            <h2 class="panel-title">Operator Context & Roster</h2>
            <p class="panel-sub">Select an operator and manage current shift status</p>
          </div>

          <div class="employee-layout">
            <!-- Left: operator list -->
            <div class="operator-list">
              <div class="search-wrap">
                <span class="material-symbols-rounded search-icon">search</span>
                <input class="search-input" placeholder="Search operator…" type="text" />
              </div>

              <button
                v-for="op in teamMembers"
                :key="op.id"
                class="op-card"
                :class="{ 'op-card--active': currentEmployee.id === op.id }"
                @click="currentEmployee = op"
              >
                <div class="op-avatar" :class="op.status === 'active' ? 'text-green border-green' : 'text-slate'">
                  {{ op.initials }}
                </div>
                <div class="op-info">
                  <p class="op-name">{{ op.name }}</p>
                  <p class="op-role">{{ op.level }}</p>
                </div>
                <div class="op-status-dot" :class="op.status === 'active' ? 'bg-green' : 'bg-red'" />
              </button>
            </div>

            <!-- Right: Current Assignment & Actions -->
            <div class="profile-area">
              <div class="profile-card" style="height: 100%;">
                <div class="profile-hdr">
                  <div class="profile-avatar bg-indigo">{{ currentEmployee.initials }}</div>
                  <div>
                    <h3 class="profile-name">{{ currentEmployee.name }}</h3>
                    <p class="profile-role">ID: {{ currentEmployee.empId }} · {{ currentEmployee.shift }}</p>
                  </div>
                  <div class="profile-badge badge--ok" v-if="currentEmployee.status === 'active'">
                    <span class="material-symbols-rounded" style="font-size:12px">check_circle</span> ACTIVE
                  </div>
                </div>

                <div class="metric-section" style="margin-top: 1.5rem">
                  <p class="section-title"><span class="material-symbols-rounded">assignment</span> Current Assignment</p>
                  <div class="metric-row">
                    <div class="metric-item">
                      <span class="m-label">Line</span>
                      <span class="m-value m-value--good">04</span>
                    </div>
                    <div class="metric-item">
                      <span class="m-label">Station</span>
                      <span class="m-value m-value--good">B</span>
                    </div>
                    <div class="metric-item">
                      <span class="m-label">Start Time</span>
                      <span class="m-value">06:14 AM</span>
                    </div>
                  </div>
                </div>

                <div class="metric-section" style="margin-top: 1.5rem">
                  <p class="section-title"><span class="material-symbols-rounded">warning</span> Recent Alerts</p>
                  <div class="alert-box alert-box--info">
                    <span class="material-symbols-rounded">info</span>
                    <div>
                      <strong>SYSTEM MSG - 06:15 AM</strong>
                      <p>Clock-in successful. Daily quota updated.</p>
                    </div>
                  </div>
                  <div class="alert-box alert-box--warn">
                    <span class="material-symbols-rounded">warning</span>
                    <div>
                      <strong>SAFETY REMINDER - 08:00 AM</strong>
                      <p>Standard PPE check required before transitioning to Sector 7.</p>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="action-grid" style="margin-top: auto; padding-top: 2rem;">
                  <button class="btn-action btn-action--primary">
                    <span class="material-symbols-rounded">free_breakfast</span> LOG BREAK
                  </button>
                  <button class="btn-action btn-action--danger">
                    <span class="material-symbols-rounded">power_settings_new</span> END SHIFT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        </Transition>

        <!-- ─── VIEW B: Performance Logs ──────────────────────── -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'performance'" class="view-panel" key="performance">

          <div class="panel-header">
            <h2 class="panel-title">Operator Performance: {{ currentEmployee.name }}</h2>
            <p class="panel-sub">Daily units produced, efficiency rate, and detailed activity logs</p>
          </div>

          <!-- KPI Row -->
          <div class="kpi-grid">
            <AnalyticsDataCard
              title="TOTAL UNITS (TODAY)"
              value="1,402"
              icon="inventory_2"
              icon-bg="rgba(99,102,241,.15)"
              icon-color="#a5b4fc"
            />
            <AnalyticsDataCard
              title="EFFICIENCY %"
              value="98.4%"
              icon="trending_up"
              icon-bg="rgba(16,185,129,.15)"
              icon-color="#34d399"
              :trend="2"
            />
            <AnalyticsDataCard
              title="TOTAL WASTE"
              value="07"
              icon="delete"
              icon-bg="rgba(239,68,68,.12)"
              icon-color="#f87171"
              :trend="-1"
              :trendUpIsBad="true"
            />
          </div>

          <!-- Activity Logs Table -->
          <div class="chart-card" style="flex:1;min-height:0;overflow:hidden;margin-top:1rem;">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#a5b4fc">history</span>
              <div>
                <p class="card-hdr-title">Recent Activity Logs</p>
                <p class="card-hdr-sub">Production logs for the current shift</p>
              </div>
            </div>

            <div class="cost-table-wrap">
              <table class="cost-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Variant</th>
                    <th class="num">Quantity</th>
                    <th class="num">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(log, idx) in activityLogs" :key="idx" :class="{'row-error': log.status === 'REJECT'}">
                    <td>{{ log.time }}</td>
                    <td class="purple" style="font-weight: 700">{{ log.variant }}</td>
                    <td class="num">{{ log.qty }}</td>
                    <td class="num">
                      <span class="status-badge" :class="log.status === 'REJECT' ? 'badge--critical' : 'badge--ok'">
                        {{ log.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </section>
        </Transition>

        <!-- ─── VIEW C: Financials ──────────────────────── -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'financials'" class="view-panel" key="financials">

          <div class="panel-header">
            <h2 class="panel-title">Financial History & Advances</h2>
            <p class="panel-sub">Ledger records and advance requests for {{ currentEmployee.name }}</p>
          </div>

          <!-- KPI Row -->
          <div class="kpi-grid" style="grid-template-columns: repeat(2, 1fr);">
            <AnalyticsDataCard
              title="CURRENT BALANCE"
              value="1,240 ETB"
              icon="account_balance"
              icon-bg="rgba(16,185,129,.15)"
              icon-color="#34d399"
            />
            <AnalyticsDataCard
              title="LAST ADVANCE"
              value="200 ETB"
              icon="money_off"
              icon-bg="rgba(239,68,68,.12)"
              icon-color="#f87171"
              trendLabel="OCT 24"
            />
          </div>

          <div class="employee-layout" style="margin-top: 1rem;">
            <!-- Left: Transactions Ledger -->
            <div class="chart-card" style="flex: 2; height: 100%; overflow: hidden;">
              <div class="card-hdr">
                <span class="material-symbols-rounded" style="color:#a5b4fc">receipt_long</span>
                <div>
                  <p class="card-hdr-title">Transaction Ledger</p>
                  <p class="card-hdr-sub">Detailed financial history</p>
                </div>
              </div>
              <div class="cost-table-wrap">
                <table class="cost-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th class="num">Amount (ETB)</th>
                      <th class="num">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(tx, idx) in transactions" :key="idx" :style="tx.old ? 'opacity: 0.5' : ''">
                      <td>{{ tx.date }}</td>
                      <td :class="tx.color">
                        <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">{{ tx.icon }}</span>
                        {{ tx.type }}
                      </td>
                      <td class="num" :class="tx.color">{{ tx.amount }}</td>
                      <td class="num">
                        <span class="status-badge" :class="tx.badgeClass">
                          {{ tx.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Right: Actions & Limits -->
            <div class="profile-area" style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
              <button class="btn-action btn-action--primary" style="padding: 2rem;">
                <span class="material-symbols-rounded" style="font-size: 2rem; margin-bottom: .5rem;">account_balance_wallet</span>
                <div>REQUEST ADVANCE</div>
              </button>
              <button class="btn-action btn-action--secondary" style="padding: 2rem;">
                <span class="material-symbols-rounded" style="font-size: 2rem; margin-bottom: .5rem;">receipt_long</span>
                <div>LOG EXPENSE</div>
              </button>

              <div class="metric-section" style="margin-top: auto; background: #1e293b; padding: 1.5rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.07);">
                <p class="section-title"><span class="material-symbols-rounded">policy</span> Policy Limits</p>
                <div class="metric-row flex-col" style="display: flex; flex-direction: column; gap: 1rem;">
                  <div class="flex-between">
                    <span class="m-label">Max Monthly Advance</span>
                    <span class="m-value">500</span>
                  </div>
                  <div class="flex-between">
                    <span class="m-label">Remaining This Month</span>
                    <span class="m-value m-value--good">300</span>
                  </div>
                  <div class="flex-between">
                    <span class="m-label">Approval Threshold</span>
                    <span class="m-value m-value--bad">150</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>
        </Transition>

      </main>
    </div>
  </TabletLayout>
</template>

<script setup>
import { ref } from 'vue'
import TabletLayout from '@/components/layout/TabletLayout.vue'
import AnalyticsDataCard from '@/components/ui/AnalyticsDataCard.vue'

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',   icon: 'badge',                  title: 'Operator Roster',      sub: 'Status & Current Shift' },
  { id: 'performance', icon: 'precision_manufacturing',title: 'Performance Logs',     sub: 'KPIs & Daily Output'    },
  { id: 'financials',  icon: 'account_balance_wallet', title: 'Financial Overview',   sub: 'Advances & Expenses'    },
]
const activeView = ref('dashboard')

// ── Mock Data ─────────────────────────────────────────────────────────────────
const teamMembers = ref([
  { id: '1', name: 'Zelalem', initials: 'ZL', status: 'active', level: 'OPERATOR LEVEL 3', empId: '8842', shift: 'SHIFT A - LINE 02' },
  { id: '2', name: 'Aben C.', initials: 'AB', status: 'active', level: 'LEAD ASSEMBLER', empId: '8942', shift: 'SHIFT B - FABRICATION' },
  { id: '3', name: 'James T.', initials: 'JT', status: 'inactive', level: 'TECHNICIAN', empId: '8943', shift: 'SHIFT A - LINE 01' },
])
const currentEmployee = ref(teamMembers.value[0])

const activityLogs = ref([
  { time: '14:30:22', variant: 'PT-X99-ALPHA', qty: '250', status: 'OK' },
  { time: '13:45:10', variant: 'PT-X99-BETA', qty: '120', status: 'OK' },
  { time: '12:15:05', variant: 'PT-X99-ALPHA', qty: '500', status: 'OK' },
  { time: '11:02:44', variant: 'PT-X99-GAMMA', qty: '07', status: 'REJECT' },
  { time: '09:30:00', variant: 'PT-X99-ALPHA', qty: '525', status: 'OK' }
])

const transactions = ref([
  { date: '24 OCT 2023', type: 'ADVANCE', amount: '-200.00', status: 'CLEARED', color: 'red', icon: 'call_made', badgeClass: 'badge--warn', old: false },
  { date: '15 OCT 2023', type: 'TOOL EXPENSE', amount: '45.00', status: 'LOGGED', color: 'purple', icon: 'inventory', badgeClass: 'badge--neutral', old: false },
  { date: '01 OCT 2023', type: 'PAYROLL DEP', amount: '+1,400.00', status: 'CLEARED', color: 'green', icon: 'payments', badgeClass: 'badge--ok', old: false },
  { date: '12 SEP 2023', type: 'ADVANCE', amount: '-150.00', status: 'CLEARED', color: 'red', icon: 'call_made', badgeClass: 'badge--warn', old: true }
])
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
  width: 240px;
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

/* Nav Operator Card */
.op-nav-card {
  background: rgba(15,23,42,.4);
  border: 1px solid rgba(255,255,255,.05);
  border-radius: .75rem;
  padding: .75rem;
  display: flex;
  align-items: center;
  gap: .75rem;
}
.op-nav-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #334155;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .7rem;
  font-weight: 800;
}
.op-nav-info {
  display: flex;
  flex-direction: column;
}
.op-nav-name {
  font-size: .8rem;
  font-weight: 700;
  color: #e2e8f0;
}
.op-nav-role {
  font-size: .6rem;
  color: #64748b;
}

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
  grid-template-columns: repeat(3, 1fr);
  gap: .85rem;
  flex-shrink: 0;
}

/* ══ Shared Card & Table ═════════════════════════════════════════════════════ */
.chart-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
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

.cost-table-wrap {
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,.05);
  border-radius: .5rem;
  background: #0f172a;
}
.cost-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.cost-table th, .cost-table td {
  padding: .75rem .85rem;
  font-size: .75rem;
  border-bottom: 1px solid rgba(255,255,255,.05);
}
.cost-table th {
  background: #1e293b;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-size: .65rem;
  position: sticky;
  top: 0;
  z-index: 1;
}
.cost-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.cost-table .red { color: #f87171; }
.cost-table .green { color: #34d399; }
.cost-table .purple { color: #c084fc; }

.row-error {
  background: rgba(239, 68, 68, 0.05);
}

/* ══ Badges & Utilities ══════════════════════════════════════════════════════ */
.status-badge {
  display: inline-block;
  padding: .15rem .5rem;
  border-radius: .25rem;
  font-size: .6rem;
  font-weight: 800;
  text-transform: uppercase;
}
.badge--ok { background: rgba(16,185,129,.15); color: #34d399; }
.badge--warn { background: rgba(245,158,11,.15); color: #fbbf24; }
.badge--critical { background: rgba(239,68,68,.15); color: #f87171; }
.badge--neutral { background: rgba(100,116,139,.15); color: #94a3b8; }

.bg-green { background: #10b981 !important; }
.bg-red { background: #ef4444 !important; }
.bg-indigo { background: #6366f1 !important; }
.text-green { color: #10b981 !important; }
.text-slate { color: #64748b !important; }
.border-green { border-color: #10b981 !important; }

/* ══ Employee layout (Dashboard View) ════════════════════════════════════════ */
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
  position: absolute; left: .6rem; top: 50%; transform: translateY(-50%);
  font-size: 1rem; color: #475569;
}
.search-input {
  width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,.08);
  border-radius: .55rem; padding: .55rem .75rem .55rem 2.2rem;
  font-size: .8rem; color: #e2e8f0; outline: none; font-family: inherit;
}
.search-input:focus { border-color: rgba(99,102,241,.4); }

.op-card {
  display: flex; align-items: center; gap: .65rem; padding: .65rem;
  border-radius: .65rem; border: 1px solid rgba(255,255,255,.05);
  background: #0f172a; cursor: pointer; text-align: left; transition: all .15s ease;
}
.op-card:hover { border-color: rgba(255,255,255,.1); }
.op-card--active { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.4); }

.op-avatar {
  width: 32px; height: 32px; border-radius: 50%; border: 2px solid;
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem; font-weight: 800; background: #1e293b; flex-shrink: 0;
}
.op-info { flex: 1; min-width: 0; }
.op-name { font-size: .8rem; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
.op-role { font-size: .6rem; color: #64748b; margin: 0; }
.op-status-dot { width: 8px; height: 8px; border-radius: 50%; margin-left: auto; }

/* ══ Profile card details ════════════════════════════════════════════════════ */
.profile-area { flex: 1; min-width: 0; overflow-y: auto; }
.profile-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column;
}

.profile-hdr { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.profile-avatar {
  width: 4rem; height: 4rem; border-radius: 1rem; display: flex;
  align-items: center; justify-content: center; font-size: 1.5rem;
  font-weight: 800; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,.3);
}
.profile-name { font-size: 1.25rem; font-weight: 900; color: #f1f5f9; margin: 0; }
.profile-role { font-size: .75rem; color: #94a3b8; margin: 0; }
.profile-badge { margin-left: auto; align-self: flex-start; }

.metric-section {
  background: #0f172a; border: 1px solid rgba(255,255,255,.05);
  border-radius: .75rem; padding: 1rem; display: flex; flex-direction: column; gap: .75rem;
}
.section-title {
  display: flex; align-items: center; gap: .4rem; font-size: .75rem;
  font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 0;
}
.section-title .material-symbols-rounded { font-size: 1.1rem; color: #6366f1; }

.metric-row { display: flex; gap: 1rem; }
.metric-item { flex: 1; display: flex; flex-direction: column; gap: .2rem; }
.m-label { font-size: .65rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
.m-value { font-size: 1.15rem; font-weight: 800; color: #f1f5f9; }
.m-value--good { color: #34d399; }
.m-value--bad  { color: #f87171; }

.flex-between { display: flex; justify-content: space-between; align-items: center; }

/* ══ Alerts ══════════════════════════════════════════════════════════════════ */
.alert-box {
  display: flex; align-items: flex-start; gap: .75rem; padding: .75rem;
  border-radius: .5rem; border-left: 3px solid;
}
.alert-box--info { background: rgba(99,102,241,.1); border-color: #6366f1; color: #a5b4fc; }
.alert-box--warn { background: rgba(245,158,11,.1); border-color: #fbbf24; color: #fcd34d; }
.alert-box .material-symbols-rounded { font-size: 1.25rem; }
.alert-box strong { font-size: .7rem; display: block; margin-bottom: .2rem; }
.alert-box p { font-size: .75rem; color: #e2e8f0; margin: 0; }

/* ══ Action Buttons ══════════════════════════════════════════════════════════ */
.action-grid { display: flex; gap: 1rem; }
.btn-action {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: .5rem;
  padding: 1rem; border-radius: .75rem; font-size: 1rem; font-weight: 800;
  cursor: pointer; border: none; transition: transform .1s ease, filter .2s ease;
  color: #fff; flex-direction: column;
}
.btn-action:active { transform: scale(0.98); }
.btn-action:hover { filter: brightness(1.1); }
.btn-action--primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.btn-action--danger  { background: linear-gradient(135deg, #ef4444, #dc2626); }
.btn-action--secondary { background: #334155; }
</style>
