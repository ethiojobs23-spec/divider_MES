<template>
  <AppLayout>
    <div class="lpd-root">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <header class="lpd-header">
        <div class="header-left">
          <span class="material-symbols-rounded header-icon">monitoring</span>
          <div>
            <h1 class="header-title">Live Production Monitor</h1>
            <p class="header-sub">{{ store.currentProductionWeek }} · Real-time · Auto-refresh every 30s</p>
          </div>
        </div>
        <div class="pulse-indicator">
          <span class="pulse-dot" :class="{ 'pulse-dot--live': isLive }"></span>
          LIVE
        </div>
      </header>

      <!-- ── KPI Strip ──────────────────────────────────────────── -->
      <div class="kpi-strip">
        <div class="kpi-card kpi-card--green">
          <span class="material-symbols-rounded kpi-icon">check_circle</span>
          <div>
            <p class="kpi-label">Total Good Today</p>
            <p class="kpi-value">{{ todayGood.toLocaleString() }}</p>
            <p class="kpi-unit">pcs produced</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--red">
          <span class="material-symbols-rounded kpi-icon">delete</span>
          <div>
            <p class="kpi-label">Total Waste Today</p>
            <p class="kpi-value">{{ todayWaste.toLocaleString() }}</p>
            <p class="kpi-unit">pcs scrapped</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--yellow">
          <span class="material-symbols-rounded kpi-icon">person</span>
          <div>
            <p class="kpi-label">Top Operator Today</p>
            <p class="kpi-value kpi-value--name">{{ topOperator.name }}</p>
            <p class="kpi-unit">{{ topOperator.qty }} pcs</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--blue">
          <span class="material-symbols-rounded kpi-icon">inventory_2</span>
          <div>
            <p class="kpi-label">Active Types Today</p>
            <p class="kpi-value">{{ activeTypes.size }}</p>
            <p class="kpi-unit">divider types</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--purple">
          <span class="material-symbols-rounded kpi-icon">speed</span>
          <div>
            <p class="kpi-label">Efficiency Rate</p>
            <p class="kpi-value">{{ efficiencyRate }}%</p>
            <p class="kpi-unit">good vs total</p>
          </div>
        </div>
      </div>

      <!-- ── Main Body ──────────────────────────────────────────── -->
      <div class="lpd-body">

        <!-- LEFT: Live Feed ─────────────────────────────────────── -->
        <section class="feed-section">
          <div class="section-header">
            <span class="material-symbols-rounded" style="color:#6366f1">receipt_long</span>
            <h2>Live Activity Feed</h2>
            <span class="entry-count-badge">{{ windowedEntries.length }} entries</span>
          </div>

          <!-- Type breakdown pills -->
          <div class="type-pills">
            <div
              v-for="(qty, type) in todayByType"
              :key="type"
              class="type-pill"
            >
              <span class="pill-type">Type {{ type }}</span>
              <span class="pill-qty">{{ qty }} pcs</span>
            </div>
          </div>

          <div class="feed-list">
            <TransitionGroup name="feed">
              <div
                v-for="entry in windowedEntries"
                :key="entry.id"
                class="feed-item"
                :class="{ 'feed-item--waste': entry.wasteMaterial > 0 && entry.goodProduction === 0 }"
              >
                <div class="feed-avatar" :style="{ background: operatorColor(entry.operator) }">
                  {{ entry.operator?.charAt(0) ?? '?' }}
                </div>
                <div class="feed-body">
                  <p class="feed-primary">
                    <strong>{{ entry.operator }}</strong>
                    logged
                    <span class="feed-qty good">{{ entry.goodProduction }} pcs good</span>
                    <span v-if="entry.wasteMaterial > 0" class="feed-qty waste">/ {{ entry.wasteMaterial }} waste</span>
                  </p>
                  <p class="feed-meta">
                    Type <strong>{{ entry.dividerType }}</strong> ·
                    {{ entry.placement }} ·
                    {{ entry.size }} ·
                    {{ fmtTime(entry.timestamp) }}
                  </p>
                </div>
                <div class="feed-badge" :class="entry.goodProduction > 0 ? 'feed-badge--good' : 'feed-badge--waste'">
                  {{ entry.goodProduction > 0 ? '+' + entry.goodProduction : '⚠ ' + entry.wasteMaterial }}
                </div>
              </div>
            </TransitionGroup>
            <div v-if="!windowedEntries.length" class="feed-empty">
              <span class="material-symbols-rounded" style="font-size:3rem; color:#1e293b">edit_off</span>
              <p>No entries in this time window</p>
            </div>
          </div>
        </section>

        <!-- RIGHT: Charts ───────────────────────────────────────── -->
        <section class="chart-section">
          <!-- Time Range Tabs -->
          <div class="section-header">
            <span class="material-symbols-rounded" style="color:#fbbf24">bar_chart</span>
            <h2>Production Chart</h2>
            <div class="range-tabs">
              <button
                v-for="r in ranges"
                :key="r.key"
                class="range-tab"
                :class="{ 'range-tab--active': activeRange === r.key }"
                @click="activeRange = r.key"
              >{{ r.label }}</button>
            </div>
          </div>

          <!-- Bar Chart -->
          <div class="bar-chart-wrap">
            <div class="bar-chart">
              <div
                v-for="bar in chartBars"
                :key="bar.label"
                class="bar-col"
              >
                <div class="bar-value-label">{{ bar.good > 0 ? bar.good : '' }}</div>
                <div class="bar-track">
                  <div
                    class="bar-fill bar-fill--good"
                    :style="{ height: barHeight(bar.good) + '%' }"
                  ></div>
                  <div
                    class="bar-fill bar-fill--waste"
                    :style="{ height: barHeight(bar.waste) + '%' }"
                  ></div>
                </div>
                <div class="bar-label">{{ bar.label }}</div>
              </div>
              <div v-if="!chartBars.length" class="chart-empty">
                <span class="material-symbols-rounded">bar_chart_off</span>
                <p>No data for this period</p>
              </div>
            </div>
            <!-- Y-axis legend -->
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot" style="background:#34d399"></span>Good</span>
              <span class="legend-item"><span class="legend-dot" style="background:#f87171"></span>Waste</span>
            </div>
          </div>

          <!-- Per-Type Breakdown for chart range -->
          <div class="type-breakdown">
            <p class="breakdown-title">
              <span class="material-symbols-rounded">donut_small</span>
              Type Breakdown ({{ activeRangeLabel }})
            </p>
            <div class="breakdown-rows">
              <div
                v-for="row in typeBreakdown"
                :key="row.type"
                class="breakdown-row"
              >
                <span class="breakdown-type">{{ row.type }}</span>
                <div class="breakdown-bar-wrap">
                  <div
                    class="breakdown-bar"
                    :style="{ width: row.pct + '%' }"
                  ></div>
                </div>
                <span class="breakdown-qty">{{ row.good }} pcs</span>
              </div>
              <div v-if="!typeBreakdown.length" class="breakdown-empty">No data</div>
            </div>
          </div>
        </section>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ── Live refresh ────────────────────────────────────────────────
