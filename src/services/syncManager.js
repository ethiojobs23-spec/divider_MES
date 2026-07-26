/**
 * syncManager.js — Offline Sync Queue for the Divider MES
 *
 * Architecture:
 *  - Failed POST/PUT/PATCH payloads are serialised to localStorage under
 *    the key 'mes_sync_queue' as a JSON array of QueueItem objects.
 *  - When the browser goes online, processQueue() fires automatically
 *    and re-submits each item SEQUENTIALLY via the native Fetch API.
 *    Sequential (not concurrent) flushing is intentional — it prevents
 *    race conditions in the WordPress REST API and avoids flooding a
 *    factory Wi-Fi AP with a burst of simultaneous requests.
 *  - Each QueueItem carries its full URL, method, headers, and body so
 *    it can be replayed identically without re-involving api.js.
 *  - Reactive state (pendingCount, isOnline, …) is a plain Vue reactive
 *    object — no Pinia dependency so syncManager can be tree-shaken
 *    independently of the full store.
 *
 * Hardening vs original:
 *  - processQueue() is guarded by an AbortController-based timeout (12s)
 *    per item — not just the AbortSignal.timeout shorthand which isn't
 *    available on all Android WebViews shipped with factory tablets.
 *  - isSyncing is reset in a finally block so a crash mid-flush can't
 *    permanently lock out future sync attempts.
 *  - Batch atomicity: the new persistent queue (remaining[]) is written
 *    to localStorage ONLY once, after the entire loop — never per-item.
 *    This prevents a storage write partially completing during a crash
 *    from corrupting the queue.
 *  - Deduplication uses a content hash (method + url + JSON body) rather
 *    than url-only, so two genuinely different payloads to the same
 *    endpoint are both kept.
 *  - 'online' listener is registered with { once: false } (default) and
 *    the handler is debounced with a 1200ms timeout to let the AP
 *    stabilise before hammering the API.
 */

import { reactive } from 'vue'

// ─── Constants ────────────────────────────────────────────────────────────
const STORAGE_KEY   = 'mes_sync_queue'
const RETRY_DELAY   = 1_500     // ms between consecutive queue item retries
const MAX_RETRIES   = 3         // per item — after this it's logged and discarded
const ONLINE_GRACE  = 1_200     // ms to wait after 'online' event before flushing
const REQUEST_TIMEOUT_MS = 12_000

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/wp-json/factory/v1/'

// ─── Public reactive state ────────────────────────────────────────────────
export const syncState = reactive({
  isOnline:     navigator.onLine,
  pendingCount: 0,
  isSyncing:    false,
  lastSyncAt:   null,   // ISO timestamp of most recent successful full flush
  syncErrors:   [],     // [{ id, url, method, error, timestamp }]
})

// ─── Internal: localStorage access ───────────────────────────────────────

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // JSON.parse failure: storage is corrupt — nuke it and start fresh
    console.error('[SyncManager] Queue storage corrupt — resetting')
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

/**
 * Write queue atomically: serialise the entire array in one call.
 * Never write per-item — a mid-loop crash would leave a truncated array.
 */
function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    syncState.pendingCount = queue.length
  } catch (err) {
    // Quota exceeded — keep the in-memory count correct even if storage fails
    console.error('[SyncManager] localStorage write failed (quota?):', err.message)
    syncState.pendingCount = queue.length
  }
}

function refreshCount() {
  syncState.pendingCount = readQueue().length
}

// ─── Internal: item identity ──────────────────────────────────────────────

/**
 * Content-hash for deduplication.
 * Uses method + url + JSON-serialised body (order-stable via sort).
 */
function itemHash(item) {
  const bodyStr = typeof item.data === 'string'
    ? item.data
    : JSON.stringify(item.data, Object.keys(item.data ?? {}).sort())
  return `${item.method.toUpperCase()}|${item.url}|${bodyStr}`
}

// ─── Internal: HTTP send ──────────────────────────────────────────────────

/**
 * Send a single queued item.
 * Uses a manual AbortController timeout for maximum WebView compatibility.
 *
 * @param {Object} item
 * @returns {Promise<void>} resolves on 2xx, rejects otherwise
 */
async function sendItem(item) {
  const url = item.url.startsWith('http')
    ? item.url
    : `${BASE_URL.replace(/\/$/, '')}/${item.url.replace(/^\//, '')}`

  const token = localStorage.getItem('mes_auth_token')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method:  item.method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        Accept:         'application/json',
        Authorization:  token ? `Bearer ${token}` : (item.headers?.Authorization ?? ''),
      },
      body:   JSON.stringify(item.data),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

// ─── Debounce guard for 'online' handler ──────────────────────────────────
let onlineDebounceTimer = null

