<template>
  <div class="analytics-layout">
    <!-- ─── Top Header Bar ────────────────────────────────────────── -->
    <header class="analytics-header">
      <div class="header-brand">
        <div class="brand-badge">⚡</div>
        <div>
          <h1 class="header-title">Executive Analytics</h1>
          <p class="header-sub">Founder Dashboard &bull; {{ store.currentProductionWeek }}</p>
        </div>
      </div>

      <!-- KPI Pills -->
      <div class="header-kpis">
        <div class="kpi-chip kpi-chip--good">
          <span class="material-symbols-rounded">factory</span>
          <div>
            <p class="kpi-val">{{ store.totalGoodAllTime.toLocaleString() }}</p>
            <p class="kpi-lbl">Total Produced</p>
          </div>
        </div>
        <div class="kpi-chip kpi-chip--waste">
          <span class="material-symbols-rounded">delete_sweep</span>
          <div>
            <p class="kpi-val">{{ store.totalWasteAllTime.toLocaleString() }}</p>
            <p class="kpi-lbl">Total Waste</p>
          </div>
        </div>
        <div class="kpi-chip" :class="store.overallWastePct >= 15 ? 'kpi-chip--critical' : store.overallWastePct >= 8 ? 'kpi-chip--warn' : 'kpi-chip--ok'">
          <span class="material-symbols-rounded">percent</span>
          <div>
            <p class="kpi-val">{{ store.overallWastePct }}%</p>
            <p class="kpi-lbl">Waste Rate</p>
          </div>
        </div>
        <div class="kpi-chip kpi-chip--dispatch">
          <span class="material-symbols-rounded">local_shipping</span>
          <div>
            <p class="kpi-val">{{ store.totalDispatched.toLocaleString() }}</p>
            <p class="kpi-lbl">Dispatched</p>
          </div>
        </div>
        <div class="kpi-chip kpi-chip--cash">
          <span class="material-symbols-rounded">payments</span>
          <div>
            <p class="kpi-val">{{ store.totalAdvances.toLocaleString() }}</p>
            <p class="kpi-lbl">Advances (ETB)</p>
          </div>
        </div>
      </div>

      <!-- Export Button -->
      <button class="export-btn" @click="exportTelegram">
        <span class="material-symbols-rounded">send</span>
        Export &amp; Forward to Frezer
      </button>
    </header>

    <!-- ─── Dashboard Grid ────────────────────────────────────────── -->
    <div class="dashboard-grid">

      <!-- 1. Production Trend Chart (7-day) -->
      <section class="chart-card chart-card--wide">
        <div class="card-header">
          <span class="material-symbols-rounded card-icon" style="color:#6366f1">trending_up</span>
          <div>
            <p class="card-title">Production Trend</p>
            <p class="card-sub">Good output vs. waste — last 7 days</p>
          </div>
          <div class="card-badge">7-Day</div>
        </div>

        <!-- Bar chart rendered in SVG-free CSS -->
        <div class="bar-chart">
          <div
            v-for="day in store.sevenDayTrend"
            :key="day.label"
            class="bar-col"
          >
            <div class="bar-col-inner">
              <!-- Waste bar (stacked on top visually = bottom of column) -->
              <div
                class="bar-seg bar-seg--waste"
                :style="{ height: barHeight(day.waste, maxTrend) + '%' }"
                :title="`Waste: ${day.waste}`"
              />
              <!-- Good bar -->
              <div
                class="bar-seg bar-seg--good"
                :style="{ height: barHeight(day.good, maxTrend) + '%' }"
                :title="`Good: ${day.good}`"
              />
            </div>
            <div class="bar-values">
              <span class="bv-good">{{ day.good }}</span>
              <span class="bv-waste">{{ day.waste }}</span>
            </div>
            <p class="bar-label">{{ day.label }}</p>
          </div>
        </div>

        <!-- Legend -->
        <div class="chart-legend">
          <div class="legend-item"><span class="leg-dot" style="background:#6366f1" /> Good Production</div>
          <div class="legend-item"><span class="leg-dot" style="background:#ef4444" /> Waste Material</div>
        </div>
      </section>

      <!-- 2. Waste vs. Yield Donut -->
      <section class="chart-card chart-card--donut">
        <div class="card-header">
          <span class="material-symbols-rounded card-icon" style="color:#f59e0b">donut_large</span>
          <div>
            <p class="card-title">Waste vs. Yield</p>
            <p class="card-sub">Overall efficiency breakdown</p>
          </div>
        </div>

        <div class="donut-wrap">
          <svg class="donut-svg" viewBox="0 0 120 120">
            <!-- Track -->
            <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="16" />
            <!-- Good arc -->
            <circle
              cx="60" cy="60" r="48"
              fill="none"
              stroke="#6366f1"
              stroke-width="16"
              stroke-linecap="round"
              :stroke-dasharray="`${goodArc} ${301.6 - goodArc}`"
              stroke-dashoffset="75.4"
              style="transition: stroke-dasharray .8s ease;"
            />
            <!-- Waste arc -->
            <circle
              cx="60" cy="60" r="48"
              fill="none"
              stroke="#ef4444"
              stroke-width="16"
              stroke-linecap="round"
              :stroke-dasharray="`${wasteArc} ${301.6 - wasteArc}`"
              :stroke-dashoffset="`${75.4 - goodArc}`"
              style="transition: stroke-dasharray .8s ease;"
            />
          </svg>
          <div class="donut-center">
            <p class="donut-yield">{{ yieldPct }}%</p>
            <p class="donut-lbl">Yield</p>
          </div>
        </div>

        <div class="donut-legend">
          <div class="dleg-item">
            <span class="dleg-dot" style="background:#6366f1" />
            <div>
              <p class="dleg-val">{{ store.totalGoodAllTime }}</p>
              <p class="dleg-lbl">Good ({{ yieldPct }}%)</p>
            </div>
          </div>
          <div class="dleg-item">
            <span class="dleg-dot" style="background:#ef4444" />
            <div>
              <p class="dleg-val">{{ store.totalWasteAllTime }}</p>
              <p class="dleg-lbl">Waste ({{ store.overallWastePct }}%)</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Operator Efficiency Table -->
      <section class="chart-card chart-card--table">
        <div class="card-header">
          <span class="material-symbols-rounded card-icon" style="color:#10b981">leaderboard</span>
          <div>
            <p class="card-title">Operator Efficiency</p>
            <p class="card-sub">Ranked by waste rate</p>
          </div>
        </div>

        <table class="eff-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Operator</th>
              <th>Good</th>
              <th>Waste</th>
              <th>Rate</th>
              <th>Bar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(op, idx) in store.operatorEfficiency" :key="op.id">
              <td class="rank-cell">
                <span v-if="idx === 0" class="material-symbols-rounded" style="color:#fbbf24;font-size:1rem">workspace_premium</span>
                <span v-else style="color:#475569;font-size:.8rem;font-weight:700">{{ idx + 1 }}</span>
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:.45rem">
                  <div class="op-dot-sm" :class="op.color">{{ op.avatar }}</div>
                  <span style="font-size:.82rem;font-weight:700;color:#e2e8f0">{{ op.name }}</span>
                </div>
              </td>
              <td class="num-cell num-good">{{ op.good }}</td>
              <td class="num-cell num-waste">{{ op.waste }}</td>
              <td class="num-cell">
                <span
                  class="rate-chip"
                  :class="
                    op.wastePercent >= 15 ? 'rate--critical' :
                    op.wastePercent >= 8  ? 'rate--warn' : 'rate--ok'
                  "
                >{{ op.total === 0 ? '—' : op.wastePercent + '%' }}</span>
              </td>
              <td>
                <div class="mini-bar-track">
                  <div
                    class="mini-bar-fill"
                    :class="
                      op.wastePercent >= 15 ? 'fill--critical' :
                      op.wastePercent >= 8  ? 'fill--warn' : 'fill--ok'
                    "
                    :style="{ width: Math.min(100, op.wastePercent) + '%' }"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!store.operatorEfficiency.length">
              <td colspan="6" style="text-align:center;color:#334155;padding:1.5rem;font-size:.8rem">No data yet</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 4. Downtime Summary -->
      <section class="chart-card chart-card--downtime">
        <div class="card-header">
          <span class="material-symbols-rounded card-icon" style="color:#ef4444">timer_off</span>
          <div>
            <p class="card-title">Downtime Log</p>
            <p class="card-sub">{{ store.downtimeSessions.length }} resolved sessions</p>
          </div>
        </div>

        <div class="downtime-list">
          <div
            v-for="s in recentDowntime"
            :key="s.id"
            class="dt-row"
          >
            <span class="material-symbols-rounded dt-icon">timer_off</span>
            <div class="dt-body">
              <p class="dt-reason">{{ s.reason }}</p>
              <p class="dt-meta">{{ s.operator }} &bull; {{ fmtDur(s.duration) }}</p>
            </div>
            <span class="dt-time">{{ fmtTime(s.startTime) }}</span>
          </div>
          <p v-if="!store.downtimeSessions.length" style="color:#334155;font-size:.75rem;text-align:center;padding:1rem">No downtime recorded</p>
        </div>
      </section>
    </div>

    <!-- Export Toast -->
    <Transition name="toast">
      <div v-if="exportToast" class="export-toast">
        <span class="material-symbols-rounded">telegram</span>
        Report compiled &amp; forwarded to Frezer
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ─── Donut chart maths ──────────────────────────────────────────────────────
const CIRC = 301.6 // 2 * π * 48
const totalUnits = computed(() => store.totalGoodAllTime + store.totalWasteAllTime)
const yieldPct  = computed(() => totalUnits.value > 0 ? +(100 - store.overallWastePct).toFixed(1) : 100)
const goodArc   = computed(() => totalUnits.value > 0 ? (store.totalGoodAllTime  / totalUnits.value) * CIRC : CIRC)
const wasteArc  = computed(() => totalUnits.value > 0 ? (store.totalWasteAllTime / totalUnits.value) * CIRC : 0)