const isLive = ref(true)
let refreshTimer = null

onMounted(() => {
  store.fetchInitialData()
  refreshTimer = setInterval(() => {
    store.fetchInitialData()
  }, 30000) // refresh every 30s
})

onUnmounted(() => clearInterval(refreshTimer))

// ── Time range ──────────────────────────────────────────────────
const ranges = [
  { key: '6h',  label: '6H'  },
  { key: '12h', label: '12H' },
  { key: '24h', label: '24H' },
  { key: 'week',label: 'Week' },
]
const activeRange = ref('6h')
const activeRangeLabel = computed(() => ranges.find(r => r.key === activeRange.value)?.label ?? '')

function cutoffMs(rangeKey) {
  const now = Date.now()
  if (rangeKey === '6h')   return now - 6  * 3600_000
  if (rangeKey === '12h')  return now - 12 * 3600_000
  if (rangeKey === '24h')  return now - 24 * 3600_000
  // week: start of Mon this week
  const d = new Date(); d.setHours(0,0,0,0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

// ── Helpers ─────────────────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6']
const opColorMap = {}
let colorIdx = 0
function operatorColor(name) {
  if (!name) return '#334155'
  if (!opColorMap[name]) opColorMap[name] = COLORS[(colorIdx++) % COLORS.length]
  return opColorMap[name]
}

// ── Today stats ─────────────────────────────────────────────────
const todayEntries = computed(() => {
  const today = new Date().toDateString()
  return store.ledgerEntries.filter(e => new Date(e.timestamp).toDateString() === today)
})

const todayGood  = computed(() => todayEntries.value.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0))
const todayWaste = computed(() => todayEntries.value.reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0))

