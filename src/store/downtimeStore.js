import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDowntimeStore = defineStore('downtimeStore', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const machines = ref([
    { id: 1, name: '9cm Press Machine Alpha', hourly_capacity: 1500 },
    { id: 2, name: '9cm Press Machine Beta', hourly_capacity: 1500 },
    { id: 3, name: '7cm Press Machine Gamma', hourly_capacity: 1200 },
    { id: 4, name: 'Raw Material Cutter', hourly_capacity: 3000 }
  ])

  const downtime_logs = ref([])
  
  const categories = [
    'Mechanical Failure', 
    'Power Outage', 
    'Routine Maintenance'
  ]

  // ── Actions ────────────────────────────────────────────────────────────
  function reportDowntime(machineId, category) {
    downtime_logs.value.push({
      id: Date.now().toString(), // unique id
      machine_id: machineId,
      start_time: new Date().toISOString(), // strict ISO timestamp
      end_time: null,
      category,
      status: 'active'
    })
  }

  function resolveDowntime(logId) {
    const log = downtime_logs.value.find(l => l.id === logId)
    if (log && log.status === 'active') {
      log.status = 'resolved'
      log.end_time = new Date().toISOString()
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────
  const activeIssues = computed(() => {
    return downtime_logs.value.filter(l => l.status === 'active').sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
  })
  
  const resolvedIssues = computed(() => {
    return downtime_logs.value.filter(l => l.status === 'resolved').sort((a, b) => new Date(b.end_time) - new Date(a.end_time))
  })

  const weeklyLostRevenue = computed(() => {
    // Standard piece rate logic for calculation (approx 2.50 ETB per piece on average)
    const STANDARD_PIECE_RATE = 2.50 
    
    let lostRevenue = 0
    
    downtime_logs.value.forEach(log => {
      if (log.status === 'resolved' && log.end_time) {
        const start = new Date(log.start_time).getTime()
        const end = new Date(log.end_time).getTime()
        
        // Duration in hours
        const durationHours = (end - start) / (1000 * 60 * 60)
        
        const machine = machines.value.find(m => m.id === log.machine_id)
        if (machine) {
          const piecesLost = machine.hourly_capacity * durationHours
          lostRevenue += piecesLost * STANDARD_PIECE_RATE
        }
      }
    })
    
    return lostRevenue
  })

  return {
    machines,
    downtime_logs,
    categories,
    reportDowntime,
    resolveDowntime,
    activeIssues,
    resolvedIssues,
    weeklyLostRevenue
  }
})
