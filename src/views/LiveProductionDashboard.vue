<template>
  <AppLayout>
    <div class="lpd-root">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <header class="lpd-header">
        <div class="header-left">
          <span class="material-symbols-rounded header-icon">monitoring</span>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="header-title">Live Production Monitor</h1>
              <span 
                class="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded-full"
                :style="{
                  background: store.weekStatus?.isCurrent ? 'rgba(16,185,129,0.15)' : store.weekStatus?.isPast ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                  color: store.weekStatus?.isCurrent ? '#34d399' : store.weekStatus?.isPast ? '#fbbf24' : '#a5b4fc',
                  border: '1px solid ' + (store.weekStatus?.isCurrent ? 'rgba(16,185,129,0.3)' : store.weekStatus?.isPast ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)')
                }"
              >
                ● {{ store.weekStatus?.label }}
              </span>
            </div>
            <p class="header-sub">{{ store.currentProductionWeek }} ({{ store.weekStatus?.dateRange }}) · Real-time · Auto-refresh every 30s</p>
          </div>
        </div>

        <div class="header-actions flex items-center gap-2">
          <!-- Manual Sync Button -->
          <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync live floor data now">
            <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
            <span>{{ isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
          </button>

          <!-- Live Indicator -->
          <div class="pulse-indicator">
            <span class="pulse-dot" :class="{ 'pulse-dot--live': isLive }"></span>
            LIVE
          </div>
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
            <p class="kpi-unit">{{ topOperator.qty }} {{ topOperator.unit }}</p>
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
              <span class="pill-type">{{ type === 'Hourly' || type === 'Wood Prep' ? type : `Type ${type}` }}</span>
              <span class="pill-qty">{{ qty }} {{ type === 'Hourly' ? 'hrs' : 'pcs' }}</span>
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
                <OperatorAvatar :name="entry.operator" size="sm" />
                <div class="feed-body">
                  <p class="feed-primary">
                    <strong>{{ entry.operator }}</strong>
                    logged
                    <span v-if="entry.workCategory === 'TIME'" class="feed-qty good">{{ entry.hoursWorked }} hours</span>
                    <span v-else class="feed-qty good">{{ entry.goodProduction }} pcs good</span>
                    <span v-if="entry.wasteMaterial > 0" class="feed-qty waste">/ {{ entry.wasteMaterial }} waste</span>
                  </p>
                  <p class="feed-meta flex items-center gap-1 flex-wrap">
                    <span v-if="entry.workCategory === 'TIME'" style="color:#94a3b8; font-weight:bold;">HOURLY</span>
                    <span v-else-if="entry.workCategory === 'C'" style="color:#34d399; font-weight:bold;">WOOD PREP</span>
                    <span v-else>Type <strong>{{ entry.dividerType === 'Other' ? 'Custom' : entry.dividerType }}</strong></span>
                    <span v-if="entry.workCategory !== 'MFG' && entry.workCategory !== 'TIME' && entry.placement"> · {{ entry.placement }}</span>
                    <span v-if="entry.workCategory !== 'MFG' && entry.workCategory !== 'TIME' && entry.size"> · {{ entry.size }}</span>
                    · {{ fmtTime(entry.timestamp) }}
                    <span v-if="entry.is_overtime || entry.isOvertime" class="feed-ot-badge">⚡ 1.5× OT</span>
                    <span v-if="entry.loggedByAdmin" class="feed-admin-badge" title="Systematically registered / Admin Override">[ADMIN]</span>
                  </p>
                </div>
                <div class="feed-badge" :class="(entry.workCategory === 'TIME' ? entry.hoursWorked : entry.goodProduction) > 0 ? 'feed-badge--good' : 'feed-badge--waste'">
                  {{ (entry.workCategory === 'TIME' ? entry.hoursWorked : entry.goodProduction) > 0 ? '+' + (entry.workCategory === 'TIME' ? entry.hoursWorked + 'h' : entry.goodProduction) : '⚠ ' + entry.wasteMaterial }}
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
                <span class="breakdown-qty">{{ row.good }} {{ row.type === 'Hourly' ? 'hrs' : 'pcs' }}</span>
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
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ── Live refresh ────────────────────────────────────────────────
const isLive = ref(true)
const isSyncing = ref(false)
let refreshTimer = null

async function manualSync() {
  isSyncing.value = true
  try {
    await store.fetchInitialData()
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

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

function getEntryTypeLabel(e) {
  if (e.workCategory === 'TIME') return 'Hourly'
  if (e.workCategory === 'C') return 'Wood Prep'
  if (e.workCategory === 'PP') return 'Partition (PP)'
  if (e.workCategory === 'PL') return 'Pad (PL)'
  return e.dividerType === 'Other' ? 'Custom' : (e.dividerType ? `Type ${e.dividerType}` : 'MFG')
}

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
  if (!iso) return '—'
  const d = new Date(iso)
  return !isNaN(d.getTime()) ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
}

function parseEntryDate(e) {
  if (e.productionDate) {
    if (typeof e.productionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.productionDate)) {
      const [y, m, d] = e.productionDate.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const d = new Date(e.productionDate)
    if (!isNaN(d.getTime())) return d
  }
  if (e.timestamp) {
    const d = new Date(e.timestamp)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function isToday(e) {
  const d = parseEntryDate(e)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate()
}

// ── Today stats ─────────────────────────────────────────────────
const todayEntries = computed(() => {
  return (store.ledgerEntries || []).filter(isToday)
})

const todayGood  = computed(() => todayEntries.value.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0))
const todayWaste = computed(() => todayEntries.value.reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0))

const todayByType = computed(() => {
  const map = {}
  todayEntries.value.forEach(e => {
    const lbl = getEntryTypeLabel(e)
    const qty = e.workCategory === 'TIME' ? Number(e.hoursWorked) : Number(e.goodProduction)
    map[lbl] = (map[lbl] || 0) + (qty || 0)
  })
  return map
})

const activeTypes = computed(() => new Set(todayEntries.value.map(e => getEntryTypeLabel(e))))

const topOperator = computed(() => {
  const map = {}
  todayEntries.value.forEach(e => {
    const isHourly = e.workCategory === 'TIME'
    const qty = isHourly ? (Number(e.hoursWorked) || 0) : (Number(e.goodProduction) || 0)
    if (!map[e.operator]) map[e.operator] = { qty: 0, isHourly }
    map[e.operator].qty += qty
  })
  const entries = Object.entries(map).sort((a, b) => b[1].qty - a[1].qty)
  if (!entries.length) return { name: '—', qty: 0, unit: 'pcs' }
  return {
    name: entries[0][0],
    qty: entries[0][1].qty,
    unit: entries[0][1].isHourly ? 'hrs' : 'pcs'
  }
})

const efficiencyRate = computed(() => {
  const total = todayGood.value + todayWaste.value
  if (!total) return '100.0'
  return ((todayGood.value / total) * 100).toFixed(1)
})

// ── Live feed (filtered by time window, most recent first, max 40) ─
const windowedEntries = computed(() => {
  const cutoff = cutoffMs(activeRange.value)
  return [...store.ledgerEntries]
    .filter(e => {
      const t = parseEntryDate(e).getTime()
      return t >= cutoff
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 40)
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
        const d = parseEntryDate(e)
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
        return entryHour === slotHour && hoursAgo >= 0 && hoursAgo <= hoursBack
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
  const entries = store.ledgerEntries.filter(e => parseEntryDate(e).getTime() >= cutoff)
  const map = {}
  entries.forEach(e => {
    const lbl = getEntryTypeLabel(e)
    const qty = e.workCategory === 'TIME' ? Number(e.hoursWorked) : Number(e.goodProduction)
    if (!map[lbl]) map[lbl] = { good: 0, waste: 0 }
    map[lbl].good  += qty || 0
    map[lbl].waste += Number(e.wasteMaterial) || 0
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

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 999px; padding: 0.4rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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
  flex: 1; min-width: 0;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 0.85rem;
  padding: 0.85rem 1rem;
  display: flex; align-items: center; gap: 0.75rem;
  position: relative; overflow: hidden;
}
.kpi-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
}
.kpi-card--green::before  { background: #10b981; }
.kpi-card--red::before    { background: #ef4444; }
.kpi-card--yellow::before { background: #f59e0b; }
.kpi-card--blue::before   { background: #3b82f6; }
.kpi-card--purple::before { background: #8b5cf6; }

.kpi-icon {
  font-size: 1.6rem; padding: 0.45rem; border-radius: 0.6rem; flex-shrink: 0;
}
.kpi-card--green  .kpi-icon { color: #34d399; background: rgba(16,185,129,0.12); }
.kpi-card--red    .kpi-icon { color: #f87171; background: rgba(239,68,68,0.12); }
.kpi-card--yellow .kpi-icon { color: #fbbf24; background: rgba(245,158,11,0.12); }
.kpi-card--blue   .kpi-icon { color: #60a5fa; background: rgba(59,130,246,0.12); }
.kpi-card--purple .kpi-icon { color: #c084fc; background: rgba(139,92,246,0.12); }

.kpi-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0; letter-spacing: 0.05em; }
.kpi-value { font-size: 1.35rem; font-weight: 900; color: #f1f5f9; margin: 0.1rem 0 0; line-height: 1.1; }
.kpi-value--name { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
.kpi-unit  { font-size: 0.65rem; color: #475569; margin: 0; }

/* ── Main Body ───────────────────────────────────────────────────── */
.lpd-body {
  display: flex; gap: 1rem; flex: 1; min-height: 0;
}

/* ── Live Feed (Left Column) ─────────────────────────────────────── */
.feed-section {
  flex: 1.1; min-width: 0;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  display: flex; flex-direction: column; gap: 0.75rem;
  min-height: 0;
}

.section-header {
  display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
}
.section-header h2 { font-size: 0.9rem; font-weight: 800; color: #f1f5f9; margin: 0; }
.entry-count-badge {
  margin-left: auto; font-size: 0.65rem; font-weight: 700; color: #6366f1;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);
  padding: 0.15rem 0.5rem; border-radius: 999px;
}

/* Type breakdown pills */
.type-pills {
  display: flex; gap: 0.4rem; flex-wrap: wrap; flex-shrink: 0;
}
.type-pill {
  display: flex; align-items: center; gap: 0.35rem;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.07);
  padding: 0.2rem 0.55rem; border-radius: 0.45rem;
  font-size: 0.7rem;
}
.pill-type { color: #94a3b8; font-weight: 600; }
.pill-qty  { color: #34d399; font-weight: 800; font-family: monospace; }

/* Feed list */
.feed-list {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.45rem;
  min-height: 0;
}
.feed-item {
  display: flex; align-items: center; gap: 0.65rem;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.04);
  border-radius: 0.65rem; padding: 0.6rem 0.75rem;
  transition: all 0.15s ease;
}
.feed-item:hover { border-color: rgba(99,102,241,0.3); }
.feed-item--waste { border-left: 3px solid #ef4444; }

.feed-body { flex: 1; min-width: 0; }
.feed-primary { font-size: 0.78rem; color: #cbd5e1; margin: 0; }
.feed-primary strong { color: #f1f5f9; }
.feed-qty.good  { color: #34d399; font-weight: 800; margin-left: 0.2rem; }
.feed-qty.waste { color: #f87171; font-weight: 800; margin-left: 0.2rem; }
.feed-meta { font-size: 0.65rem; color: #475569; margin: 0.1rem 0 0; }

.feed-ot-badge {
  background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3);
  color: #fbbf24; font-size: 0.6rem; font-weight: 800;
  padding: 0.05rem 0.35rem; border-radius: 0.25rem;
}
.feed-admin-badge { color: #818cf8; font-size: 0.62rem; font-weight: 700; }

.feed-badge {
  font-size: 0.8rem; font-weight: 900; font-family: monospace;
  padding: 0.25rem 0.55rem; border-radius: 0.45rem; flex-shrink: 0;
}
.feed-badge--good  { background: rgba(16,185,129,0.12); color: #34d399; }
.feed-badge--waste { background: rgba(239,68,68,0.12);   color: #f87171; }

.feed-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.5rem;
  color: #334155; font-size: 0.8rem;
}

/* Feed animations */
.feed-enter-active { transition: all 0.25s ease; }
.feed-enter-from   { opacity: 0; transform: translateY(-8px); }

/* ── Charts (Right Column) ───────────────────────────────────────── */
.chart-section {
  flex: 1.1; min-width: 0;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  display: flex; flex-direction: column; gap: 0.75rem;
  min-height: 0;
}

.range-tabs {
  margin-left: auto; display: flex; gap: 0.25rem;
  background: #0f172a; padding: 0.2rem; border-radius: 0.5rem;
}
.range-tab {
  background: transparent; border: none; color: #64748b;
  font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.6rem;
  border-radius: 0.35rem; cursor: pointer; transition: all 0.15s;
}
.range-tab--active { background: #6366f1; color: #fff; }

/* Bar chart */
.bar-chart-wrap {
  flex: 1; display: flex; flex-direction: column; min-height: 120px;
}
.bar-chart {
  flex: 1; display: flex; align-items: flex-end; gap: 0.35rem;
  padding: 0.5rem 0 0; min-height: 90px;
}
.bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  height: 100%; justify-content: flex-end;
}
.bar-value-label {
  font-size: 0.55rem; color: #64748b; font-family: monospace; height: 12px;
}
.bar-track {
  width: 100%; flex: 1; background: rgba(255,255,255,0.03);
  border-radius: 0.25rem; display: flex; flex-direction: column;
  justify-content: flex-end; overflow: hidden; position: relative;
}
.bar-fill {
  width: 100%; border-radius: 0.2rem 0.2rem 0 0;
  transition: height 0.4s ease;
}
.bar-fill--good  { background: #10b981; }
.bar-fill--waste { background: #ef4444; }
.bar-label {
  font-size: 0.58rem; color: #475569; font-family: monospace; height: 14px;
}

.chart-empty {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.4rem;
  color: #334155; font-size: 0.75rem;
}

.chart-legend {
  display: flex; gap: 1rem; justify-content: flex-end; padding-top: 0.25rem;
}
.legend-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.65rem; color: #64748b; }
.legend-dot  { width: 6px; height: 6px; border-radius: 50%; }

/* Type breakdown */
.type-breakdown {
  border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.6rem;
  flex-shrink: 0;
}
.breakdown-title {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  color: #64748b; margin: 0 0 0.5rem; letter-spacing: 0.05em;
}
.breakdown-title .material-symbols-rounded { font-size: 0.9rem; color: #6366f1; }
.breakdown-rows { display: flex; flex-direction: column; gap: 0.35rem; }
.breakdown-row {
  display: flex; align-items: center; gap: 0.6rem; font-size: 0.72rem;
}
.breakdown-type { width: 90px; color: #94a3b8; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.breakdown-bar-wrap {
  flex: 1; height: 6px; background: rgba(255,255,255,0.05);
  border-radius: 999px; overflow: hidden;
}
.breakdown-bar {
  height: 100%; background: linear-gradient(90deg,#6366f1,#8b5cf6);
  border-radius: 999px; transition: width 0.4s ease;
}
.breakdown-qty { width: 65px; text-align: right; color: #cbd5e1; font-family: monospace; font-weight: 700; }
.breakdown-empty { font-size: 0.7rem; color: #334155; text-align: center; padding: 0.5rem; }

/* ── Mobile Responsive ────────────────────────────────────────────── */
@media (max-width: 768px) {
  .lpd-root {
    height: auto; min-height: 100%; overflow-y: auto; padding: 1rem;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
  .lpd-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  .header-actions { width: 100%; justify-content: space-between; }
  .kpi-strip { flex-direction: column; }
  .lpd-body { flex-direction: column; }
}
</style>
