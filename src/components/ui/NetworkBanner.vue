<template>
  <Transition name="banner-slide">
    <div v-if="!syncState.isOnline || syncState.isSyncing || hasErrors" class="network-banner" :class="bannerClass" role="alert" aria-live="assertive">
      <div class="banner-inner">

        <!-- LEFT: Icon + Status Message -->
        <div class="banner-left">
          <!-- Animated pulse icon -->
          <div class="banner-icon-wrap" :class="iconWrapClass">
            <span class="material-symbols-rounded banner-icon">{{ bannerIcon }}</span>
            <span v-if="!syncState.isOnline" class="icon-ping" />
          </div>

          <div class="banner-text">
            <span class="banner-title">{{ bannerTitle }}</span>
            <span class="banner-sub">{{ bannerSubtitle }}</span>
          </div>
        </div>

        <!-- CENTER: Pending sync count badge -->
        <div v-if="syncState.pendingCount > 0" class="banner-center">
          <div class="queue-badge">
            <span class="material-symbols-rounded" style="font-size:.9rem">cloud_upload</span>
            <span class="queue-count">{{ syncState.pendingCount }}</span>
            <span class="queue-label">Pending {{ syncState.pendingCount === 1 ? 'Sync' : 'Syncs' }}</span>
          </div>

          <!-- Mini progress dots while syncing -->
          <div v-if="syncState.isSyncing" class="sync-dots">
            <span class="dot dot-1" />
            <span class="dot dot-2" />
            <span class="dot dot-3" />
          </div>
        </div>

        <!-- RIGHT: Actions + last sync time -->
        <div class="banner-right">
          <!-- Error count chip -->
          <div v-if="hasErrors" class="error-chip" @click="showErrors = !showErrors">
            <span class="material-symbols-rounded" style="font-size:.85rem">error</span>
            {{ syncState.syncErrors.length }} Failed
          </div>

          <!-- Manual retry button -->
          <button
            v-if="syncState.isOnline && syncState.pendingCount > 0 && !syncState.isSyncing"
            class="retry-btn"
            @click="manualRetry"
          >
            <span class="material-symbols-rounded">refresh</span>
            Retry Now
          </button>

          <!-- Last sync timestamp -->
          <span v-if="syncState.lastSyncAt" class="last-sync">
            Last sync {{ relativeTime(syncState.lastSyncAt) }}
          </span>
        </div>
      </div>

      <!-- Error Detail Panel (expandable) -->
      <Transition name="errors-slide">
        <div v-if="showErrors && hasErrors" class="error-panel">
          <p class="error-panel-title">
            <span class="material-symbols-rounded">warning</span>
            Permanently Failed Payloads ({{ syncState.syncErrors.length }})
          </p>
          <div class="error-list">
            <div v-for="(err, i) in syncState.syncErrors" :key="i" class="error-item">
              <span class="error-url">{{ err.url }}</span>
              <span class="error-msg">{{ err.error }}</span>
              <span class="error-ts">{{ fmtTime(err.timestamp) }}</span>
            </div>
          </div>
          <button class="clear-errors-btn" @click="clearErrors">
            <span class="material-symbols-rounded">delete_sweep</span>
            Clear Error Log
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref } from 'vue'
import { syncState, syncManager } from '@/services/syncManager.js'

const showErrors = ref(false)

const hasErrors = computed(() => syncState.syncErrors.length > 0)

// ─── Banner appearance logic ────────────────────────────────────────────────
const bannerClass = computed(() => {
  if (!syncState.isOnline) return 'banner--offline'
  if (syncState.isSyncing)  return 'banner--syncing'
  if (hasErrors.value)      return 'banner--error'
  return 'banner--online'
})

const iconWrapClass = computed(() => {
  if (!syncState.isOnline) return 'icon-wrap--offline'
  if (syncState.isSyncing)  return 'icon-wrap--syncing'
  if (hasErrors.value)      return 'icon-wrap--error'
  return ''
})

