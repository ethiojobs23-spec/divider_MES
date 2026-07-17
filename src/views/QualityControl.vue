<template>
  <TabletLayout>
    <!-- ─── SIDEBAR: Top Performers Leaderboard ─────────────────────── -->
    <template #sidebar><!-- content is projected via default slot below --></template>
  </TabletLayout>

  <div class="qc-layout">
    <!-- LEFT: Leaderboard -->
    <aside class="qc-sidebar">
      <div class="sidebar-header">
        <span class="material-symbols-rounded" style="color:#f59e0b;font-size:1.4rem">emoji_events</span>
        <p class="sidebar-title">Top Performers</p>
      </div>
      <p class="sidebar-sub">Ranked by lowest waste %</p>

      <div class="leaderboard">
        <div
          v-for="(op, idx) in store.operatorEfficiency"
          :key="op.id"
          class="lb-card"
          :class="{
            'lb-card--gold':   idx === 0,
            'lb-card--silver': idx === 1,
            'lb-card--bronze': idx === 2,
          }"
        >
          <!-- Rank badge -->
          <div class="lb-rank" :class="`rank-${idx}`">
            <span v-if="idx === 0" class="material-symbols-rounded rank-icon">workspace_premium</span>
            <span v-else>{{ idx + 1 }}</span>
          </div>

          <!-- Avatar -->
          <div class="lb-avatar" :class="op.color">{{ op.avatar }}</div>

          <!-- Info -->
          <div class="lb-info">
            <p class="lb-name">{{ op.name }}</p>
            <p class="lb-stats">{{ op.good }} good &bull; {{ op.waste }} waste</p>
          </div>

          <!-- Waste % chip -->
          <div
            class="lb-pct"
            :class="
              op.wastePercent >= store.wasteThresholds.critical ? 'pct--critical' :
              op.wastePercent >= store.wasteThresholds.warn     ? 'pct--warn' : 'pct--ok'
            "
          >
            {{ op.total === 0 ? '—' : op.wastePercent + '%' }}
          </div>
        </div>

        <p v-if="!store.operatorEfficiency.length" class="empty-lb">No production data yet</p>
      </div>

      <!-- Threshold Legend -->
      <div class="threshold-legend">
        <div class="legend-item">
          <span class="dot dot--ok" />
          <span>Safe (&lt; {{ store.wasteThresholds.warn }}%)</span>
        </div>
        <div class="legend-item">
          <span class="dot dot--warn" />
          <span>Warning (&lt; {{ store.wasteThresholds.critical }}%)</span>
        </div>
        <div class="legend-item">
          <span class="dot dot--critical" />
          <span>Critical (&ge; {{ store.wasteThresholds.critical }}%)</span>
        </div>
      </div>
    </aside>

    <!-- RIGHT: Waste Timeline Feed -->
    <main class="qc-main">
      <!-- Header bar -->
      <div class="qc-topbar">
        <div class="topbar-left">
          <span class="material-symbols-rounded" style="color:#f59e0b;font-size:1.5rem">analytics</span>
          <div>
            <h1 class="topbar-title">Quality Control — Waste Feed</h1>
            <p class="topbar-sub">{{ store.currentProductionWeek }} &bull; {{ wasteEntries.length }} entries recorded</p>
          </div>
        </div>
        <div class="topbar-stats">
          <div class="stat-pill stat-pill--good">
            <span class="material-symbols-rounded">check_circle</span>
            <div>
              <p class="stat-val">{{ store.totalGoodAllTime }}</p>
              <p class="stat-lbl">Total Good</p>
            </div>
          </div>
          <div class="stat-pill stat-pill--waste">
            <span class="material-symbols-rounded">delete</span>
            <div>
              <p class="stat-val">{{ store.totalWasteAllTime }}</p>
              <p class="stat-lbl">Total Waste</p>
            </div>
          </div>
          <div
            class="stat-pill"
            :class="
              store.overallWastePct >= store.wasteThresholds.critical ? 'stat-pill--critical' :
              store.overallWastePct >= store.wasteThresholds.warn     ? 'stat-pill--warn' : 'stat-pill--ok'
            "
          >
            <span class="material-symbols-rounded">percent</span>
            <div>
              <p class="stat-val">{{ store.overallWastePct }}%</p>
              <p class="stat-lbl">Waste Rate</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="timeline-feed">
        <!-- Empty State -->
        <div v-if="wasteEntries.length === 0" class="empty-feed">
          <span class="material-symbols-rounded empty-icon">inventory</span>
          <p>No waste entries logged yet.</p>
          <p class="empty-sub">Entries appear here when operators save production with waste data.</p>
        </div>

        <TransitionGroup name="feed" tag="div" class="feed-list">
          <div
            v-for="entry in wasteEntries"
            :key="entry.id"
            class="feed-card"
            :class="{
              'feed-card--critical': entry.wastePercent >= store.wasteThresholds.critical,
              'feed-card--warn':     entry.wastePercent >= store.wasteThresholds.warn && entry.wastePercent < store.wasteThresholds.critical,
            }"
          >
            <!-- Alert Badge -->
            <div
              v-if="entry.wastePercent >= store.wasteThresholds.warn"
              class="alert-badge"
              :class="entry.wastePercent >= store.wasteThresholds.critical ? 'badge--critical' : 'badge--warn'"
            >
              <span class="material-symbols-rounded" style="font-size:1rem">{{ entry.wastePercent >= store.wasteThresholds.critical ? 'crisis_alert' : 'warning' }}</span>
              {{ entry.wastePercent >= store.wasteThresholds.critical ? 'CRITICAL' : 'HIGH WASTE' }}
            </div>

            <!-- Entry Body -->
            <div class="card-row">
              <!-- Operator chip -->
              <div class="card-op">
                <div
                  class="op-dot"
                  :style="{ background: opColor(entry.operator) }"
                >{{ entry.operator[0] }}</div>
                <span class="op-name-sm">{{ entry.operator }}</span>
              </div>

              <!-- Product details -->
              <div class="card-meta">
                <span class="meta-badge">Type {{ entry.dividerType }}</span>
                <span class="meta-badge">{{ entry.size }}</span>
                <span class="meta-badge">{{ entry.placement }}</span>
              </div>

              <!-- Numbers -->
              <div class="card-numbers">
                <div class="num-item num-good">
                  <span class="material-symbols-rounded" style="font-size:.9rem">check_circle</span>
                  {{ entry.goodProduction }} pcs
                </div>
                <div class="num-item num-waste">
                  <span class="material-symbols-rounded" style="font-size:.9rem">delete</span>
                  {{ entry.wasteMaterial }} pcs
                </div>
              </div>

              <!-- Waste % bar -->
              <div class="card-bar-wrap">
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :class="{
                      'bar--critical': entry.wastePercent >= store.wasteThresholds.critical,
                      'bar--warn':     entry.wastePercent >= store.wasteThresholds.warn,
                      'bar--ok':       entry.wastePercent < store.wasteThresholds.warn,
                    }"
                    :style="{ width: Math.min(100, entry.wastePercent) + '%' }"
                  />
                </div>
                <span
                  class="bar-pct"
                  :class="{
                    'pct--critical': entry.wastePercent >= store.wasteThresholds.critical,
                    'pct--warn':     entry.wastePercent >= store.wasteThresholds.warn,
                    'pct--ok':       entry.wastePercent < store.wasteThresholds.warn,
                  }"
                >{{ entry.wastePercent }}%</span>
              </div>

              <!-- Timestamp -->
              <div class="card-time">{{ fmtTime(entry.timestamp) }}</div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TabletLayout from '@/components/layout/TabletLayout.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// Only entries that have any waste data
