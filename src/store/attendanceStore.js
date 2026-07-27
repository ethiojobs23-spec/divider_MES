/**
 * attendanceStore.js
 *
 * Manages shift-window clock-in validation and attendance logging via Supabase.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useMesStore } from './mesStore'

function parseWindowTime(hhMM) {
  const match = String(hhMM).match(/^(\d{1,2}):(\d{2})$/)
  if (!match) throw new Error(`[AttendanceStore] Invalid time format: "${hhMM}" — expected HH:MM`)
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h > 23 || m > 59) throw new Error(`[AttendanceStore] Out-of-range time: "${hhMM}"`)
  return h * 60 + m
}

function nowInMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export const useAttendanceStore = defineStore('attendance', () => {
  const mesStore = useMesStore()

  // Shift window
  const shiftWindowStart  = ref('07:30')
  const shiftWindowEnd    = ref('08:15')
  const gracePeriodMin    = ref(0)

  const windowStartMin = computed(() => parseWindowTime(shiftWindowStart.value))
  const windowEndMin   = computed(() => parseWindowTime(shiftWindowEnd.value) + gracePeriodMin.value)

  // Local mirror of attendance for current week
  const clockInLog = ref([])

  function validateClockInTime() {
    try {
      const current = nowInMinutes()
      const start   = windowStartMin.value
      const end     = windowEndMin.value
      const allowed = current >= start && current <= end
      return {
        allowed, currentMin: current, windowStartMin: start, windowEndMin: end,
        message: allowed ? '' : `CHECK-IN DENIED: Current time is outside the designated shift window (${shiftWindowStart.value}–${shiftWindowEnd.value}).`,
      }
    } catch (err) {
      console.error('[AttendanceStore] Window validation error:', err.message)
      return { allowed: false, currentMin: nowInMinutes(), windowStartMin: 0, windowEndMin: 0, message: `System Error: Shift window is misconfigured. Contact admin.` }
    }
  }

  async function fetchAttendance() {
    try {
      const { data, error } = await supabase.from('mes_attendance').select('*').eq('production_week', mesStore.currentProductionWeek)
      if (data) {
        clockInLog.value = data.map(dbRow => ({
          operatorId: dbRow.operator_id,
          timestamp: dbRow.clock_in,
          status: dbRow.status,
          shiftDate: dbRow.shift_date,
          week: dbRow.production_week
        }))
      }
    } catch (err) {
      console.error('[AttendanceStore] Error fetching attendance:', err)
    }
  }

  async function recordClockIn(operator) {
    const val = validateClockInTime()
    try {
      const payload = {
        operator_id: operator.id,
        production_week: mesStore.currentProductionWeek,
        shift_date: new Date().toISOString().split('T')[0],
        clock_in: new Date().toISOString(),
        status: val.allowed ? 'on_time' : 'late'
      }
      
      const { data, error } = await supabase.from('mes_attendance').insert(payload).select().single()
      if (error) throw error
      
      clockInLog.value.push({
        operatorId: data.operator_id,
        timestamp: data.clock_in,
        status: data.status,
        shiftDate: data.shift_date,
        week: data.production_week
      })
    } catch (err) {
      console.error('[AttendanceStore] Error recording clock in:', err)
    }
  }

  function getDaysAttended(workerId, week) {
    const entries = clockInLog.value.filter(e => e.operatorId === workerId && e.week === week)
    const uniqueDays = new Set(entries.map(e => e.shiftDate))
    return uniqueDays.size
  }

  function setShiftWindow(start, end) {
    parseWindowTime(start)
    parseWindowTime(end)
    if (parseWindowTime(start) >= parseWindowTime(end)) throw new Error('[AttendanceStore] Start must be before end')
    shiftWindowStart.value = start
    shiftWindowEnd.value   = end
  }

  return {
    shiftWindowStart, shiftWindowEnd, gracePeriodMin, windowStartMin, windowEndMin,
    clockInLog, fetchAttendance, validateClockInTime, recordClockIn, setShiftWindow, getDaysAttended
  }
})
