<template>
  <div class="tablet-layout">
    <!-- ─── Global Network Status Banner ─────────────────────────────── -->
    <NetworkBanner />

    <!-- ─── Sidebar ───────────────────────────────────────────────── -->
    <aside class="sidebar">
      <!-- Logo / Brand -->
      <div class="sidebar-brand">
        <div class="brand-icon">⚡</div>
        <div>
          <p class="brand-title">Divider MES</p>
          <p class="brand-sub">Factory Floor System</p>
        </div>
      </div>

      <!-- Live Clock + Shift Status -->
      <div class="clock-block">
        <p class="clock-time">{{ currentTime }}</p>
        <p class="clock-date">{{ currentDate }}</p>
        <p class="clock-week">{{ mesStore.currentProductionWeek }}</p>
      </div>

      <!-- Global Auth Context Strip (Action 2 requirement) -->
      <div class="auth-strip">
        <!-- Online/Offline indicator -->
        <div class="sync-pill" :class="syncState.isOnline ? 'sync-pill--online' : 'sync-pill--offline'">
          <span class="sync-dot" />
          <span>{{ syncState.isOnline ? 'ONLINE' : 'OFFLINE' }}</span>
          <span v-if="syncState.pendingCount > 0" class="sync-count">{{ syncState.pendingCount }}</span>
        </div>
        <!-- Authorized manager name from systemAuthStore -->
        <div class="manager-label" v-if="sysAuth.authorizedManager">
          <span class="material-symbols-rounded manager-icon">admin_panel_settings</span>
          <span>{{ sysAuth.authorizedManager }}</span>
        </div>
        <!-- Shift duration -->
        <div class="shift-label" v-if="sysAuth.shiftStartedAt">
          <span class="material-symbols-rounded">timer</span>
          <span>{{ sysAuth.shiftDuration }}</span>
        </div>
      </div>

      <!-- Active Operator Badge -->
      <div v-if="mesStore.activeOperator" class="operator-badge">
        <div class="op-avatar" :class="mesStore.activeOperator.color">
          {{ mesStore.activeOperator.avatar }}
        </div>
        <div class="op-info">
          <p class="op-name">{{ mesStore.activeOperator.name }}</p>
          <p class="op-role">{{ mesStore.activeOperator.role }}</p>
        </div>
      </div>
      <div v-else class="operator-badge-empty">
        <span>No Operator Active</span>
      </div>

      <!-- Navigation — filtered to nav:true routes only -->
      <nav class="sidebar-nav">
        <router-link
          v-for="route in navRoutes"
          :key="route.path"
          :to="route.path"
          class="nav-item"
          active-class="nav-item--active"
        >
          <span class="nav-icon material-symbols-rounded">{{ route.meta.icon }}</span>
          <span class="nav-label">{{ route.meta.title }}</span>
          <!-- Admin lock badge -->
          <span v-if="route.meta.requiresAdmin" class="nav-admin-badge material-symbols-rounded">lock</span>
        </router-link>
      </nav>

      <!-- ── Back Navigation ──────────────────────────────────── -->
      <div class="back-btn-group">
        <button class="back-prev" @click="goBack" title="Go back">
          <span class="material-symbols-rounded">arrow_back</span>
        </button>
        <button class="back-to-hub" @click="router.push('/hub')">
          <span class="material-symbols-rounded back-hub-icon">home</span>
          <span class="back-hub-label">Back to Hub</span>
        </button>
      </div>
    </aside>

    <!-- ─── Main Content ──────────────────────────────────────────── -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { routes } from '@/router/index.js'
import { useMesStore }        from '@/store/mesStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { syncState }          from '@/services/syncManager.js'
import NetworkBanner          from '@/components/ui/NetworkBanner.vue'

const router   = useRouter()
const mesStore = useMesStore()
const sysAuth  = useSystemAuthStore()

// ─── Smart Back Navigation (never wipes Pinia state) ─────────────────────
// router.back() / router.push() are in-SPA — Pinia state is never wiped.
function goBack() {
  if (window.history.length > 2) {
    router.back()
  } else {
    router.push('/hub')
  }
}

// ─── Live Clock ────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockInterval

const pad = (n) => String(n).padStart(2, '0')

const currentTime = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const currentDate = computed(() =>
  now.value.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
)

onMounted(() => {
  clockInterval = setInterval(() => { now.value = new Date() }, 1000)
})
onUnmounted(() => clearInterval(clockInterval))

// ─── Nav Routes — only routes with meta.nav = true ────────────────────────
const navRoutes = computed(() => routes.filter(r => r.meta?.nav))
</script>

