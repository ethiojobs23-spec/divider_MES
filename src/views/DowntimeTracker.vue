<template>
  <div class="downtime-layout">
    <!-- LEFT Sidebar -->
    <aside class="dt-sidebar">
      <!-- Reason Selector -->
      <div class="sidebar-section">
        <p class="section-title">Stoppage Reason</p>
        <div class="reason-list">
          <button
            v-for="r in reasons"
            :key="r.code"
            class="reason-btn"
            :class="{
              'reason-btn--active': selectedReason?.code === r.code,
              'reason-btn--disabled': store.activeDowntime !== null,
            }"
            @click="selectedReason = r"
          >
            <span class="reason-icon material-symbols-rounded">{{ r.icon }}</span>
            <span class="reason-text">{{ r.label }}</span>
          </button>
        </div>
      </div>

      <!-- Recent Sessions -->
      <div class="sidebar-section flex-1">
        <p class="section-title">Recent Stoppages</p>
        <div class="session-list">
          <div
            v-for="s in recentSessions"
            :key="s.id"
            class="session-item"
          >
            <div class="session-reason">{{ s.reason }}</div>
            <div class="session-meta">
              {{ fmtDuration(s.duration) }} &bull; {{ fmtTime(s.startTime) }}
            </div>
          </div>
          <p v-if="!recentSessions.length" class="empty-hint">No stoppages recorded</p>
        </div>
      </div>
    </aside>

    <!-- MAIN: Stopwatch -->
    <main class="dt-main">
      <!-- Active Downtime Banner -->
      <div v-if="store.activeDowntime" class="active-banner">
        <span class="material-symbols-rounded pulse">warning</span>
        LINE STOPPED – {{ store.activeDowntime.reason }}
      </div>

      <!-- Stopwatch Face -->
      <div class="stopwatch-ring" :class="{ 'ring--active': running }">
        <svg class="ring-svg" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="100" class="ring-track" />
          <circle
            cx="110" cy="110" r="100"
            class="ring-progress"
            :stroke-dashoffset="ringOffset"
            :class="store.activeDowntime ? 'ring-progress--danger' : 'ring-progress--idle'"
          />
        </svg>
        <div class="stopwatch-inner">
          <span class="sw-label">{{ store.activeDowntime ? 'DOWNTIME' : 'STANDBY' }}</span>
          <span class="sw-time">{{ formattedTime }}</span>
          <span class="sw-reason">{{ store.activeDowntime?.reason || '—' }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="dt-actions">
        <button
          v-if="!store.activeDowntime"
          class="dt-btn dt-btn--start"
          :disabled="!selectedReason"
          @click="startDowntime"
        >
          <span class="material-symbols-rounded">stop_circle</span>
          FLAG STOPPAGE
        </button>
        <button
          v-else
          class="dt-btn dt-btn--resolve"
          @click="resolveDowntime"
        >
          <span class="material-symbols-rounded">check_circle</span>
          RESOLVE ISSUE
        </button>
      </div>

      <p v-if="!selectedReason && !store.activeDowntime" class="hint-text">
        ← Select a stoppage reason from the sidebar first
      </p>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const reasons = [
  { code: 'MAT',  label: 'Material Shortage',   icon: 'inventory' },
  { code: 'EQP',  label: 'Equipment Failure',    icon: 'build' },
  { code: 'POW',  label: 'Power Outage',          icon: 'bolt' },
  { code: 'QC',   label: 'Quality Hold',          icon: 'verified' },
  { code: 'OTH',  label: 'Other / Unknown',       icon: 'help' },
]

const selectedReason = ref(null)

// Stopwatch
const elapsed = ref(0)
let timer = null

function tick() {
  if (store.activeDowntime) {
    elapsed.value = Date.now() - new Date(store.activeDowntime.startTime).getTime()
  }
}

onMounted(() => {
  if (store.activeDowntime) {
    elapsed.value = Date.now() - new Date(store.activeDowntime.startTime).getTime()
  }
  timer = setInterval(tick, 1000)
})
onUnmounted(() => clearInterval(timer))

const running = computed(() => !!store.activeDowntime)

const formattedTime = computed(() => {
  const s = Math.floor(elapsed.value / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
})

const CIRCUMFERENCE = 2 * Math.PI * 100 // r=100
const ringOffset = computed(() => {
  if (!store.activeDowntime) return CIRCUMFERENCE
  // Fill ring every 30 min cycle
  const pct = Math.min(1, elapsed.value / (30 * 60 * 1000))
  return CIRCUMFERENCE * (1 - pct)
})

function startDowntime() {
  if (!selectedReason.value) return
  elapsed.value = 0
  store.startDowntime(selectedReason.value.label)
}

function resolveDowntime() {
  store.resolveDowntime()
  elapsed.value = 0
  selectedReason.value = null
}

const recentSessions = computed(() =>
  [...store.downtimeSessions].reverse().slice(0, 6)
)

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m ${sec}s`
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.downtime-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* Sidebar */
.dt-sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  border-right: 1px solid rgba(239,68,68,.2);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: 1.25rem;
}
.sidebar-section { display: flex; flex-direction: column; gap: .5rem; }
.sidebar-section.flex-1 { flex: 1; overflow: hidden; }
.section-title {
  font-size: .65rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .1em;
  padding-bottom: .3rem; border-bottom: 1px solid rgba(255,255,255,.06);
}

.reason-list { display: flex; flex-direction: column; gap: .4rem; }
.reason-btn {
  display: flex; align-items: center; gap: .7rem;
  padding: .85rem .9rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  color: #94a3b8;
  border-radius: .65rem;
  font-size: .9rem; font-weight: 600;
  cursor: pointer;
  transition: all .13s ease;
  text-align: left;
}
.reason-btn:hover         { background: #1e293b; color: #e2e8f0; }
.reason-btn--active       { background: rgba(239,68,68,.15); border-color: #ef4444; color: #fca5a5; }
.reason-btn--disabled     { opacity: .4; pointer-events: none; }
.reason-icon              { font-size: 1.1rem; }

.session-list { display: flex; flex-direction: column; gap: .4rem; overflow-y: auto; flex: 1; }
.session-item {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .5rem;
  padding: .5rem .75rem;
}
.session-reason { font-size: .8rem; font-weight: 700; color: #e2e8f0; }
.session-meta   { font-size: .65rem; color: #64748b; margin-top: .1rem; }
.empty-hint     { font-size: .75rem; color: #334155; text-align: center; padding: 1rem 0; }

/* Main */
.dt-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem;
  position: relative;
}

.active-banner {
  position: absolute; top: 1.25rem; left: 50%; transform: translateX(-50%);
  background: rgba(239,68,68,.15);
  border: 1px solid rgba(239,68,68,.4);
  color: #fca5a5;
  padding: .5rem 1.5rem;
  border-radius: 999px;
  font-size: .85rem;
  font-weight: 700;
  letter-spacing: .06em;
  display: flex; align-items: center; gap: .5rem;
  white-space: nowrap;
}

/* Stopwatch */
.stopwatch-ring {
  position: relative;
  width: min(42vh, 380px);
  height: min(42vh, 380px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ring-svg   { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: rgba(255,255,255,.06); stroke-width: 8; }
.ring-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 628; /* 2*PI*100 */
  transition: stroke-dashoffset 1s linear;
}
.ring-progress--danger { stroke: #ef4444; }
.ring-progress--idle   { stroke: #334155; }

.stopwatch-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .25rem;
}
.sw-label { font-size: .65rem; font-weight: 700; letter-spacing: .12em; color: #64748b; text-transform: uppercase; }
.sw-time  { font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 900; color: #f1f5f9; letter-spacing: .05em; font-variant-numeric: tabular-nums; }
.sw-reason { font-size: .8rem; color: #f87171; font-weight: 600; }

.ring--active .sw-time { color: #fca5a5; }

/* Actions */
.dt-actions { display: flex; }
.dt-btn {
  height: 5rem;
  min-width: 18rem;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: .1em;
  border: none;
  border-radius: .85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  cursor: pointer;
  transition: all .15s ease;
}
.dt-btn:disabled { opacity: .35; cursor: not-allowed; }
.dt-btn--start   { background: linear-gradient(135deg,#dc2626,#ef4444); color: #fff; }
.dt-btn--resolve { background: linear-gradient(135deg,#059669,#10b981); color: #fff; }
.dt-btn:not(:disabled):hover  { filter: brightness(1.1); }
.dt-btn:not(:disabled):active { transform: scale(.97); }

.hint-text { font-size: .75rem; color: #475569; }

/* Pulse animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .4; }
}
.pulse { animation: pulse 1.2s ease infinite; }
</style>
