/**
 * systemAuthStore.js
 *
 * Manages system-level authentication (master boot PIN) and exposes the
 * global context that TabletLayout.vue subscribes to for the status strip:
 *   - isSystemUnlocked (boot gate)
 *   - authorizedManager (who unlocked the system)
 *   - shiftStartedAt   (ISO timestamp when system was unlocked)
 *
 * No user-registration or forgot-password flows exist — this is a kiosk.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Master boot PIN — override via VITE_MASTER_PIN in .env
const MASTER_PIN = import.meta.env.VITE_MASTER_PIN ?? '8080'

export const useSystemAuthStore = defineStore('systemAuth', () => {
  // ── State ────────────────────────────────────────────────────────────────
  const isSystemUnlocked  = ref(false)
  const authorizedManager = ref('')      // name entered at unlock
  const shiftStartedAt    = ref(null)   // ISO string, set on unlock

  // ── Computed ─────────────────────────────────────────────────────────────
  /**
   * Human-readable shift duration since system unlock.
   * TabletLayout sidebar subscribes to this for the status strip.
   */
  const shiftDuration = computed(() => {
    if (!shiftStartedAt.value) return '--:--'
    const elapsed = Math.floor((Date.now() - new Date(shiftStartedAt.value).getTime()) / 1000)
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })

  // ── Actions ──────────────────────────────────────────────────────────────
  /**
   * Attempt to unlock the system.
   * @param {string} pin          - 4-digit string entered via VirtualNumpad
   * @param {string} managerName  - optional label shown in sidebar
   * @returns {{ success: boolean, message: string }}
   */
  function unlockSystem(pin, managerName = 'Manager') {
    if (String(pin).trim() === String(MASTER_PIN).trim()) {
      isSystemUnlocked.value  = true
      authorizedManager.value = String(managerName).trim() || 'Manager'
      shiftStartedAt.value    = new Date().toISOString()
      return { success: true, message: '' }
    }
    return { success: false, message: 'Invalid authorization code. Access denied.' }
  }

  function lockSystem() {
    isSystemUnlocked.value  = false
    authorizedManager.value = ''
    shiftStartedAt.value    = null
  }

  return {
    isSystemUnlocked,
    authorizedManager,
    shiftStartedAt,
    shiftDuration,
    unlockSystem,
    lockSystem,
  }
})
