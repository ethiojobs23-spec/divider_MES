/**
 * systemAuthStore.js
 *
 * Manages system-level authentication (Admin PIN & Employee PIN) by querying
 * the Supabase `mes_operators` table, and exposes the global context.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useSystemAuthStore = defineStore('systemAuth', () => {
  // ── State ────────────────────────────────────────────────────────────────
  const isSystemUnlocked  = ref(false)
  const currentRole       = ref(null)    // 'admin' | 'employee'
  const currentEmployeeId = ref(null)    // numeric ID if role === 'employee'
  const authorizedManager = ref('')      // name entered at unlock
  const shiftStartedAt    = ref(null)    // ISO string, set on unlock

  const hasAdminAccess    = ref(false)   // granted after secondary PinAuth

  // ── Computed ─────────────────────────────────────────────────────────────
  const shiftDuration = computed(() => {
    if (!shiftStartedAt.value) return '--:--'
    const elapsed = Math.floor((Date.now() - new Date(shiftStartedAt.value).getTime()) / 1000)
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })

  // ── Actions ──────────────────────────────────────────────────────────────
  async function unlockSystem(pin, mode = 'admin') {
    try {
      const { data: operator, error } = await supabase
        .from('mes_operators')
        .select('*')
        .eq('pin_code', String(pin).trim())
        .single()

      if (error || !operator) {
        return { success: false, message: 'Invalid PIN. Access denied.' }
      }
      
      // Verify role (allow both admin and System Admin)
      if (mode === 'admin' && operator.role !== 'admin' && operator.role !== 'System Admin') {
        return { success: false, message: 'Admin privileges required.' }
      }
      
      isSystemUnlocked.value  = true
      currentRole.value       = mode
      currentEmployeeId.value = operator.id
      authorizedManager.value = operator.name
      shiftStartedAt.value    = new Date().toISOString()
      
      return { success: true, message: '' }
      
    } catch (err) {
      console.error('[Auth Error]', err)
      return { success: false, message: 'Connection error. Check network.' }
    }
  }

  function grantAdminAccess() {
    hasAdminAccess.value = true
  }

  function lockSystem() {
    isSystemUnlocked.value  = false
    currentRole.value       = null
    currentEmployeeId.value = null
    authorizedManager.value = ''
    shiftStartedAt.value    = null
    hasAdminAccess.value    = false
  }

  return {
    isSystemUnlocked,
    currentRole,
    currentEmployeeId,
    authorizedManager,
    shiftStartedAt,
    hasAdminAccess,
    shiftDuration,
    unlockSystem,
    grantAdminAccess,
    lockSystem,
  }
})
