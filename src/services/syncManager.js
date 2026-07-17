/**
 * syncManager.js — Offline Sync Queue for the Divider MES
 *
 * Architecture:
 *   - Failed POST/PUT/PATCH payloads are stored in localStorage under
 *     the key 'mes_sync_queue' as a JSON array.
 *   - When the browser goes online, processQueue() fires automatically
 *     and re-submits each item sequentially via the native Fetch API
 *     (not axios, to avoid circular import with api.js).
 *   - Each item carries its full URL, method, headers, and JSON data so
 *     it can be replayed identically.
 *   - Reactive state (pendingCount, isOnline, lastSyncAt, syncErrors) is
 *     exposed as a plain reactive object so any Vue component can import
 *     and watch it without a Pinia dependency.
 */

import { reactive } from 'vue'

// ─── Constants ────────────────────────────────────────────────────────────
const STORAGE_KEY   = 'mes_sync_queue'
const RETRY_DELAY   = 1500          // ms between consecutive retry requests
const MAX_RETRIES   = 3             // per item, across separate online events
const BASE_URL      = import.meta.env.VITE_API_BASE_URL ?? '/wp-json/factory/v1/'

// ─── Reactive public state (usable in Vue templates directly) ─────────────
export const syncState = reactive({
  isOnline:     navigator.onLine,
  pendingCount: 0,
  isSyncing:    false,
  lastSyncAt:   null,   // ISO timestamp of the last successful full sync
  syncErrors:   [],     // [{ url, error, timestamp }]
})

// ─── Internal helpers ─────────────────────────────────────────────────────

/** Read the queue safely from localStorage */
function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('[SyncManager] Failed to parse queue from storage:', err)
    return []
  }
}

/** Write the queue back to localStorage and keep syncState.pendingCount in sync */
function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    syncState.pendingCount = queue.length
  } catch (err) {
    // localStorage quota exceeded (very unlikely but handle gracefully)
    console.error('[SyncManager] Failed to persist queue to storage:', err)
  }
}

/** Refresh pendingCount from storage (called on module init) */
function refreshCount() {
  syncState.pendingCount = readQueue().length
}

/**
 * Send a single queued item using the native Fetch API.
 * Returns true on HTTP 2xx, false otherwise.
 */
async function sendItem(item) {
  const url = item.url.startsWith('http')
    ? item.url
    : `${BASE_URL.replace(/\/$/, '')}/${item.url.replace(/^\//, '')}`

  const token = localStorage.getItem('mes_auth_token')

  const response = await fetch(url, {
    method:  item.method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      Authorization:  token ? `Bearer ${token}` : (item.headers?.Authorization ?? ''),
    },
    body: JSON.stringify(item.data),
    // Native fetch has no built-in timeout — use AbortController
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return true
}

// ─── Public API ───────────────────────────────────────────────────────────

export const syncManager = {

  /**
   * Add a failed request payload to the persistent queue.
   *
   * @param {{ url, method, data, headers, enqueuedAt }} item
   */
  enqueue(item) {
    const queue = readQueue()

    // Deduplicate: if an identical URL+data pair is already queued, skip
    const duplicate = queue.some(
      (q) =>
        q.url === item.url &&
        JSON.stringify(q.data) === JSON.stringify(item.data),
    )
    if (duplicate) {
      if (import.meta.env.DEV) {
        console.info('[SyncManager] Skipped duplicate payload for:', item.url)
      }
      return
    }

    const enriched = {
      ...item,
      retryCount:  0,
      enqueuedAt:  item.enqueuedAt ?? new Date().toISOString(),
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }

    queue.push(enriched)
    writeQueue(queue)

    if (import.meta.env.DEV) {
      console.warn(`[SyncManager] Queued (${queue.length} total):`, enriched.url)
    }
  },

  /**
   * Remove a specific item from the queue by its generated id.
   * @param {string} id
   */
  dequeue(id) {
    const queue = readQueue().filter((item) => item.id !== id)
    writeQueue(queue)
  },

  /**
   * Process all pending items sequentially.
   * Called automatically on 'online' event and can be called manually.
   */
  async processQueue() {
    if (syncState.isSyncing) {
      console.info('[SyncManager] processQueue() already running — skipping')
      return
    }

    const queue = readQueue()
    if (queue.length === 0) {
      if (import.meta.env.DEV) console.info('[SyncManager] Queue empty — nothing to sync')
      return
    }

    syncState.isSyncing = true
    console.info(`[SyncManager] Processing ${queue.length} queued item(s)…`)

    // Work on a local copy; we'll rebuild the new persistent queue from failures
    const remaining = []

    for (const item of queue) {
      // Add staggered delay to avoid hammering the server
      if (remaining.length > 0 || queue.indexOf(item) > 0) {
        await sleep(RETRY_DELAY)
      }

      try {
        await sendItem(item)
        console.info(`[SyncManager] ✓ Synced: ${item.method.toUpperCase()} ${item.url}`)
        // Success — do NOT push back to remaining
      } catch (err) {
        const updatedItem = { ...item, retryCount: (item.retryCount ?? 0) + 1 }

        if (updatedItem.retryCount >= MAX_RETRIES) {
          // Permanently failed — log to syncErrors and discard
          syncState.syncErrors.push({
            url:       item.url,
            error:     err.message,
            data:      item.data,
            timestamp: new Date().toISOString(),
          })
          console.error(
            `[SyncManager] ✗ Permanently failed after ${MAX_RETRIES} retries:`,
            item.url, err.message,
          )
        } else {
          // Still has retries left — keep in queue
          remaining.push(updatedItem)
          console.warn(
            `[SyncManager] Retry ${updatedItem.retryCount}/${MAX_RETRIES} queued:`,
            item.url,
          )
        }
      }
    }

    writeQueue(remaining)

    syncState.isSyncing = false
    syncState.lastSyncAt = new Date().toISOString()

    if (remaining.length === 0) {
      console.info('[SyncManager] ✅ All items synced successfully')
    } else {
      console.warn(`[SyncManager] ${remaining.length} item(s) still pending`)
    }
  },

  /**
   * Return a read-only snapshot of the current queue (for debugging/UI).
   * @returns {Array}
   */
  getQueue() {
    return readQueue()
  },

  /**
   * Clear the entire queue (use with care — only for admin reset).
   */
  clearQueue() {
    writeQueue([])
    syncState.syncErrors = []
    console.warn('[SyncManager] Queue forcibly cleared by admin')
  },

  /**
   * Clear persisted sync errors log.
   */
  clearErrors() {
    syncState.syncErrors = []
  },
}

// ─── Utility ──────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Wire to browser network events ──────────────────────────────────────
window.addEventListener('online', () => {
  syncState.isOnline = true
  console.info('[SyncManager] Network restored — starting queue processing')
  // Small delay to let the connection stabilise before hammering the API
  setTimeout(() => syncManager.processQueue(), 800)
})

window.addEventListener('offline', () => {
  syncState.isOnline = false
  console.warn('[SyncManager] Network lost — requests will be queued')
})

// ─── Initialise ───────────────────────────────────────────────────────────
refreshCount()

// If we boot up already online and there are items left from a previous session,
// process them after a short startup grace period.
if (navigator.onLine) {
  const startupQueue = readQueue()
  if (startupQueue.length > 0) {
    console.info(
      `[SyncManager] Found ${startupQueue.length} leftover item(s) from previous session — syncing in 3s`,
    )
    setTimeout(() => syncManager.processQueue(), 3_000)
  }
}
