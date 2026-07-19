<template>
  <div class="hub-screen">

    <!-- ── Ambient glow spots ─────────────────────────────────────── -->
    <div class="glow glow--purple" aria-hidden="true" />
    <div class="glow glow--blue"   aria-hidden="true" />

    <!-- ── Header bar ────────────────────────────────────────────── -->
    <header class="hub-header">
      <div class="hub-logo">
        <span class="material-symbols-rounded hub-logo-icon">precision_manufacturing</span>
      </div>
      <div class="hub-title-block">
        <p class="hub-eyebrow">SODOFIX MANUFACTURING EXECUTION SYSTEM</p>
        <h1 class="hub-title">Select Module</h1>
      </div>
      <div class="hub-meta">
        <div class="meta-item">
          <span class="meta-label">Production Week</span>
          <span class="meta-value">{{ mesStore.currentProductionWeek }}</span>
        </div>
        <div class="meta-divider" />
        <div class="meta-item">
          <span class="meta-label">System Time</span>
          <span class="meta-value meta-clock">{{ clock }}</span>
        </div>
        <button class="lock-btn" title="Lock System" @click="lockSystem">
          <span class="material-symbols-rounded">lock</span>
        </button>
      </div>
    </header>

    <!-- ── Module cards grid ──────────────────────────────────────── -->
    <main class="hub-grid">

      <!-- 1. Attendance Kiosk -->
      <button class="module-card card--emerald" @click="go('/login')">
        <div class="card-glow" />
        <span class="material-symbols-rounded card-icon">how_to_reg</span>
        <div class="card-body">
          <p class="card-eyebrow">ATTENDANCE</p>
          <h2 class="card-title">Kiosk</h2>
          <p class="card-sub">Launch Smart Check-In</p>
        </div>
        <span class="material-symbols-rounded card-arrow">arrow_forward</span>
      </button>

      <!-- 2. Production Logger -->
      <button class="module-card card--blue" @click="go('/production')">
        <div class="card-glow" />
        <span class="material-symbols-rounded card-icon">factory</span>
        <div class="card-body">
          <p class="card-eyebrow">PRODUCTION</p>
          <h2 class="card-title">Logger</h2>
          <p class="card-sub">Launch Line Workstation</p>
        </div>
        <span class="material-symbols-rounded card-arrow">arrow_forward</span>
      </button>

      <!-- 3. Inventory & Procurement -->
      <button class="module-card card--amber" @click="go('/inventory')">
        <div class="card-glow" />
        <span class="material-symbols-rounded card-icon">inventory_2</span>
        <div class="card-body">
          <p class="card-eyebrow">INVENTORY & PROCUREMENT</p>
          <h2 class="card-title">Warehouse</h2>
          <p class="card-sub">Launch Warehouse Manager</p>
        </div>
        <span class="material-symbols-rounded card-arrow">arrow_forward</span>
      </button>

      <!-- 4. Financial & Payroll Hub -->
      <button class="module-card card--purple" @click="go('/payroll')">
        <div class="card-glow" />
        <span class="material-symbols-rounded card-icon">account_balance_wallet</span>
        <div class="card-body">
          <p class="card-eyebrow">FINANCIAL & PAYROLL</p>
          <h2 class="card-title">Admin Hub</h2>
          <p class="card-sub">Launch Admin Financials</p>
        </div>
        <span class="material-symbols-rounded card-arrow">arrow_forward</span>
      </button>

      <!-- 5. Executive Analytics -->
      <button class="module-card card--slate" @click="go('/analytics')">
        <div class="card-glow" />
        <span class="material-symbols-rounded card-icon">analytics</span>
        <div class="card-body">
          <p class="card-eyebrow">EXECUTIVE</p>
          <h2 class="card-title">Analytics</h2>
          <p class="card-sub">Launch Founder Dashboard</p>
        </div>
        <span class="material-symbols-rounded card-arrow">arrow_forward</span>
      </button>

      <!-- 6. Payroll & Payment Approval ← PROMINENT -->
      <button class="module-card card--gold" @click="go('/payroll')">
        <div class="card-glow" />
        <!-- Badge: signals action required -->
        <div class="card-action-badge">APPROVAL REQUIRED</div>
        <span class="material-symbols-rounded card-icon">payments</span>
        <div class="card-body">
          <p class="card-eyebrow">PAYROLL & PAYMENT</p>
          <h2 class="card-title">Approval</h2>
          <p class="card-sub">Review & Authorize Weekly Payouts</p>
        </div>
        <span class="material-symbols-rounded card-arrow">arrow_forward</span>
      </button>

    </main>

    <!-- ── Footer ─────────────────────────────────────────────────── -->
    <footer class="hub-footer">
      <span>MES v2.0</span>
      <span class="footer-sep">·</span>
      <span>{{ today }}</span>
      <span class="footer-sep">·</span>
      <span>System Unlocked</span>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMesStore } from '@/store/mesStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'