const todayByType = computed(() => {
  const map = {}
  todayEntries.value.forEach(e => {
    map[e.dividerType] = (map[e.dividerType] || 0) + (Number(e.goodProduction) || 0)
  })
  return map
})

const activeTypes = computed(() => new Set(todayEntries.value.map(e => e.dividerType)))

const topOperator = computed(() => {
  const map = {}
  todayEntries.value.forEach(e => {
    map[e.operator] = (map[e.operator] || 0) + (Number(e.goodProduction) || 0)
  })
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  return entries.length ? { name: entries[0][0], qty: entries[0][1] } : { name: '—', qty: 0 }
})

const efficiencyRate = computed(() => {
  const total = todayGood.value + todayWaste.value
  if (!total) return '—'
  return ((todayGood.value / total) * 100).toFixed(1)
})

// ── Live feed (today, most recent first, max 30) ─────────────────
const windowedEntries = computed(() => {
  const cutoff = cutoffMs(activeRange.value)
  return [...store.ledgerEntries]
    .filter(e => new Date(e.timestamp).getTime() >= cutoff)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 30)
})

// ── Chart bars ──────────────────────────────────────────────────
const chartBars = computed(() => {
  const r = activeRange.value
  const now = new Date()
  let bars = []

  if (r === 'week') {
    // Mon–Sun
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    const todayDow = (now.getDay() + 6) % 7 // 0=Mon
    bars = days.map((label, i) => {
      const entries = store.ledgerEntries.filter(e => {
        const d = new Date(e.timestamp)
        return ((d.getDay() + 6) % 7) === i
      })
      return {
        label,
        good:  entries.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0),
        waste: entries.reduce((s, e) => s + (Number(e.wasteMaterial)  || 0), 0),
        isCurrent: i === todayDow
      }
    })
  } else {
    const hoursBack = r === '6h' ? 6 : r === '12h' ? 12 : 24
    bars = Array.from({ length: hoursBack }, (_, i) => {
      const slotHour = (now.getHours() - (hoursBack - 1 - i) + 24) % 24
      const entries = store.ledgerEntries.filter(e => {
        const d = new Date(e.timestamp)
        const msDiff = now.getTime() - d.getTime()
        const hoursAgo = msDiff / 3600_000
        const entryHour = d.getHours()
        return entryHour === slotHour && hoursAgo < hoursBack
      })
      const label = String(slotHour).padStart(2,'0') + ':00'
      return {
        label: i % 2 === 0 ? label : '',
        good:  entries.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0),
        waste: entries.reduce((s, e) => s + (Number(e.wasteMaterial)  || 0), 0),
        isCurrent: slotHour === now.getHours()
      }
    })
  }
  return bars
})

const maxBarVal = computed(() => Math.max(1, ...chartBars.value.map(b => b.good + b.waste)))

function barHeight(val) {
  return Math.max(0, (val / maxBarVal.value) * 100)
}

// ── Type breakdown for selected range ───────────────────────────
const typeBreakdown = computed(() => {
  const cutoff = cutoffMs(activeRange.value)
  const entries = store.ledgerEntries.filter(e => new Date(e.timestamp).getTime() >= cutoff)
  const map = {}
  entries.forEach(e => {
    if (!map[e.dividerType]) map[e.dividerType] = { good: 0, waste: 0 }
    map[e.dividerType].good  += Number(e.goodProduction) || 0
    map[e.dividerType].waste += Number(e.wasteMaterial)  || 0
  })
  const total = Object.values(map).reduce((s, v) => s + v.good, 0) || 1
  return Object.entries(map)
    .map(([type, v]) => ({ type, good: v.good, waste: v.waste, pct: Math.round((v.good / total) * 100) }))
    .sort((a, b) => b.good - a.good)
})
</script>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────── */
.lpd-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 1.25rem 1.5rem;
  gap: 1rem;
  overflow: hidden;
  background: #0f172a;
}