const wasteEntries = computed(() => {
  return [...store.ledgerEntries]
    .map(e => {
      const good  = Number(e.goodProduction) || 0
      const waste = Number(e.wasteMaterial)  || 0
      const total = good + waste
      return {
        ...e,
        wastePercent: total > 0 ? +((waste / total) * 100).toFixed(1) : 0,
      }
    })
    .filter(e => e.wasteMaterial > 0 || e.goodProduction > 0)
    .reverse()
})

// Avatar gradient fallback using op color CSS classes → inline style
const OP_COLORS = {
  Zelalem: '#059669', Aben: '#4f46e5', Teme: '#7c3aed',
  Selam: '#d97706',   Biruk: '#e11d48', Meron: '#0891b2',
}
function opColor(name) { return OP_COLORS[name] ?? '#475569' }

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' — ' + new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short',
  })
}
</script>

<style scoped>
.qc-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* ── Sidebar ───────────────────────────────────────────────────────────── */
.qc-sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  border-right: 1px solid rgba(245,158,11,.25);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: .9rem;
  overflow: hidden;
}
.sidebar-header { display: flex; align-items: center; gap: .6rem; }
.sidebar-title  { font-size: 1rem; font-weight: 800; color: #f1f5f9; }
.sidebar-sub    { font-size: .65rem; color: #64748b; letter-spacing: .06em; text-transform: uppercase; margin-top: -.4rem; }

.leaderboard { display: flex; flex-direction: column; gap: .5rem; flex: 1; overflow-y: auto; }

.lb-card {
  display: flex;
  align-items: center;
  gap: .65rem;
  padding: .7rem .8rem;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .75rem;
  transition: border-color .15s ease;
}
.lb-card--gold   { border-color: rgba(234,179,8,.4);  background: rgba(234,179,8,.07); }
.lb-card--silver { border-color: rgba(148,163,184,.3); background: rgba(148,163,184,.05); }
.lb-card--bronze { border-color: rgba(180,83,9,.3);   background: rgba(180,83,9,.05); }

.lb-rank {
  width: 1.8rem; height: 1.8rem;
  border-radius: .35rem;
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 800; color: #94a3b8;
  background: rgba(255,255,255,.06);
  flex-shrink: 0;
}
.rank-0 { background: rgba(234,179,8,.2); color: #fbbf24; }
.rank-1 { background: rgba(148,163,184,.15); color: #cbd5e1; }
.rank-2 { background: rgba(180,83,9,.2); color: #fb923c; }
.rank-icon { font-size: 1rem !important; }

.lb-avatar {
  width: 2rem; height: 2rem;
  border-radius: .4rem;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .8rem; color: #fff;
  flex-shrink: 0;
}
.lb-info { flex: 1; min-width: 0; }
.lb-name  { font-size: .85rem; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lb-stats { font-size: .62rem; color: #64748b; margin-top: .05rem; }

.lb-pct {
  font-size: .8rem; font-weight: 800;
  padding: .2rem .5rem;
  border-radius: .35rem;
  flex-shrink: 0;
}
.pct--ok       { background: rgba(16,185,129,.15); color: #34d399; }
.pct--warn     { background: rgba(245,158,11,.15); color: #fbbf24; }
.pct--critical { background: rgba(239,68,68,.15);  color: #f87171; }

.empty-lb { font-size: .75rem; color: #334155; text-align: center; padding: 1rem 0; }

.threshold-legend {
  display: flex; flex-direction: column; gap: .3rem;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .65rem;
  padding: .65rem .75rem;
}
.legend-item { display: flex; align-items: center; gap: .5rem; font-size: .7rem; color: #64748b; }
.dot { width: .55rem; height: .55rem; border-radius: 50%; flex-shrink: 0; }
.dot--ok       { background: #10b981; }
.dot--warn     { background: #f59e0b; }
.dot--critical { background: #ef4444; }

/* ── Main ──────────────────────────────────────────────────────────────── */
.qc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Topbar */
.qc-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.topbar-left  { display: flex; align-items: center; gap: .75rem; }
.topbar-title { font-size: 1rem; font-weight: 800; color: #f1f5f9; }
.topbar-sub   { font-size: .7rem; color: #64748b; margin-top: .1rem; }
.topbar-stats { display: flex; gap: .6rem; }

.stat-pill {
  display: flex; align-items: center; gap: .5rem;
  padding: .5rem .9rem;
  border-radius: .65rem;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
}
.stat-pill .material-symbols-rounded { font-size: 1.25rem; }
.stat-val  { font-size: .9rem; font-weight: 800; line-height: 1; }
.stat-lbl  { font-size: .6rem; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
.stat-pill--good     .stat-val { color: #34d399; }
.stat-pill--good     .material-symbols-rounded { color: #34d399; }
.stat-pill--waste    .stat-val { color: #f87171; }
.stat-pill--waste    .material-symbols-rounded { color: #f87171; }
.stat-pill--ok       .stat-val { color: #34d399; }
.stat-pill--warn     .stat-val { color: #fbbf24; }
.stat-pill--critical .stat-val { color: #f87171; }

/* Timeline Feed */
.timeline-feed {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

.empty-feed {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: .75rem; color: #334155;
}
.empty-icon { font-size: 3.5rem; }
.empty-sub  { font-size: .75rem; color: #1e3a5f; text-align: center; max-width: 300px; }

.feed-list { display: flex; flex-direction: column; gap: .65rem; }

.feed-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: .9rem 1.1rem;
  position: relative;
  transition: border-color .2s ease;
}
.feed-card--warn     { border-left: 3px solid #f59e0b; }
.feed-card--critical { border-left: 3px solid #ef4444; background: rgba(239,68,68,.04); }

.alert-badge {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .08em;
  padding: .15rem .55rem;
  border-radius: 999px;
  margin-bottom: .5rem;
}
.badge--warn     { background: rgba(245,158,11,.2); color: #fbbf24; }
.badge--critical { background: rgba(239,68,68,.2);  color: #f87171; }

.card-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.card-op   { display: flex; align-items: center; gap: .45rem; min-width: 90px; }
.op-dot    { width: 1.7rem; height: 1.7rem; border-radius: .35rem; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .75rem; color: #fff; flex-shrink: 0; }
.op-name-sm { font-size: .82rem; font-weight: 700; color: #e2e8f0; }

.card-meta  { display: flex; gap: .3rem; flex-wrap: wrap; }
.meta-badge {
  background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  font-size: .65rem;
  font-weight: 700;
  padding: .15rem .45rem;
  border-radius: .3rem;
}

.card-numbers { display: flex; gap: .75rem; margin-left: auto; }
.num-item { display: flex; align-items: center; gap: .2rem; font-size: .82rem; font-weight: 700; }
.num-good  { color: #34d399; }
.num-waste { color: #f87171; }

.card-bar-wrap {
  display: flex; align-items: center; gap: .5rem; min-width: 120px;
}
.bar-track {
  flex: 1; height: .45rem;
  background: rgba(255,255,255,.08);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width .4s ease;
}
.bar--ok       { background: #10b981; }
.bar--warn     { background: #f59e0b; }
.bar--critical { background: #ef4444; }
.bar-pct { font-size: .78rem; font-weight: 800; min-width: 2.5rem; text-align: right; }

.card-time { font-size: .65rem; color: #475569; white-space: nowrap; margin-left: auto; }

/* Transitions */
.feed-enter-active { transition: all .3s ease; }
.feed-enter-from   { opacity: 0; transform: translateY(-10px); }
</style>
