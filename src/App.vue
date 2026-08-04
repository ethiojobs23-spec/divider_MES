<template>
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

const router      = useRouter()
const hasCrashed  = ref(false)
const crashMessage = ref('')

onMounted(() => {
  const mesStore = useMesStore()
  const attStore = useAttendanceStore()
  if (navigator.onLine) {
    mesStore.fetchInitialData()
    attStore.fetchAttendance()
  }
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
  overscroll-behavior: none;   /* kills pull-to-refresh on Android tablets */
  touch-action: manipulation;  /* suppresses 300ms tap delay on iOS / Android */
  background: #0f172a;
}

/* Prevent native OS keyboard from appearing on any number input —
   all numeric entry MUST go through VirtualNumpad.
   This is a defensive backstop; views should not render <input type="number"> at all. */
input[type="number"],
input[type="tel"] {
  caret-color: transparent;
  pointer-events: none;
}

/* App wrapper */
#mes-app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
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

.crash-btn {
  margin-top: .5rem;
  width: 100%;
  height: 4.5rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  border-radius: .85rem;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: .1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .65rem;
  transition: filter .13s ease, transform .08s ease;
}
.crash-btn:hover  { filter: brightness(1.12); }
.crash-btn:active { transform: scale(.97); }
.crash-btn .material-symbols-rounded { font-size: 1.5rem; }

/* ── Crash transition ──────────────────────────────────────────────────── */
.crash-fade-enter-active,
.crash-fade-leave-active { transition: opacity .2s ease; }
.crash-fade-enter-from,
.crash-fade-leave-to     { opacity: 0; }
</style>
