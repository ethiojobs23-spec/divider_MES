// Developer: Mintesnot Abebe | Brand: dev MinteIO
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
  const isMobileMenuOpen  = ref(false)   // Global mobile drawer state

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
      
      // Verify role (allow admin, System Admin, manager, and Supervisor)
      if (mode === 'admin' && !['admin', 'System Admin', 'manager', 'Supervisor'].includes(operator.role)) {
        return { success: false, message: 'Admin or Supervisor privileges required.' }
      }
      
      isSystemUnlocked.value  = true
      currentRole.value       = operator.role // Keep exact role
      currentEmployeeId.value = operator.id
      authorizedManager.value = operator.name
      shiftStartedAt.value    = new Date().toISOString()
      
      return { success: true, message: '' }
      
    } catch (err) {
      console.error('[Auth Error]', err)
      return { success: false, message: 'Connection error. Check network.' }
    }
  }

  async function verifyPin(pin, mode = 'admin') {
    try {
      const { data: operator, error } = await supabase
        .from('mes_operators')
        .select('*')
        .eq('pin_code', String(pin).trim())
        .single()

      if (error || !operator) {
        return { success: false, message: 'Invalid PIN. Access denied.' }
      }
      
      if (mode === 'admin' && !['admin', 'System Admin', 'manager', 'Supervisor'].includes(operator.role)) {
        return { success: false, message: 'Admin or Supervisor privileges required.' }
      }
      
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
    isMobileMenuOpen,
    unlockSystem,
    verifyPin,
    grantAdminAccess,
    lockSystem,
  }
}, {
  persist: {
    key: 'divider-system-auth',
    pick: ['isSystemUnlocked', 'currentRole', 'currentEmployeeId', 'authorizedManager', 'shiftStartedAt', 'hasAdminAccess']
  }
})
