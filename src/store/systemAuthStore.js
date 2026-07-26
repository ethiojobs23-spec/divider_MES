/**
 * systemAuthStore.js
 *
 * Manages system-level authentication (master boot PIN & Employee PIN) and exposes the
 * global context.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMesStore } from './mesStore'

// Master boot PIN — override via VITE_MASTER_PIN in .env
const MASTER_PIN = import.meta.env.VITE_MASTER_PIN ?? '8080'

export const useSystemAuthStore = defineStore('systemAuth', () => {
  // ── State ────────────────────────────────────────────────────────────────
  const isSystemUnlocked  = ref(false)
  const currentRole       = ref(null)    // 'admin' | 'employee'
  const currentEmployeeId = ref(null)    // numeric ID if role === 'employee'
  const authorizedManager = ref('')      // name entered at unlock
  const shiftStartedAt    = ref(null)    // ISO string, set on unlock

  // ── Computed ─────────────────────────────────────────────────────────────
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
   * @param {string} mode         - 'admin' or 'employee'
   * @returns {{ success: boolean, message: string }}
   */
  function unlockSystem(pin, mode = 'admin') {
    if (mode === 'admin') {
      if (String(pin).trim() === String(MASTER_PIN).trim()) {
        isSystemUnlocked.value  = true
        currentRole.value       = 'admin'
        currentEmployeeId.value = null
        authorizedManager.value = 'Manager'
        shiftStartedAt.value    = new Date().toISOString()
        return { success: true, message: '' }
      }
      return { success: false, message: 'Invalid manager PIN. Access denied.' }
    } else {
      // Employee Mode
      // Mock logic: PIN is '11' + employeeId (e.g. employee 1 -> '1101', but since ids might be '1', let's just use a hardcoded mock map or dynamic)
      // Let's create a deterministic mock PIN for any operator: PIN = '00' + ID padded to 2 digits.
      // E.g., Operator 1 -> '0001'.
      const mesStore = useMesStore()
      
      // Let's assume all operators have a PIN '0000' + their ID. Or just match by ID to find.
      // To make it simple and testable: Operator ID 1 -> '1111', 2 -> '2222', 3 -> '3333'
      const mockPins = {
        '1111': 1, // e.g. Zelalem
        '2222': 2, // e.g. Aben
        '3333': 3, // e.g. Teme
        '4444': 4,
        '5555': 5,
        '6666': 6,
      }

      const empId = mockPins[String(pin).trim()]
      
      if (empId !== undefined) {
        const emp = mesStore.operators.find(o => o.id === empId)
        isSystemUnlocked.value  = true
        currentRole.value       = 'employee'
        currentEmployeeId.value = empId
        authorizedManager.value = emp ? emp.name : `Employee ${empId}`
        shiftStartedAt.value    = new Date().toISOString()
        return { success: true, message: '' }
      }
      return { success: false, message: 'Invalid employee PIN. Access denied.' }
    }
  }

  function lockSystem() {
    isSystemUnlocked.value  = false
    currentRole.value       = null
    currentEmployeeId.value = null
    authorizedManager.value = ''
    shiftStartedAt.value    = null
  }

  return {
    isSystemUnlocked,
    currentRole,
    currentEmployeeId,
    authorizedManager,
    shiftStartedAt,
    shiftDuration,
    unlockSystem,
    lockSystem,
  }
})
