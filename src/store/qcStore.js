import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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

  // ── Actions ────────────────────────────────────────────────────────────
  function logDefect(payload) {
    if (!payload.quantity || Number(payload.quantity) <= 0) return

    defect_logs.value.push({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      operator_id: payload.operator_id,
      machine_id: payload.machine_id,
      divider_type: payload.divider_type,
      category: payload.category,
      quantity: Number(payload.quantity)
    })
  }

  // ── Getters ────────────────────────────────────────────────────────────
  const operatorDefectRates = computed(() => {
    const mesStore = useMesStore()
    const rates = []
    
    // Safety check: ensure operators exist
    if (!mesStore.operators || mesStore.operators.length === 0) return []

    mesStore.operators.forEach(op => {
      const logs = defect_logs.value.filter(l => l.operator_id === op.id)
      const totalDefects = logs.reduce((sum, l) => sum + l.quantity, 0)
      
      rates.push({
        operator_id: op.id,
        operator_name: op.name,
        avatar: op.avatar,
        color: op.color,
        total_defects: totalDefects,
        // Flag for training if defects exceed threshold
        training_required: totalDefects > 50 
      })
    })
    
    return rates.sort((a, b) => b.total_defects - a.total_defects)
  })

  const machineDefectRates = computed(() => {
    const downtimeStore = useDowntimeStore()
    const rates = []
    
    if (!downtimeStore.machines || downtimeStore.machines.length === 0) return []

    downtimeStore.machines.forEach(m => {
      const logs = defect_logs.value.filter(l => l.machine_id === m.id)
      const totalDefects = logs.reduce((sum, l) => sum + l.quantity, 0)
      
      // Specifically track "Bent Edge" for machine calibration alerts
      const bentEdgeCount = logs
        .filter(l => l.category === 'Bent Edge')
        .reduce((sum, l) => sum + l.quantity, 0)
      
      rates.push({
        machine_id: m.id,
        machine_name: m.name,
        total_defects: totalDefects,
        bent_edge_count: bentEdgeCount,
        // Flag for calibration if too many bent edges
        calibration_needed: bentEdgeCount > 100 
      })
    })
    
    return rates.sort((a, b) => b.total_defects - a.total_defects)
  })

  return {
    defect_logs,
    categories,
    dividerTypes,
    logDefect,
    operatorDefectRates,
    machineDefectRates
  }
}, {
  persist: {
    key: 'divider-qc-logs',
    pick: ['defect_logs'],
  },
})
