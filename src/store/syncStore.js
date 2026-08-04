import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useSyncStore = defineStore('syncStore', () => {
  const pendingQueue = ref([])
  const isSyncing = ref(false)

  // Add an operation to the offline queue
  function enqueue(operation) {
    pendingQueue.value.push({
      ...operation,
      _queuedAt: Date.now(),
      _id: crypto.randomUUID()
    })
    processQueue()
  }

  async function processQueue() {
    if (isSyncing.value || pendingQueue.value.length === 0) return
    if (!navigator.onLine) return

    isSyncing.value = true

    while (pendingQueue.value.length > 0) {
      if (!navigator.onLine) break
      const op = pendingQueue.value[0]
      try {
        let error = null
        if (op.action === 'insert') {
          const { error: err } = await supabase.from(op.table).insert(op.payload)
          error = err
        } else if (op.action === 'update') {
          const { error: err } = await supabase
            .from(op.table)
            .update(op.payload)
            .match(op.match)
          error = err
        }

        if (error) {
          console.error('[SyncStore] Error processing operation:', error)
          // If it's a fatal schema error, we might want to discard it.
          // For now, if it's network, we break.
          if (error.message && error.message.toLowerCase().includes('fetch')) {
             break // Network error
          } else {
             // Hard error (e.g. invalid column). Drop it to prevent poison pill blocking the queue.
             pendingQueue.value.shift()
          }
        } else {
          // Success
          pendingQueue.value.shift()
        }
      } catch (e) {
        console.error('[SyncStore] Exception in sync:', e)
        break // Assume network drop
      }
    }

    isSyncing.value = false
  }

  // Hook into browser online events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', processQueue)
  }

  return { pendingQueue, isSyncing, enqueue, processQueue }
}, {
  persist: {
    key: 'divider-sync-queue'
  }
})
