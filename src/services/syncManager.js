/**
 * syncManager.js — Offline Sync Queue for the Divider MES
 *
 * Architecture:
 *  - Failed POST/PUT/PATCH payloads are serialised to localStorage under
 *    the key 'mes_sync_queue' as a JSON array of QueueItem objects.
 *  - When the browser goes online, processQueue() fires automatically
 *    and re-submits each item SEQUENTIALLY via supabase-js.
 *    Sequential flushing prevents race conditions and avoids flooding
 *    factory Wi-Fi with bursts of simultaneous requests.
 *  - Each QueueItem carries its full table, action, and payload so
 *    it can be replayed identically without re-involving stores.
 *  - Reactive state (pendingCount, isOnline, …) is a plain Vue reactive
 *    object — no Pinia dependency so syncManager can be tree-shaken
 *    independently of the full store.
 *
 * Hardening improvements:
 *  - Conflict detection: HTTP 409 / Postgres error 23505 are discarded
 *    immediately without retry (duplicate key violations).
 *  - Periodic sync: setInterval every 30s to flush any stuck queue.
 *  - Visibility change: triggers processQueue() on tablet wake-from-sleep.
 *  - syncAll() helper for programmatic full-flush from App.vue on mount.
 *  - getStats() for NetworkBanner reactive display.
 */

import { reactive } from 'vue'
import { supabase } from '@/lib/supabaseClient'

const STORAGE_KEY  = 'mes_sync_queue'
const RETRY_DELAY  = 1_000
const MAX_RETRIES  = 3
const ONLINE_GRACE = 1_200

export const syncState = reactive({
  isOnline:     navigator.onLine,
  pendingCount: 0,
  isSyncing:    false,
  lastSyncAt:   null,
  syncErrors:   [],
})

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.error('[SyncManager] Queue storage corrupt — resetting')
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    syncState.pendingCount = queue.length
  } catch (err) {
    console.error('[SyncManager] localStorage write failed:', err.message)
    syncState.pendingCount = queue.length
  }
}

function refreshCount() {
  syncState.pendingCount = readQueue().length
}

function itemHash(item) {
  const bodyStr = typeof item.payload === 'string'
    ? item.payload
    : JSON.stringify(item.payload, Object.keys(item.payload ?? {}).sort())
  return `${item.action}|${item.table}|${bodyStr}`
}

async function sendItem(item) {
  let error = null
  let status = null
  if (item.action === 'insert') {
    const res = await supabase.from(item.table).insert(item.payload)
    error  = res.error
    status = res.status
  } else if (item.action === 'update') {
    const res = await supabase.from(item.table).update(item.payload).match(item.match)
    error  = res.error
    status = res.status
  }

  if (error) {
    // Conflict / duplicate key — discard silently, no retry
    if (status === 409 || error.code === '23505' || error.message?.toLowerCase().includes('conflict')) {
      throw new Error('Conflict: ' + error.message)
    }
    // Network failure — retry
    if (error.message && error.message.toLowerCase().includes('fetch')) {
      throw new Error('Network error')
    }
    // Hard schema error — discard with logging
    throw new Error('Schema: ' + error.message)
  }
}

let onlineDebounceTimer = null

export const syncManager = {
  enqueue(item) {
    const queue = readQueue()
    const hash  = itemHash(item)

    // Deduplicate identical payloads
    if (queue.some((q) => itemHash(q) === hash)) return

    queue.push({
      ...item,
      id:         `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      retryCount: 0,
      enqueuedAt: new Date().toISOString(),
    })
    writeQueue(queue)
  },

  dequeue(id) {
    writeQueue(readQueue().filter((item) => item.id !== id))
  },

  async processQueue() {
    if (syncState.isSyncing) return
    const queue = readQueue()
    if (queue.length === 0) return

    syncState.isSyncing = true
    const remaining = []

    try {
      for (let i = 0; i < queue.length; i++) {
        if (!navigator.onLine) {
          remaining.push(...queue.slice(i))
          break
        }
        if (i > 0) await new Promise(r => setTimeout(r, RETRY_DELAY))
        const item = queue[i]

        try {
          await sendItem(item)
        } catch (err) {
          if (err.message.startsWith('Conflict:')) {
            console.warn(`[SyncManager] Conflict — discarding:`, err.message)
            continue // drop duplicate, don't retry
          }
          if (err.message.startsWith('Schema:')) {
            console.error(`[SyncManager] Schema error — discarding:`, err.message)
            syncState.syncErrors.push({ ...item, error: err.message, timestamp: new Date().toISOString() })
            continue // drop bad payload
          }

          // Network / transient error — retry up to MAX_RETRIES
          const updated = { ...item, retryCount: (item.retryCount ?? 0) + 1 }
          if (updated.retryCount >= MAX_RETRIES) {
            syncState.syncErrors.push({ ...updated, error: err.message, timestamp: new Date().toISOString() })
          } else {
            remaining.push(updated)
          }
        }
      }
    } finally {
      writeQueue(remaining)
      syncState.isSyncing  = false
      syncState.lastSyncAt = new Date().toISOString()
    }
  },

  getQueue()    { return readQueue() },
  clearQueue()  { writeQueue([]); syncState.syncErrors = [] },
  clearErrors() { syncState.syncErrors = [] },

  /** Full flush — call from App.vue onMounted */
  async syncAll() {
    await this.processQueue()
    return {
      success:      syncState.pendingCount === 0,
      pendingCount: syncState.pendingCount,
      errors:       syncState.syncErrors.length,
    }
  },

  /** For NetworkBanner or debug panels */
  getStats() {
    return {
      queueLength: syncState.pendingCount,
      errorCount:  syncState.syncErrors.length,
      isOnline:    syncState.isOnline,
      isSyncing:   syncState.isSyncing,
      lastSyncAt:  syncState.lastSyncAt,
    }
  },
}

// ── Lifecycle event listeners ────────────────────────────────────────────────

window.addEventListener('online', () => {
  syncState.isOnline = true
  clearTimeout(onlineDebounceTimer)
  onlineDebounceTimer = setTimeout(() => { syncManager.processQueue() }, ONLINE_GRACE)
})

window.addEventListener('offline', () => {
  syncState.isOnline = false
  clearTimeout(onlineDebounceTimer)
})

// Tablet wake-from-sleep: flush when page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    syncManager.processQueue()
  }
})

// Periodic safety net: flush every 30 seconds while online
setInterval(() => {
  if (navigator.onLine && !syncState.isSyncing) {
    syncManager.processQueue()
  }
}, 30_000)

refreshCount()
if (navigator.onLine) {
  const boot = readQueue()
  if (boot.length > 0) {
    setTimeout(() => syncManager.processQueue(), 3_000)
  }
}