const bannerIcon = computed(() => {
  if (!syncState.isOnline) return 'wifi_off'
  if (syncState.isSyncing)  return 'sync'
  if (hasErrors.value)      return 'sync_problem'
  return 'cloud_done'
})

const bannerTitle = computed(() => {
  if (!syncState.isOnline) return '⚠ SYSTEM OFFLINE'
  if (syncState.isSyncing)  return '↑ SYNCING TO SERVER…'
  if (hasErrors.value)      return '✗ SYNC ERRORS DETECTED'
  return '✓ Connected'
})

const bannerSubtitle = computed(() => {
  if (!syncState.isOnline) {
    return syncState.pendingCount > 0
      ? `Logging data locally. ${syncState.pendingCount} payload${syncState.pendingCount > 1 ? 's' : ''} will auto-sync when connection is restored.`
      : 'Logging data locally. Data will auto-sync when connection is restored.'
  }
  if (syncState.isSyncing) {
    return `Re-transmitting ${syncState.pendingCount} queued payload${syncState.pendingCount !== 1 ? 's' : ''} to server…`
  }
  if (hasErrors.value) {
    return `${syncState.syncErrors.length} payload${syncState.syncErrors.length > 1 ? 's' : ''} failed after max retries. Manual review required.`
  }
  return ''
})

// ─── Actions ────────────────────────────────────────────────────────────────
function manualRetry() {
  syncManager.processQueue()
}

function clearErrors() {
  syncManager.clearErrors()
  showErrors.value = false
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}
</script>