const router   = useRouter()
const mesStore = useMesStore()
const sysAuth  = useSystemAuthStore()

// ── Navigate to module ────────────────────────────────────────────────────
function go(path) {
  router.push(path)
}

// ── Lock system ───────────────────────────────────────────────────────────
function lockSystem() {
  sysAuth.lockSystem()
  router.replace({ name: 'WelcomeAuth' })
}

// ── Live clock ────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockTimer = null
const pad = (n) => String(n).padStart(2, '0')

const clock = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})
const today = computed(() =>
  now.value.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
)

onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(clockTimer))
</script>

<style scoped>
/* ── Root ────────────────────────────────────────────────────────────────── */
.hub-screen {
  width: 100vw;
  height: 100vh;
  background: #0f172a;          /* slate-900 */
  display: flex;
  flex-direction: column;
  padding: 1.5rem 2rem;
  overflow: hidden;
  position: relative;
  font-family: 'Inter', sans-serif;
}

/* ── Ambient glows ───────────────────────────────────────────────────────── */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  opacity: .18;
}
.glow--purple {
  width: 500px; height: 500px;
  background: #7c3aed;
  top: -120px; left: -100px;
}
.glow--blue {
  width: 400px; height: 400px;
  background: #2563eb;
  bottom: -100px; right: -80px;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.hub-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  z-index: 1;
}

.hub-logo {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: .75rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hub-logo-icon { font-size: 1.75rem; color: #fff; }

.hub-title-block { flex: 1; }
.hub-eyebrow {
  font-size: .6rem;
  font-weight: 700;
  letter-spacing: .18em;
  color: #6366f1;
  text-transform: uppercase;
  margin: 0 0 .15rem;
}
.hub-title {
  font-size: 1.6rem;
  font-weight: 900;
  color: #f1f5f9;
  margin: 0;
}

.hub-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}
.meta-item { display: flex; flex-direction: column; align-items: flex-end; }
.meta-label { font-size: .6rem; color: #64748b; text-transform: uppercase; letter-spacing: .1em; }
.meta-value { font-size: 1rem; font-weight: 700; color: #a5b4fc; }
.meta-clock { font-variant-numeric: tabular-nums; color: #94a3b8; }
.meta-divider { width: 1px; height: 2rem; background: rgba(255,255,255,.08); }

.lock-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: .6rem;
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.25);
  color: #f87171;
  cursor: pointer;
  transition: background .15s ease;
  margin-left: .5rem;
}
.lock-btn:hover  { background: rgba(239,68,68,.2); }
.lock-btn:active { transform: scale(.95); }

/* ── Module grid ─────────────────────────────────────────────────────────── */
.hub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1.1rem;
  flex: 1;
  z-index: 1;
  min-height: 0;
}

/* ── Base card ───────────────────────────────────────────────────────────── */
.module-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 1.75rem 1.5rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(255,255,255,.07);
  background: #1e293b;
  cursor: pointer;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
  gap: 0;
}
.module-card:hover  { transform: translateY(-4px); }
.module-card:active { transform: scale(.97); }

/* Per-color glow layer behind content */
.card-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity .25s ease;
  border-radius: inherit;
}
.module-card:hover .card-glow { opacity: 1; }

/* ── Icon ────────────────────────────────────────────────────────────────── */
.card-icon {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-size: 3.5rem;
  opacity: .25;
  transition: opacity .2s ease, transform .2s ease;
}
.module-card:hover .card-icon { opacity: .45; transform: scale(1.1) rotate(-5deg); }

/* ── Body ────────────────────────────────────────────────────────────────── */
.card-body { display: flex; flex-direction: column; gap: .2rem; }
.card-eyebrow {
  font-size: .55rem;
  font-weight: 700;
  letter-spacing: .18em;
  opacity: .6;
  margin: 0;
  text-transform: uppercase;
}
.card-title {
  font-size: 1.75rem;
  font-weight: 900;
  color: #f1f5f9;
  margin: 0;
  line-height: 1.1;
}
.card-sub {
  font-size: .72rem;
  opacity: .55;
  margin: .3rem 0 0;
  color: #e2e8f0;
}

/* ── Arrow ───────────────────────────────────────────────────────────────── */
.card-arrow {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  font-size: 1.3rem;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity .2s ease, transform .2s ease;
  color: #fff;
}
.module-card:hover .card-arrow {
  opacity: .7;
  transform: translateX(0);
}

