<template>
  <!-- Developer: Mintesnot Abebe | Brand: dev MinteIO -->
  <!-- Global error boundary wraps the entire router outlet.
       If any child component throws an unhandled error the operator sees
       a clear recovery screen instead of a blank white crash. -->
  <div id="mes-app">
    <Transition name="crash-fade" mode="out-in">
      <!-- ── Crash Recovery Screen ──────────────────────────────────── -->
      <div v-if="hasCrashed" class="crash-screen" role="alert" aria-live="assertive">
        <div class="crash-card">
          <div class="crash-icon">⚠</div>
          <h1 class="crash-title">Module Error</h1>
          <p class="crash-body">
            A module crashed unexpectedly. Your work is safe — press the button
            below to return to the main hub.
          </p>
          <p class="crash-detail" v-if="crashMessage">{{ crashMessage }}</p>
          <button class="crash-btn" @click="resetToHub">
            <span class="material-symbols-rounded">home</span>
            RETURN TO HUB
          </button>
        </div>
      </div>

      <!-- ── Normal App ─────────────────────────────────────────────── -->
      <router-view v-else />
    </Transition>

    <!-- ── System Down Global Banner ──────────────────────────────── -->
    <Transition name="banner-slide">
      <div v-if="downtimeStore?.activeIssues?.length > 0" class="system-down-banner">
        <span class="material-symbols-rounded animate-pulse">warning</span>
        <span><strong>SYSTEM DOWN:</strong> {{ downtimeStore.activeIssues.length }} Machine(s) currently down</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * App.vue — Root shell with global error boundary.
 *
 * onErrorCaptured intercepts any unhandled error thrown by a child component
 * in the tree (including async setup errors), logs it, and surfaces the
 * crash recovery screen. The operator can then navigate back to the hub
 * without needing to hard-reload the tablet.
 *
 * Returning `false` from onErrorCaptured stops Vue's default console.error
 * propagation; we do our own structured logging instead.
 */

import { ref, onErrorCaptured, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMesStore } from '@/store/mesStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import { useQcStore } from '@/store/qcStore.js'
import { useDowntimeStore } from '@/store/downtimeStore.js'
import { useInventoryStore } from '@/store/inventoryStore.js'
import { syncManager } from '@/services/syncManager.js'

const router      = useRouter()
const hasCrashed  = ref(false)
const crashMessage = ref('')

const downtimeStore = useDowntimeStore()

onMounted(async () => {
  const mesStore      = useMesStore()
  const attStore      = useAttendanceStore()
  const qcStore       = useQcStore()
  const invStore      = useInventoryStore()

  // Determine current production week for scoped fetches
  const week = mesStore.currentProductionWeek

  if (navigator.onLine) {
    // 1. Core operators + ledger
    await mesStore.fetchInitialData()
    // 2. Attendance
    attStore.fetchAttendance()
    // 3. QC defects — if fetchDefects exists after subagent wiring
    if (typeof qcStore.fetchDefects === 'function') qcStore.fetchDefects(week)
    // 4. Raw materials inventory
    if (typeof invStore.fetchMaterials === 'function') invStore.fetchMaterials()
    // 5. Downtime logs
    if (typeof downtimeStore.fetchDowntime === 'function') downtimeStore.fetchDowntime()
    // 6. Process any pending offline queue
    syncManager.processQueue()
  }

  // Init Realtime subscriptions regardless of initial online state
  // (they will auto-connect when Supabase WS is available)
  if (typeof mesStore.initRealtime === 'function') mesStore.initRealtime()
  if (typeof attStore.initRealtime === 'function') attStore.initRealtime()
  if (typeof invStore.initRealtime === 'function') invStore.initRealtime()
  if (typeof downtimeStore.initRealtime === 'function') downtimeStore.initRealtime()
  if (typeof qcStore.initRealtime === 'function') qcStore.initRealtime()
})

// ─── Global Error Boundary ─────────────────────────────────────────────────
onErrorCaptured((err, instance, info) => {
  hasCrashed.value  = true
  crashMessage.value = import.meta.env.DEV
    ? `[${info}] ${err?.message ?? String(err)}`
    : ''  // Never expose stack traces to operators in production

  // Structured log for remote debugging (if Telegram / Sentry wired up)
  console.error(
    '[MES] Unhandled component error captured:',
    '\n  Info:     ', info,
    '\n  Message:  ', err?.message,
    '\n  Stack:    ', err?.stack,
    '\n  Component:', instance?.$options?.name ?? '(anonymous)',
  )

  // Return false → suppress Vue's built-in re-throw so the crash screen
  // renders cleanly instead of cascading into a second crash.
  return false
})

// ─── Recovery action ───────────────────────────────────────────────────────
function resetToHub() {
  hasCrashed.value   = false
  crashMessage.value = ''
  // Replace history entry so the operator can't "back" into the crashed state
  router.replace({ name: 'ModuleSelection' })
}
</script>

<style>
/* ── Minimal global reset — kiosk-safe ─────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Disable all native text selection on tablet — prevents accidental
   long-press text-selection popovers during production operation. */
body, #mes-app {
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: pan-y manipulation;
  background: #0f172a;
}

/* App wrapper */
#mes-app {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
}

@media (max-width: 768px) {
  html, body {
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: auto;
  }
}

/* ── Crash Recovery Screen ─────────────────────────────────────────────── */
.crash-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
}

.crash-card {
  background: #1e293b;
  border: 1px solid rgba(239, 68, 68, .35);
  border-radius: 1.25rem;
  padding: 3rem 3.5rem;
  max-width: 32rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 24px 64px rgba(0,0,0,.6), 0 0 0 1px rgba(239,68,68,.1);
}

.crash-icon {
  font-size: 4rem;
  line-height: 1;
  color: #f87171;
  filter: drop-shadow(0 0 16px rgba(239,68,68,.4));
}

.crash-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: #f1f5f9;
  letter-spacing: .02em;
}

.crash-body {
  font-size: .95rem;
  color: #94a3b8;
  line-height: 1.6;
}

.crash-detail {
  font-family: 'Courier New', monospace;
  font-size: .75rem;
  color: #f87171;
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.2);
  border-radius: .5rem;
  padding: .65rem 1rem;
  width: 100%;
  text-align: left;
  word-break: break-all;
}

/* Reset to Hub button */
.crash-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: .5rem;
  width: 100%;
  justify-content: center;
}
.crash-btn:hover { background: rgba(255, 255, 255, 0.2); }
.crash-btn:active { transform: scale(0.96); }
.crash-btn .material-symbols-rounded { font-size: 1.5rem; }

/* ── System Down Banner ───────────────────────────────────────── */
.system-down-banner {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  padding: 0.75rem 2rem;
  border-radius: 0 0 1rem 1rem;
  box-shadow: 0 10px 25px rgba(220, 38, 38, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-top: none;
  pointer-events: none; /* so it doesn't block clicks */
}
.banner-slide-enter-active, .banner-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.banner-slide-enter-from, .banner-slide-leave-to {
  transform: translate(-50%, -100%);
  opacity: 0;
}

/* ── Crash transition ──────────────────────────────────────────────────── */
.crash-fade-enter-active,
.crash-fade-leave-active { transition: opacity .2s ease; }
.crash-fade-enter-from,
.crash-fade-leave-to     { opacity: 0; }
</style>