// ─── Bar chart ──────────────────────────────────────────────────────────────
const maxTrend = computed(() => {
  const maxDay = Math.max(...store.sevenDayTrend.map(d => d.good + d.waste), 1)
  return maxDay
})
function barHeight(val, max) {
  return max > 0 ? Math.max(2, (val / max) * 100) : 2
}

// ─── Recent downtime ────────────────────────────────────────────────────────
const recentDowntime = computed(() => [...store.downtimeSessions].reverse().slice(0, 5))

function fmtDur(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Export ─────────────────────────────────────────────────────────────────
const exportToast = ref(false)
let exportTimer = null
function exportTelegram() {
  // In production: call Telegram Bot API or PDF service
  exportToast.value = true
  clearTimeout(exportTimer)
  exportTimer = setTimeout(() => { exportToast.value = false }, 3500)
}
</script>

<style scoped>
.analytics-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.analytics-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: .9rem 1.75rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.2);
  flex-shrink: 0;
}
.header-brand { display: flex; align-items: center; gap: .85rem; flex-shrink: 0; }
.brand-badge  {
  font-size: 1.5rem;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  border-radius: .5rem;
  width: 2.5rem; height: 2.5rem;
  display: flex; align-items: center; justify-content: center;
}
.header-title { font-size: 1rem; font-weight: 800; color: #f1f5f9; }
.header-sub   { font-size: .65rem; color: #64748b; margin-top: .1rem; }

/* KPI chips */
.header-kpis  { display: flex; gap: .6rem; flex: 1; justify-content: center; }
.kpi-chip {
  display: flex; align-items: center; gap: .5rem;
  padding: .45rem .85rem;
  border-radius: .65rem;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
}
.kpi-chip .material-symbols-rounded { font-size: 1.1rem; }
.kpi-val  { font-size: .9rem; font-weight: 800; line-height: 1; }
.kpi-lbl  { font-size: .58rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
.kpi-chip--good     .kpi-val, .kpi-chip--good     .material-symbols-rounded { color: #34d399; }
.kpi-chip--waste    .kpi-val, .kpi-chip--waste    .material-symbols-rounded { color: #f87171; }
.kpi-chip--ok       .kpi-val, .kpi-chip--ok       .material-symbols-rounded { color: #34d399; }
.kpi-chip--warn     .kpi-val, .kpi-chip--warn     .material-symbols-rounded { color: #fbbf24; }
.kpi-chip--critical .kpi-val, .kpi-chip--critical .material-symbols-rounded { color: #f87171; }
.kpi-chip--dispatch .kpi-val, .kpi-chip--dispatch .material-symbols-rounded { color: #a5b4fc; }
.kpi-chip--cash     .kpi-val, .kpi-chip--cash     .material-symbols-rounded { color: #fbbf24; }

/* Export button */
.export-btn {
  display: flex; align-items: center; gap: .5rem;
  padding: .65rem 1.1rem;
  background: linear-gradient(135deg,#2563eb,#3b82f6);
  border: none;
  border-radius: .65rem;
  color: #fff;
  font-size: .85rem; font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s ease;
  flex-shrink: 0;
}
.export-btn:hover  { filter: brightness(1.1); }
.export-btn:active { transform: scale(.97); }

/* ── Grid ──────────────────────────────────────────────────────────────── */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2.2fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1rem;
  padding: 1rem 1.25rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chart-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.1rem;
  overflow: hidden;
}
.chart-card--wide    { grid-row: span 1; }
.chart-card--donut   { grid-row: span 1; }
.chart-card--table   { grid-row: span 1; }
.chart-card--downtime{ grid-row: span 1; }

.card-header {
  display: flex; align-items: center; gap: .65rem; margin-bottom: .75rem; flex-shrink: 0;
}
.card-icon  { font-size: 1.3rem !important; }
.card-title { font-size: .88rem; font-weight: 800; color: #f1f5f9; }
.card-sub   { font-size: .62rem; color: #64748b; margin-top: .05rem; }
.card-badge {
  margin-left: auto;
  background: rgba(99,102,241,.15);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  font-size: .62rem; font-weight: 700;
  padding: .15rem .5rem;
  border-radius: 999px;
}

/* ── Bar Chart ──────────────────────────────────────────────────────────── */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: .5rem;
  flex: 1;
  padding: 0 .25rem;
  min-height: 0;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .25rem;
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
.bar-seg {
  width: 100%;
  border-radius: .25rem;
  min-height: 2px;
  transition: height .4s ease;
}
.bar-seg--good  { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.bar-seg--waste { background: rgba(239,68,68,.7); }
.bar-values { display: flex; flex-direction: column; align-items: center; gap: .05rem; }
.bv-good    { font-size: .55rem; color: #a5b4fc; font-weight: 700; font-variant-numeric: tabular-nums; }
.bv-waste   { font-size: .55rem; color: #f87171; font-variant-numeric: tabular-nums; }
.bar-label  { font-size: .6rem; color: #475569; white-space: nowrap; }

.chart-legend { display: flex; gap: 1rem; margin-top: .5rem; flex-shrink: 0; }
.legend-item  { display: flex; align-items: center; gap: .35rem; font-size: .68rem; color: #64748b; }
.leg-dot      { width: .55rem; height: .55rem; border-radius: 50%; flex-shrink: 0; }

/* ── Donut ──────────────────────────────────────────────────────────────── */
.donut-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.donut-svg    { width: min(100%, 150px); height: auto; transform: rotate(-90deg); }
.donut-center {
  position: absolute;
  display: flex; flex-direction: column; align-items: center;
}
.donut-yield { font-size: 1.75rem; font-weight: 900; color: #f1f5f9; line-height: 1; }
.donut-lbl   { font-size: .65rem; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }

.donut-legend { display: flex; gap: 1rem; flex-shrink: 0; }
.dleg-item    { display: flex; align-items: center; gap: .5rem; }
.dleg-dot     { width: .65rem; height: .65rem; border-radius: 50%; flex-shrink: 0; }
.dleg-val     { font-size: .85rem; font-weight: 800; color: #f1f5f9; }
.dleg-lbl     { font-size: .6rem; color: #64748b; }

/* ── Efficiency Table ───────────────────────────────────────────────────── */
.eff-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: .8rem;
  flex: 1;
}
.eff-table thead th {
  text-align: left;
  padding: .35rem .5rem;
  font-size: .62rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .07em;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.eff-table tbody td { padding: .45rem .5rem; border-bottom: 1px solid rgba(255,255,255,.04); }
.eff-table tbody tr:hover td { background: rgba(255,255,255,.03); }

.rank-cell  { text-align: center; width: 1.5rem; }
.num-cell   { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.num-good   { color: #34d399; }
.num-waste  { color: #f87171; }

.op-dot-sm {
  width: 1.5rem; height: 1.5rem;
  border-radius: .3rem;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .65rem; color: #fff;
  flex-shrink: 0;
}

.rate-chip { font-size: .72rem; font-weight: 800; padding: .12rem .4rem; border-radius: .3rem; }
.rate--ok       { background: rgba(16,185,129,.15); color: #34d399; }
.rate--warn     { background: rgba(245,158,11,.15); color: #fbbf24; }
.rate--critical { background: rgba(239,68,68,.15);  color: #f87171; }

.mini-bar-track { background: rgba(255,255,255,.08); border-radius: 999px; height: .35rem; min-width: 60px; overflow: hidden; }
.mini-bar-fill  { height: 100%; border-radius: 999px; transition: width .4s ease; }
.fill--ok       { background: #10b981; }
.fill--warn     { background: #f59e0b; }
.fill--critical { background: #ef4444; }

/* ── Downtime ───────────────────────────────────────────────────────────── */
.downtime-list { display: flex; flex-direction: column; gap: .4rem; overflow-y: auto; flex: 1; }
.dt-row {
  display: flex; align-items: center; gap: .6rem;
  background: rgba(239,68,68,.06);
  border: 1px solid rgba(239,68,68,.15);
  border-radius: .55rem;
  padding: .5rem .75rem;
}
.dt-icon   { font-size: 1rem !important; color: #f87171; }
.dt-body   { flex: 1; }
.dt-reason { font-size: .8rem; font-weight: 700; color: #e2e8f0; }
.dt-meta   { font-size: .62rem; color: #64748b; margin-top: .05rem; }
.dt-time   { font-size: .65rem; color: #475569; flex-shrink: 0; }

/* Export Toast */
.export-toast {
  position: fixed;
  bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg,#1d4ed8,#3b82f6);
  color: #fff;
  border-radius: .65rem;
  padding: .85rem 1.75rem;
  font-size: .9rem; font-weight: 700;
  display: flex; align-items: center; gap: .5rem;
  z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>