<style scoped>
/* ── Banner Container ────────────────────────────────────────────────────── */
.network-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── State Themes ────────────────────────────────────────────────────────── */
.banner--offline {
  background: linear-gradient(90deg, #7f1d1d, #991b1b, #b91c1c);
  border-bottom: 2px solid #ef4444;
  box-shadow: 0 4px 24px rgba(239, 68, 68, .4);
}
.banner--syncing {
  background: linear-gradient(90deg, #1e3a5f, #1d4ed8, #2563eb);
  border-bottom: 2px solid #3b82f6;
  box-shadow: 0 4px 24px rgba(59, 130, 246, .35);
}
.banner--error {
  background: linear-gradient(90deg, #78350f, #92400e, #b45309);
  border-bottom: 2px solid #f59e0b;
  box-shadow: 0 4px 24px rgba(245, 158, 11, .35);
}
.banner--online {
  background: rgba(5, 150, 105, .9);
  border-bottom: 1px solid #10b981;
}

/* ── Inner Layout ────────────────────────────────────────────────────────── */
.banner-inner {
  display: flex;
  align-items: center;
  padding: .55rem 1.5rem;
  gap: 1.25rem;
}

/* LEFT */
.banner-left {
  display: flex;
  align-items: center;
  gap: .65rem;
  flex-shrink: 0;
}

.banner-icon-wrap {
  position: relative;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.banner-icon {
  font-size: 1.3rem !important;
  color: rgba(255,255,255,.95);
}
.icon-wrap--syncing .banner-icon {
  animation: spin 1.2s linear infinite;
}
.icon-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(239,68,68,.4);
  animation: ping 1.4s cubic-bezier(0,0,.2,1) infinite;
}

.banner-text { display: flex; flex-direction: column; gap: .05rem; }
.banner-title {
  font-size: .78rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.banner-sub {
  font-size: .65rem;
  color: rgba(255,255,255,.75);
  max-width: 420px;
}

/* CENTER */
.banner-center {
  display: flex;
  align-items: center;
  gap: .75rem;
  flex: 1;
  justify-content: center;
}

.queue-badge {
  display: flex;
  align-items: center;
  gap: .35rem;
  background: rgba(0,0,0,.25);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 999px;
  padding: .25rem .85rem;
  color: #fff;
}
.queue-count  { font-size: 1rem; font-weight: 900; font-variant-numeric: tabular-nums; }
.queue-label  { font-size: .65rem; font-weight: 600; opacity: .85; }

/* Animated sync dots */
.sync-dots { display: flex; gap: .3rem; align-items: center; }
.dot {
  width: .4rem; height: .4rem;
  border-radius: 50%;
  background: rgba(255,255,255,.7);
  animation: bounce 1.2s ease infinite;
}
.dot-1 { animation-delay: 0s; }
.dot-2 { animation-delay: .18s; }
.dot-3 { animation-delay: .36s; }

/* RIGHT */
.banner-right {
  display: flex;
  align-items: center;
  gap: .65rem;
  margin-left: auto;
  flex-shrink: 0;
}

.error-chip {
  display: flex; align-items: center; gap: .3rem;
  background: rgba(0,0,0,.3);
  border: 1px solid rgba(255,255,255,.2);
  color: #fbbf24;
  font-size: .7rem; font-weight: 700;
  padding: .25rem .7rem;
  border-radius: .35rem;
  cursor: pointer;
  transition: background .15s ease;
}
.error-chip:hover { background: rgba(0,0,0,.45); }

.retry-btn {
  display: flex; align-items: center; gap: .3rem;
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff;
  font-size: .72rem; font-weight: 700;
  padding: .3rem .8rem;
  border-radius: .4rem;
  cursor: pointer;
  transition: background .15s ease;
}
.retry-btn:hover { background: rgba(255,255,255,.25); }
.retry-btn .material-symbols-rounded { font-size: .95rem !important; }

.last-sync { font-size: .62rem; color: rgba(255,255,255,.55); white-space: nowrap; }

/* ── Error Detail Panel ──────────────────────────────────────────────────── */
.error-panel {
  background: rgba(0,0,0,.4);
  border-top: 1px solid rgba(255,255,255,.12);
  padding: .75rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.error-panel-title {
  display: flex; align-items: center; gap: .4rem;
  font-size: .72rem; font-weight: 800; color: #fbbf24;
  text-transform: uppercase; letter-spacing: .07em;
}
.error-list { display: flex; flex-direction: column; gap: .3rem; max-height: 120px; overflow-y: auto; }
.error-item {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: .65rem;
  align-items: center;
  font-size: .65rem;
  background: rgba(0,0,0,.3);
  padding: .3rem .6rem;
  border-radius: .3rem;
  border: 1px solid rgba(239,68,68,.2);
}
.error-url  { color: #f87171; font-weight: 700; font-family: monospace; }
.error-msg  { color: rgba(255,255,255,.7); }
.error-ts   { color: rgba(255,255,255,.4); text-align: right; white-space: nowrap; }

.clear-errors-btn {
  display: flex; align-items: center; gap: .35rem;
  background: rgba(239,68,68,.2);
  border: 1px solid rgba(239,68,68,.35);
  color: #fca5a5;
  font-size: .7rem; font-weight: 700;
  padding: .3rem .8rem;
  border-radius: .4rem;
  cursor: pointer;
  width: fit-content;
  transition: background .15s ease;
}
.clear-errors-btn:hover { background: rgba(239,68,68,.35); }

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: .5; }
  40%           { transform: translateY(-4px); opacity: 1; }
}

/* ── Transitions ──────────────────────────────────────────────────────────── */
.banner-slide-enter-active { transition: all .3s cubic-bezier(.34,1.56,.64,1); }
.banner-slide-leave-active { transition: all .25s ease; }
.banner-slide-enter-from   { transform: translateY(-100%); opacity: 0; }
.banner-slide-leave-to     { transform: translateY(-100%); opacity: 0; }

.errors-slide-enter-active { transition: all .2s ease; }
.errors-slide-leave-active { transition: all .15s ease; }
.errors-slide-enter-from   { opacity: 0; transform: translateY(-6px); }
.errors-slide-leave-to     { opacity: 0; }
</style>
