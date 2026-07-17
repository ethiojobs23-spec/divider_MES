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

      <!-- Live Clock -->
      <div class="clock-block">
        <p class="clock-time">{{ currentTime }}</p>
        <p class="clock-date">{{ currentDate }}</p>
        <p class="clock-week">{{ store.currentProductionWeek }}</p>
      </div>

      <!-- Active Operator Badge -->
      <div v-if="store.activeOperator" class="operator-badge">
        <div class="op-avatar" :class="store.activeOperator.color">
          {{ store.activeOperator.avatar }}
        </div>
        <div class="op-info">
          <p class="op-name">{{ store.activeOperator.name }}</p>
          <p class="op-role">{{ store.activeOperator.role }}</p>
        </div>
      </div>
      <div v-else class="operator-badge-empty">
        <span>No Operator Active</span>
      </div>

      <!-- Navigation -->
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
        </router-link>

        <!-- Login always at bottom -->
        <router-link
          to="/login"
          class="nav-item nav-item--login"
          active-class="nav-item--active"
        >
          <span class="nav-icon material-symbols-rounded">person</span>
          <span class="nav-label">Operators</span>
        </router-link>
      </nav>
    </aside>

    <!-- ─── Main Content ──────────────────────────────────────────── -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { routes } from '@/router/index.js'
import { useMesStore } from '@/store/mesStore.js'
import NetworkBanner from '@/components/ui/NetworkBanner.vue'

const store = useMesStore()

// ─── Live Clock ────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockInterval

const pad = (n) => String(n).padStart(2, '0')

const currentTime = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const currentDate = computed(() => {
  return now.value.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
})

onMounted(() => {
  clockInterval = setInterval(() => { now.value = new Date() }, 1000)
})
onUnmounted(() => clearInterval(clockInterval))

// ─── Nav Routes ────────────────────────────────────────────────────────────
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
  gap: 1rem;
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
}
.nav-item {
  display: flex;
  align-items: center;
  gap: .65rem;
  padding: .75rem .85rem;
  border-radius: .6rem;
  color: #64748b;
  text-decoration: none;
  font-size: .82rem;
  font-weight: 600;
  transition: all .15s ease;
  cursor: pointer;
}
.nav-item:hover { background: rgba(255,255,255,.06); color: #cbd5e1; }
.nav-item--active { background: rgba(99,102,241,.2); color: #a5b4fc; }
.nav-item--login { margin-top: auto; border-top: 1px solid rgba(255,255,255,.06); padding-top: .85rem; }
.nav-icon { font-size: 1.25rem; }
.nav-label { font-size: .82rem; }

/* ── Main Content ──────────────────────────────────────────────────────── */
.main-content {
  flex: 1;
  background: #0f172a;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
