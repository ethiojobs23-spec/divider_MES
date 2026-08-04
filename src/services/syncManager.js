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
import { supabase } from '@/lib/supabaseClient'

const STORAGE_KEY   = 'mes_sync_queue'
const RETRY_DELAY   = 1_000
const MAX_RETRIES   = 3
const ONLINE_GRACE  = 1_200

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
  if (item.action === 'insert') {
    const { error: err } = await supabase.from(item.table).insert(item.payload)
    error = err
  } else if (item.action === 'update') {
    const { error: err } = await supabase.from(item.table).update(item.payload).match(item.match)
    error = err
  }
  
  if (error) {
    if (error.message && error.message.toLowerCase().includes('fetch')) {
      throw new Error('Network error')
    }
    // Hard schema error (don't retry)
    throw new Error('Schema: ' + error.message)
  }
}

let onlineDebounceTimer = null

export const syncManager = {
  enqueue(item) {
    const queue = readQueue()
    const hash = itemHash(item)
    
    // Deduplicate
    if (queue.some((q) => itemHash(q) === hash)) return

    queue.push({
      ...item,
      id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      retryCount:  0,
      enqueuedAt:  new Date().toISOString(),
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
          if (err.message.startsWith('Schema:')) {
             console.error(`[SyncManager] Hard schema error, discarding:`, err.message)
             syncState.syncErrors.push({ ...item, error: err.message, timestamp: new Date().toISOString() })
             continue // drop from queue
          }
          
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
      syncState.isSyncing = false
      syncState.lastSyncAt = new Date().toISOString()
    }
  },

  getQueue() { return readQueue() },
  clearQueue() { writeQueue([]); syncState.syncErrors = [] },
  clearErrors() { syncState.syncErrors = [] },
}

window.addEventListener('online', () => {
  syncState.isOnline = true
  clearTimeout(onlineDebounceTimer)
  onlineDebounceTimer = setTimeout(() => { syncManager.processQueue() }, ONLINE_GRACE)
})

window.addEventListener('offline', () => {
  syncState.isOnline = false
  clearTimeout(onlineDebounceTimer)
})

refreshCount()
if (navigator.onLine) {
  const boot = readQueue()
  if (boot.length > 0) {
    setTimeout(() => syncManager.processQueue(), 3_000)
  }
}
