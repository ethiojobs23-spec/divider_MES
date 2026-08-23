// Developer: Mintesnot Abebe | Brand: dev MinteIO
/**
 * qcStore.js — Quality Control Defect Logging
 * Fully wired to Supabase with optimistic UI, offline sync, and Realtime subscriptions.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { syncManager } from '@/services/syncManager'
import { useMesStore } from './mesStore'
import { useDowntimeStore } from './downtimeStore'

export const useQcStore = defineStore('qcStore', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const defect_logs = ref([])

  const categories = [
    'Bent Edge',
    'Wrong Size',
    'Material Flaw'
  ]
  const dividerTypes = ['9cm', '7cm']

  // ── Fetch from Supabase ────────────────────────────────────────────────
  async function fetchDefects(week) {
    try {
      const { data, error } = await supabase
        .from('mes_qc_defects')
        .select('*')
        .eq('production_week', week)
        .order('logged_at', { ascending: false })

      if (error) throw error
      if (data) {
        defect_logs.value = data.map(row => ({
          id:           row.id,
          timestamp:    row.logged_at,
          operator_id:  row.operator_id,
          machine_id:   row.machine_id,
          divider_type: row.divider_type,
          category:     row.category,
          quantity:     Number(row.quantity),
          production_week: row.production_week,
        }))
      }
    } catch (err) {
      console.error('[QcStore] fetchDefects failed:', err)
    }
  }

  // ── Log Defect ────────────────────────────────────────────────────────
  async function logDefect(payload) {
    if (!payload.quantity || Number(payload.quantity) <= 0) return

    const mesStore = useMesStore()
    const tempId   = `temp-${Date.now()}`
    const now      = new Date().toISOString()

    // Optimistic push
    const local = {
      id:           tempId,
      timestamp:    now,
      operator_id:  payload.operator_id,
      machine_id:   payload.machine_id,
      divider_type: payload.divider_type,
      category:     payload.category,
      quantity:     Number(payload.quantity),
      production_week: mesStore.currentProductionWeek,
    }
    defect_logs.value.unshift(local)

    const dbPayload = {
      operator_id:     payload.operator_id,
      machine_id:      payload.machine_id,
      divider_type:    payload.divider_type,
      category:        payload.category,
      quantity:        Number(payload.quantity),
      production_week: mesStore.currentProductionWeek,
      logged_at:       now,
    }

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('mes_qc_defects')
          .insert(dbPayload)
          .select()
          .single()

        if (error) throw error
        // Replace temp entry with real DB id
        const idx = defect_logs.value.findIndex(l => l.id === tempId)
        if (idx !== -1) defect_logs.value[idx].id = data.id
      } catch (err) {
        console.error('[QcStore] logDefect Supabase insert failed:', err)
        syncManager.enqueue({ action: 'insert', table: 'mes_qc_defects', payload: dbPayload })
      }
    } else {
      syncManager.enqueue({ action: 'insert', table: 'mes_qc_defects', payload: dbPayload })
    }
  }

  // ── Realtime Subscription ──────────────────────────────────────────────
  let realtimeChannel = null

  function initRealtime() {
    if (realtimeChannel) return // already subscribed

    realtimeChannel = supabase
      .channel('mes_qc_defects_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_qc_defects' },
        (payload) => {
          const row = payload.new
          // Avoid duplicate if we inserted locally already
          if (defect_logs.value.some(l => l.id === row.id)) return
          defect_logs.value.unshift({
            id:           row.id,
            timestamp:    row.logged_at,
            operator_id:  row.operator_id,
            machine_id:   row.machine_id,
            divider_type: row.divider_type,
            category:     row.category,
            quantity:     Number(row.quantity),
            production_week: row.production_week,
          })
        }
      )
      .subscribe()
  }

  // ── Getters ────────────────────────────────────────────────────────────
  const operatorDefectRates = computed(() => {
    const mesStore = useMesStore()
    if (!mesStore.operators || mesStore.operators.length === 0) return []

    return mesStore.operators.map(op => {
      const logs = defect_logs.value.filter(l => l.operator_id === op.id)
      const totalDefects = logs.reduce((sum, l) => sum + l.quantity, 0)
      return {
        operator_id:       op.id,
        operator_name:     op.name,
        avatar:            op.avatar,
        color:             op.color,
        total_defects:     totalDefects,
        training_required: totalDefects > 50,
      }
    }).sort((a, b) => b.total_defects - a.total_defects)
  })

  const machineDefectRates = computed(() => {
    const downtimeStore = useDowntimeStore()
    if (!downtimeStore.machines || downtimeStore.machines.length === 0) return []

    return downtimeStore.machines.map(m => {
      const logs = defect_logs.value.filter(l => l.machine_id === m.id)
      const totalDefects  = logs.reduce((sum, l) => sum + l.quantity, 0)
      const bentEdgeCount = logs
        .filter(l => l.category === 'Bent Edge')
        .reduce((sum, l) => sum + l.quantity, 0)

      return {
        machine_id:         m.id,
        machine_name:       m.name,
        total_defects:      totalDefects,
        bent_edge_count:    bentEdgeCount,
        calibration_needed: bentEdgeCount > 100,
      }
    }).sort((a, b) => b.total_defects - a.total_defects)
  })

  return {
    defect_logs,
    categories,
    dividerTypes,
    fetchDefects,
    logDefect,
    initRealtime,
    operatorDefectRates,
    machineDefectRates,
  }
}, {
  persist: {
    key:  'divider-qc-logs',
    pick: ['defect_logs'],
  },
})