/* ── Emerald — Attendance ────────────────────────────────────────────────── */
.card--emerald {
  border-color: rgba(16,185,129,.2);
  background: linear-gradient(145deg, #1e293b 0%, rgba(16,185,129,.08) 100%);
}
.card--emerald .card-glow { background: radial-gradient(ellipse at 80% 20%, rgba(16,185,129,.12) 0%, transparent 70%); }
.card--emerald .card-icon,
.card--emerald .card-eyebrow,
.card--emerald .card-arrow { color: #34d399; }
.card--emerald:hover { border-color: rgba(16,185,129,.45); box-shadow: 0 8px 32px rgba(16,185,129,.15); }

/* ── Blue — Production ───────────────────────────────────────────────────── */
.card--blue {
  border-color: rgba(59,130,246,.2);
  background: linear-gradient(145deg, #1e293b 0%, rgba(59,130,246,.08) 100%);
}
.card--blue .card-glow { background: radial-gradient(ellipse at 80% 20%, rgba(59,130,246,.12) 0%, transparent 70%); }
.card--blue .card-icon,
.card--blue .card-eyebrow,
.card--blue .card-arrow { color: #60a5fa; }
.card--blue:hover { border-color: rgba(59,130,246,.45); box-shadow: 0 8px 32px rgba(59,130,246,.15); }

/* ── Amber — Inventory ───────────────────────────────────────────────────── */
.card--amber {
  border-color: rgba(245,158,11,.2);
  background: linear-gradient(145deg, #1e293b 0%, rgba(245,158,11,.08) 100%);
}
.card--amber .card-glow { background: radial-gradient(ellipse at 80% 20%, rgba(245,158,11,.12) 0%, transparent 70%); }
.card--amber .card-icon,
.card--amber .card-eyebrow,
.card--amber .card-arrow { color: #fbbf24; }
.card--amber:hover { border-color: rgba(245,158,11,.45); box-shadow: 0 8px 32px rgba(245,158,11,.15); }

/* ── Purple — Payroll ────────────────────────────────────────────────────── */
.card--purple {
  border-color: rgba(139,92,246,.2);
  background: linear-gradient(145deg, #1e293b 0%, rgba(139,92,246,.08) 100%);
}
.card--purple .card-glow { background: radial-gradient(ellipse at 80% 20%, rgba(139,92,246,.12) 0%, transparent 70%); }
.card--purple .card-icon,
.card--purple .card-eyebrow,
.card--purple .card-arrow { color: #a78bfa; }
.card--purple:hover { border-color: rgba(139,92,246,.45); box-shadow: 0 8px 32px rgba(139,92,246,.15); }

/* ── Slate — Analytics ───────────────────────────────────────────────────── */
.card--slate {
  border-color: rgba(100,116,139,.3);
  background: linear-gradient(145deg, #1e293b 0%, rgba(100,116,139,.1) 100%);
}
.card--slate .card-glow { background: radial-gradient(ellipse at 80% 20%, rgba(100,116,139,.15) 0%, transparent 70%); }
.card--slate .card-icon,
.card--slate .card-eyebrow,
.card--slate .card-arrow { color: #94a3b8; }
.card--slate:hover { border-color: rgba(100,116,139,.55); box-shadow: 0 8px 32px rgba(100,116,139,.15); }

/* ── Gold/Purple — Payroll Approval (prominent) ───────────────────────────── */
.card--gold {
  border-color: rgba(234,179,8,.3);
  background: linear-gradient(145deg, #1e293b 0%, rgba(139,92,246,.1) 40%, rgba(234,179,8,.08) 100%);
}
.card--gold .card-glow {
  background: radial-gradient(ellipse at 80% 20%,
    rgba(234,179,8,.14) 0%,
    rgba(139,92,246,.1) 50%,
    transparent 70%);
}
.card--gold .card-icon   { color: #fbbf24; }
.card--gold .card-eyebrow { color: #c084fc; }
.card--gold .card-arrow  { color: #fbbf24; }
.card--gold:hover {
  border-color: rgba(234,179,8,.55);
  box-shadow: 0 8px 40px rgba(234,179,8,.18), 0 4px 16px rgba(139,92,246,.12);
}

/* Action badge on the gold card */
.card-action-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: linear-gradient(135deg, #7c3aed, #d97706);
  color: #fff;
  font-size: .52rem;
  font-weight: 800;
  letter-spacing: .14em;
  padding: .2rem .6rem;
  border-radius: 999px;
  text-transform: uppercase;
  animation: pulse-badge 2.4s ease-in-out infinite;
}
@keyframes pulse-badge {
  0%,100% { opacity: 1; }
  50%      { opacity: .55; }
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.hub-footer {
  display: flex;
  align-items: center;
  gap: .6rem;
  font-size: .65rem;
  color: #334155;
  letter-spacing: .06em;
  margin-top: 1rem;
  z-index: 1;
}
.footer-sep { color: #1e293b; }
</style>