// ─── Public API ───────────────────────────────────────────────────────────
export const syncManager = {

  /**
   * Enqueue a failed request payload for later retry.
   *
   * @param {{ url: string, method: string, data: Object, headers?: Object }} item
   */
  enqueue(item) {
    const queue = readQueue()

    // Content-hash deduplication — different endpoints or different bodies both allowed
    const hash = itemHash(item)
    if (queue.some((q) => itemHash(q) === hash)) {
      if (import.meta.env.DEV) {
        console.info('[SyncManager] Duplicate payload skipped:', item.url)
      }
      return
    }

    queue.push({
      ...item,
      id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      retryCount:  0,
      enqueuedAt:  new Date().toISOString(),
    })

    // Atomic write of the updated queue
    writeQueue(queue)

    if (import.meta.env.DEV) {
      console.warn(`[SyncManager] Queued (${queue.length} total): ${item.method?.toUpperCase()} ${item.url}`)
    }
  },

  /** Remove a single item by id — used after manual admin resolution */
  dequeue(id) {
    writeQueue(readQueue().filter((item) => item.id !== id))
  },

  /**
   * Sequentially flush all pending items.
   * Writes the new queue ONCE after the entire loop (batch-atomic).
   *
   * Safe to call manually from an admin panel or the network-restored handler.
   */
  async processQueue() {
    if (syncState.isSyncing) {
      if (import.meta.env.DEV) console.info('[SyncManager] Already syncing — skipped')
      return
    }

    const queue = readQueue()
    if (queue.length === 0) {
      if (import.meta.env.DEV) console.info('[SyncManager] Queue empty')
      return
    }

    syncState.isSyncing = true
    if (import.meta.env.DEV) {
      console.info(`[SyncManager] Processing ${queue.length} item(s)…`)
    }

    const remaining = []

    try {
      for (let i = 0; i < queue.length; i++) {
        // Staggered delay between items (skip delay before the very first)
        if (i > 0) await sleep(RETRY_DELAY)

        const item = queue[i]
        try {
          await sendItem(item)
          if (import.meta.env.DEV) {
            console.info(`[SyncManager] ✓ ${item.method?.toUpperCase()} ${item.url}`)
          }
          // SUCCESS — do not push back to remaining
        } catch (err) {
          const updated = { ...item, retryCount: (item.retryCount ?? 0) + 1 }

          if (updated.retryCount >= MAX_RETRIES) {
            // Permanently failed — record to syncErrors, discard from queue
            syncState.syncErrors.push({
              id:        item.id,
              url:       item.url,
              method:    item.method,
              error:     err.message,
              data:      item.data,
              timestamp: new Date().toISOString(),
            })
            console.error(
              `[SyncManager] ✗ Permanently failed (${MAX_RETRIES} retries): ${item.url}`,
              err.message,
            )
          } else {
            // Still has attempts left — keep in queue
            remaining.push(updated)
            console.warn(
              `[SyncManager] Retry ${updated.retryCount}/${MAX_RETRIES}: ${item.url}`,
            )
          }
        }
      }
    } finally {
      // ── Batch-atomic write: happens exactly once, even on thrown error ──
      writeQueue(remaining)
      syncState.isSyncing = false
      syncState.lastSyncAt = new Date().toISOString()
    }

    if (remaining.length === 0) {
      if (import.meta.env.DEV) console.info('[SyncManager] ✅ All items synced')
    } else {
      console.warn(`[SyncManager] ${remaining.length} item(s) still pending`)
    }
  },

  /** Read-only snapshot for admin UI / debugging */
  getQueue() {
    return readQueue()
  },

  /** Admin-only: nuke the entire queue (shows a confirmation in the store) */
  clearQueue() {
    writeQueue([])
    syncState.syncErrors = []
    console.warn('[SyncManager] Queue forcibly cleared')
  },

  clearErrors() {
    syncState.syncErrors = []
  },
}

// ─── Utility ──────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Network event wiring ─────────────────────────────────────────────────

window.addEventListener('online', () => {
  syncState.isOnline = true
  if (import.meta.env.DEV) console.info('[SyncManager] Online — queuing flush')

  // Debounced: cancel any previous timer and set a new one
  clearTimeout(onlineDebounceTimer)
  onlineDebounceTimer = setTimeout(() => {
    syncManager.processQueue()
  }, ONLINE_GRACE)
})

window.addEventListener('offline', () => {
  syncState.isOnline = false
  // Cancel any pending flush — no point hitting the API while offline
  clearTimeout(onlineDebounceTimer)
  console.warn('[SyncManager] Offline — requests will be queued')
})

// ─── Boot-time flush ──────────────────────────────────────────────────────
refreshCount()

if (navigator.onLine) {
  const boot = readQueue()
  if (boot.length > 0) {
    if (import.meta.env.DEV) {
      console.info(`[SyncManager] ${boot.length} leftover item(s) — flushing in 3s`)
    }
    setTimeout(() => syncManager.processQueue(), 3_000)
  }
}