/* ── Header ──────────────────────────────────────────────────────── */
.lpd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.header-left {
  display: flex; align-items: center; gap: 0.75rem;
}
.header-icon {
  font-size: 2rem; color: #6366f1;
  background: rgba(99,102,241,0.15);
  border-radius: 0.75rem; padding: 0.4rem;
}
.header-title { font-size: 1.35rem; font-weight: 900; color: #f1f5f9; margin: 0; }
.header-sub   { font-size: 0.72rem; color: #64748b; margin-top: 0.1rem; }

.pulse-indicator {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.75rem; font-weight: 800; color: #34d399;
  background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
  padding: 0.45rem 1rem; border-radius: 999px; letter-spacing: 0.1em;
}
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;
}
.pulse-dot--live {
  background: #34d399;
  box-shadow: 0 0 0 0 rgba(52,211,153,0.7);
  animation: pulse-ring 1.5s ease-in-out infinite;
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(52,211,153,0.7); }
  70%  { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
  100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
}

/* ── KPI Strip ───────────────────────────────────────────────────── */
.kpi-strip {
  display: flex; gap: 0.75rem; flex-shrink: 0;
}
.kpi-card {
  flex: 1; display: flex; align-items: center; gap: 0.75rem;
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 0.85rem; padding: 0.85rem 1rem;
}
.kpi-icon { font-size: 1.75rem; flex-shrink: 0; }
.kpi-label { font-size: 0.62rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
.kpi-value { font-size: 1.4rem; font-weight: 900; color: #f1f5f9; line-height: 1.1; font-variant-numeric: tabular-nums; }
.kpi-value--name { font-size: 1rem; }
.kpi-unit  { font-size: 0.62rem; color: #475569; }

.kpi-card--green  { border-color: rgba(52,211,153,0.18); }
.kpi-card--green  .kpi-icon { color: #34d399; }
.kpi-card--red    { border-color: rgba(248,113,113,0.18); }
.kpi-card--red    .kpi-icon { color: #f87171; }
.kpi-card--yellow { border-color: rgba(251,191,36,0.18); }
.kpi-card--yellow .kpi-icon { color: #fbbf24; }
.kpi-card--blue   { border-color: rgba(96,165,250,0.18); }
.kpi-card--blue   .kpi-icon { color: #60a5fa; }
.kpi-card--purple { border-color: rgba(167,139,250,0.18); }
.kpi-card--purple .kpi-icon { color: #a78bfa; }

/* ── Body ────────────────────────────────────────────────────────── */
.lpd-body {
  flex: 1; min-height: 0;
  display: flex; gap: 1.25rem; overflow: hidden;
}

/* ── Shared Section Header ───────────────────────────────────────── */
.section-header {
  display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
}
.section-header h2 {
  font-size: 0.9rem; font-weight: 800; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.08em; flex: 1;
}
.entry-count-badge {
  background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.2);
  color: #a5b4fc; font-size: 0.7rem; font-weight: 700;
  padding: 0.2rem 0.6rem; border-radius: 999px;
}

/* ── Feed ────────────────────────────────────────────────────────── */
.feed-section {
  flex: 0 0 42%; display: flex; flex-direction: column; gap: 0.75rem;
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.1rem; overflow: hidden;
}

.type-pills {
  display: flex; flex-wrap: wrap; gap: 0.4rem; flex-shrink: 0;
}
.type-pill {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
  border-radius: 999px; padding: 0.2rem 0.65rem;
}
.pill-type { font-size: 0.7rem; color: #94a3b8; font-weight: 700; }
.pill-qty  { font-size: 0.75rem; color: #a5b4fc; font-weight: 900; }

.feed-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; }

.feed-item {
  display: flex; align-items: center; gap: 0.65rem;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.65rem; padding: 0.6rem 0.85rem;
  transition: transform 0.15s ease;
}
.feed-item--waste { border-color: rgba(248,113,113,0.15); }

.feed-avatar {
  width: 2.25rem; height: 2.25rem; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem; font-weight: 900; color: white;
}
.feed-body { flex: 1; min-width: 0; }
.feed-primary { font-size: 0.82rem; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-primary strong { color: #f1f5f9; }
.feed-meta { font-size: 0.68rem; color: #475569; margin-top: 0.15rem; }
.feed-meta strong { color: #94a3b8; }

.feed-qty { font-weight: 800; }
.feed-qty.good  { color: #34d399; }
.feed-qty.waste { color: #f87171; }

.feed-badge {
  font-size: 0.8rem; font-weight: 900; flex-shrink: 0;
  padding: 0.2rem 0.6rem; border-radius: 999px;
}
.feed-badge--good  { background: rgba(52,211,153,0.12); color: #34d399; }
.feed-badge--waste { background: rgba(248,113,113,0.12); color: #f87171; }

.feed-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  padding: 2rem 0; color: #475569; font-size: 0.82rem;
}

/* Feed animation */
.feed-enter-active { transition: all 0.3s ease; }
.feed-enter-from   { opacity: 0; transform: translateY(-12px); }

/* ── Charts ──────────────────────────────────────────────────────── */
.chart-section {
  flex: 1; display: flex; flex-direction: column; gap: 0.75rem;
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.1rem; overflow: hidden;
}

.range-tabs { display: flex; gap: 0.35rem; }
.range-tab {
  padding: 0.3rem 0.7rem; border-radius: 0.4rem;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.08);
  color: #64748b; font-size: 0.75rem; font-weight: 700; cursor: pointer;
  transition: all 0.15s ease;
}
.range-tab--active {
  background: rgba(251,191,36,0.15); border-color: #f59e0b; color: #fbbf24;
}

/* Bar chart */
.bar-chart-wrap {
  flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.5rem;
}
.bar-chart {
  flex: 1; min-height: 0; display: flex; align-items: flex-end; gap: 0.25rem;
  padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.07);
}
.bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
}
.bar-value-label {
  font-size: 0.6rem; color: #64748b; font-weight: 700;
  height: 1rem; display: flex; align-items: center;
}
.bar-track {
  width: 100%; flex: 1; max-height: 100%;
  display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 1px;
}
.bar-fill {
  width: 75%; border-radius: 3px 3px 0 0; transition: height 0.4s ease;
  min-height: 2px;
}
.bar-fill--good  { background: linear-gradient(to top, #059669, #34d399); }
.bar-fill--waste { background: linear-gradient(to top, #b91c1c, #f87171); }
.bar-label { font-size: 0.6rem; color: #475569; font-weight: 600; text-align: center; }

.chart-legend { display: flex; gap: 1rem; align-items: center; flex-shrink: 0; }
.legend-item  { display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: #64748b; }
.legend-dot   { width: 8px; height: 8px; border-radius: 50%; }

.chart-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.5rem; color: #334155; font-size: 0.82rem;
}
.chart-empty .material-symbols-rounded { font-size: 2.5rem; }

/* ── Type breakdown ──────────────────────────────────────────────── */
.type-breakdown {
  flex-shrink: 0; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05); border-radius: 0.75rem; padding: 0.85rem;
}
.breakdown-title {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.68rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.6rem;
}
.breakdown-rows { display: flex; flex-direction: column; gap: 0.5rem; }
.breakdown-row  { display: flex; align-items: center; gap: 0.65rem; }
.breakdown-type { font-size: 0.78rem; font-weight: 800; color: #94a3b8; width: 3.5rem; flex-shrink: 0; }
.breakdown-bar-wrap {
  flex: 1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden;
}
.breakdown-bar {
  height: 100%; background: linear-gradient(to right, #6366f1, #a5b4fc); border-radius: 999px;
  transition: width 0.5s ease;
}
.breakdown-qty  { font-size: 0.72rem; font-weight: 700; color: #a5b4fc; width: 4.5rem; text-align: right; flex-shrink: 0; }
.breakdown-empty { font-size: 0.8rem; color: #475569; }
</style>
