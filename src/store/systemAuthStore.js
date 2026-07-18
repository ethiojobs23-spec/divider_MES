import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

// Master boot code — override via VITE_MASTER_PIN in .env
const MASTER_PIN = import.meta.env.VITE_MASTER_PIN ?? '8080'

export const useSystemAuthStore = defineStore('systemAuth', () => {
  // ── State ───────────────────────────────────────────────────────────────────
  const isSystemUnlocked = ref(false)

  // ── Actions ─────────────────────────────────────────────────────────────────
  /**
   * Attempt to unlock the system with the provided PIN.
   * @param {string} pin - 4-digit string entered via the numpad.
   * @returns {{ success: boolean, message: string }}
   */
  function unlockSystem(pin) {
    if (String(pin).trim() === String(MASTER_PIN).trim()) {
      isSystemUnlocked.value = true
      return { success: true, message: '' }
    }
    return { success: false, message: 'Invalid authorization code. Access denied.' }
  }

  function lockSystem() {
    isSystemUnlocked.value = false
  }

  return {
    isSystemUnlocked,
    unlockSystem,
    lockSystem,
  }
})