<style scoped>
.tablet-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: .75rem;
  border-right: 1px solid rgba(99,102,241,.25);
  overflow: hidden;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding-bottom: .75rem;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.brand-icon {
  font-size: 1.75rem;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  border-radius: .5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.brand-title  { font-weight: 700; font-size: 1rem; color: #f1f5f9; line-height: 1.2; }
.brand-sub    { font-size: .65rem; color: #64748b; letter-spacing: .06em; text-transform: uppercase; }

/* ── Clock ────────────────────────────────────────────────────────────── */
.clock-block {
  background: linear-gradient(135deg, rgba(99,102,241,.15), rgba(139,92,246,.1));
  border: 1px solid rgba(99,102,241,.3);
  border-radius: .75rem;
  padding: .75rem 1rem;
  text-align: center;
}
.clock-time  { font-size: 2.4rem; font-weight: 800; color: #e2e8f0; letter-spacing: .05em; line-height: 1; font-variant-numeric: tabular-nums; }
.clock-date  { font-size: .7rem; color: #94a3b8; margin-top: .2rem; }
.clock-week  { display: inline-block; margin-top: .35rem; background: rgba(99,102,241,.3); color: #a5b4fc; font-size: .65rem; font-weight: 700; border-radius: 999px; padding: .1rem .6rem; letter-spacing: .08em; }

/* ── Auth / Sync Context Strip ────────────────────────────────────────── */
.auth-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem;
  padding: .5rem .75rem;
  background: rgba(0,0,0,.25);
  border-radius: .6rem;
  border: 1px solid rgba(255,255,255,.06);
}

.sync-pill {
  display: flex;
  align-items: center;
  gap: .3rem;
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .06em;
  padding: .2rem .5rem;
  border-radius: 999px;
}
.sync-pill--online  { background: rgba(16,185,129,.15); color: #34d399; }
.sync-pill--offline { background: rgba(239,68,68,.15);  color: #fca5a5; }
.sync-dot {
  width: .45rem; height: .45rem;
  border-radius: 50%;
  background: currentColor;
}
.sync-count {
  background: rgba(239,68,68,.3);
  color: #fca5a5;
  font-size: .6rem;
  padding: 0 .35rem;
  border-radius: 999px;
  font-weight: 800;
}

.manager-label,
.shift-label {
  display: flex;
  align-items: center;
  gap: .25rem;
  font-size: .65rem;
  color: #64748b;
}
.manager-label { color: #a5b4fc; }
.manager-icon  { font-size: .9rem; }

/* ── Operator Badge ────────────────────────────────────────────────────── */
.operator-badge {
  display: flex;
  align-items: center;
  gap: .75rem;
  background: rgba(255,255,255,.05);
  border-radius: .75rem;
  padding: .6rem .75rem;
  border: 1px solid rgba(255,255,255,.08);
}
.op-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: .5rem;
  background: linear-gradient(135deg,#10b981,#0d9488);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
  color: #fff;
  flex-shrink: 0;
}
.op-name { font-size: .85rem; font-weight: 700; color: #f1f5f9; }
.op-role { font-size: .65rem; color: #64748b; }
.operator-badge-empty {
  text-align: center;
  font-size: .75rem;
  color: #475569;
  padding: .5rem;
  border: 1px dashed rgba(255,255,255,.1);
  border-radius: .5rem;
}

/* ── Navigation ────────────────────────────────────────────────────────── */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: .3rem;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: .65rem;
  padding: .65rem .85rem;
  border-radius: .6rem;
  color: #64748b;
  text-decoration: none;
  font-size: .82rem;
  font-weight: 600;
  transition: all .15s ease;
  cursor: pointer;
  position: relative;
}
.nav-item:hover          { background: rgba(255,255,255,.06); color: #cbd5e1; }
.nav-item--active        { background: rgba(99,102,241,.2); color: #a5b4fc; }
.nav-icon                { font-size: 1.2rem; flex-shrink: 0; }
.nav-label               { font-size: .82rem; flex: 1; }
.nav-admin-badge         { font-size: .75rem; color: #f59e0b; opacity: .7; }

/* ── Back Button Group ─────────────────────────────────────────────── */
.back-btn-group {
  display: flex;
  gap: .5rem;
  flex-shrink: 0;
}
.back-prev {
  width: 4rem;
  min-height: 4.5rem;
  background: rgba(99,102,241,.08);
  border: 1px solid rgba(99,102,241,.2);
  border-radius: .85rem;
  color: #a5b4fc;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .15s ease, border-color .15s ease, transform .08s ease;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.back-prev:hover  { background: rgba(99,102,241,.2); border-color: rgba(99,102,241,.45); }
.back-prev:active { transform: scale(.95); }
.back-prev .material-symbols-rounded { font-size: 1.4rem; }

.back-to-hub {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .65rem;
  width: 100%;
  min-height: 4.5rem;
  background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.3);
  border-radius: .85rem;
  color: #a5b4fc;
  font-size: .95rem;
  font-weight: 800;
  letter-spacing: .04em;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease, transform .08s ease;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.back-to-hub:hover  { background: rgba(99,102,241,.22); border-color: rgba(99,102,241,.5); color: #c4b5fd; }
.back-to-hub:active { transform: scale(.97); background: rgba(99,102,241,.32); }
.back-hub-icon  { font-size: 1.4rem; }
.back-hub-label { font-size: .92rem; font-weight: 800; }

/* ── Main Content ──────────────────────────────────────────────────────── */
.main-content {
  flex: 1;
  background: #0f172a;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
