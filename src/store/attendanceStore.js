// Developer: Mintesnot Abebe | Brand: dev MinteIO
/**
 * attendanceStore.js
 *
 * Manages shift-window clock-in validation and attendance logging via Supabase.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useMesStore } from './mesStore'
import { syncManager } from '@/services/syncManager'

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

  // Allowed Clocking Windows
  const clockingWindows = ref([
    { id: 'morning_in', name: 'Morning Clock In', start: '07:30', end: '08:00', type: 'in' },
    { id: 'lunch_out', name: 'Lunch Break Start', start: '12:00', end: '12:30', type: 'out' },
    { id: 'lunch_in', name: 'Lunch Break End', start: '13:00', end: '13:30', type: 'in' },
    { id: 'shift_out', name: 'Shift End', start: '17:00', end: '17:30', type: 'out' },
  ])

  // Local mirror of attendance
  const clockInLog = ref([])

  function validateClockTime(type) {
    try {
      const current = nowInMinutes()
      const validWindows = clockingWindows.value.filter(w => w.type === type)
      
      let allowed = false
      let activeWindow = null

      for (const w of validWindows) {
        const startMin = parseWindowTime(w.start)
        const endMin = parseWindowTime(w.end)
        if (current >= startMin && current <= endMin) {
          allowed = true
          activeWindow = w
          break
        }
      }

      return {
        allowed, currentMin: current, activeWindow,
        message: allowed ? '' : `Action denied: You are outside the allowed time windows for clocking ${type.toUpperCase()}. Admin override required.`,
      }
    } catch (err) {
      console.error('[AttendanceStore] Window validation error:', err.message)
      return { allowed: false, message: `System Error: Misconfigured time windows. Contact admin.` }
    }
  }

  async function fetchAttendance() {
    try {
      const { data, error } = await supabase
        .from('mes_attendance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)

      if (data) {
        clockInLog.value = data.map(dbRow => ({
          id: dbRow.id,
          operatorId: dbRow.operator_id != null ? Number(dbRow.operator_id) : null,
          timestamp: dbRow.clock_in,
          clockOut: dbRow.clock_out,
          status: dbRow.status,
          shiftDate: dbRow.shift_date || (dbRow.clock_in ? dbRow.clock_in.split('T')[0] : null),
          week: dbRow.production_week
        }))
      }
    } catch (err) {
      console.error('[AttendanceStore] Error fetching attendance:', err)
    }
  }

  async function recordClockIn(operator, adminOverride = false) {
    const val = validateClockTime('in')
    if (!val.allowed && !adminOverride) throw new Error(val.message)
    try {
      const mesStore = useMesStore()
      const opId = Number(operator.id)
      const nowIso = new Date().toISOString()
      const localDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

      const payload = {
        operator_id: opId,
        production_week: mesStore.currentProductionWeek,
        shift_date: localDate,
        clock_in: nowIso,
        status: val.allowed ? 'on_time' : 'late'
      }
      
      // Optimistic UI Update
      clockInLog.value.unshift({
        operatorId: opId,
        timestamp: payload.clock_in,
        clockOut: null,
        status: payload.status,
        shiftDate: payload.shift_date,
        week: payload.production_week
      })

      if (navigator.onLine) {
        const { data, error } = await supabase.from('mes_attendance').insert(payload).select()
        if (data && data[0]) {
          const inserted = clockInLog.value.find(l => l.timestamp === nowIso && l.operatorId === opId)
          if (inserted) inserted.id = data[0].id
        }
      } else {
        syncManager.enqueue({ action: 'insert', table: 'mes_attendance', payload })
      }
    } catch (err) {
      console.error('[AttendanceStore] Error recording clock in:', err)
    }
  }

  async function recordClockOut(operatorId, adminOverride = false) {
    const val = validateClockTime('out')
    if (!val.allowed && !adminOverride) throw new Error(val.message)
    try {
      const opId = Number(operatorId)
      const nowIso = new Date().toISOString()

      // 1. Optimistically update local mirror
      const activeEntry = clockInLog.value.find(l => 
        Number(l.operatorId) === opId && !l.clockOut
      )

      if (activeEntry) {
        activeEntry.clockOut = nowIso
      }

      // 2. Persist to Supabase
      if (navigator.onLine) {
        if (activeEntry && activeEntry.id) {
          await supabase.from('mes_attendance').update({ clock_out: nowIso }).eq('id', activeEntry.id)
        } else {
          await supabase.from('mes_attendance')
            .update({ clock_out: nowIso })
            .eq('operator_id', opId)
            .is('clock_out', null)
        }
      } else {
        if (activeEntry && activeEntry.id) {
          syncManager.enqueue({ action: 'update', table: 'mes_attendance', payload: { clock_out: nowIso }, match: { id: activeEntry.id } })
        } else {
          syncManager.enqueue({ action: 'update', table: 'mes_attendance', payload: { clock_out: nowIso }, match: { operator_id: opId } })
        }
      }
    } catch (err) {
      console.error('[AttendanceStore] Error recording clock out:', err)
      const nowIso = new Date().toISOString()
      syncManager.enqueue({ action: 'update', table: 'mes_attendance', payload: { clock_out: nowIso }, match: { operator_id: Number(operatorId) } })
    }
  }

  function getDaysAttended(workerId, week) {
    const entries = clockInLog.value.filter(e => Number(e.operatorId) === Number(workerId) && e.week === week)
    const uniqueDays = new Set(entries.map(e => e.shiftDate))
    return uniqueDays.size
  }

  function updateWindow(id, start, end) {
    parseWindowTime(start) // validate format
    parseWindowTime(end)
    if (parseWindowTime(start) >= parseWindowTime(end)) throw new Error('Start must be before end')
    
    const w = clockingWindows.value.find(x => x.id === id)
    if (w) {
      w.start = start
      w.end = end
    }
  }

  // ── Realtime Subscription ──────────────────────────────────────────────
  let realtimeChannel = null

  function initRealtime() {
    if (realtimeChannel) return

    realtimeChannel = supabase
      .channel('mes_attendance_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_attendance' },
        (payload) => {
          const row = payload.new
          const opId = row.operator_id != null ? Number(row.operator_id) : null
          const existing = clockInLog.value.find(l => 
            l.id === row.id || 
            (Number(l.operatorId) === opId && l.shiftDate === row.shift_date && l.timestamp === row.clock_in)
          )
          if (existing) {
            existing.id = row.id
            existing.clockOut = row.clock_out
            existing.status = row.status
          } else {
            clockInLog.value.unshift({
              id: row.id,
              operatorId: opId,
              timestamp: dbRowToIso(row.clock_in),
              clockOut: row.clock_out,
              status: row.status,
              shiftDate: row.shift_date,
              week: row.production_week
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mes_attendance' },
        (payload) => {
          const row = payload.new
          const opId = row.operator_id != null ? Number(row.operator_id) : null
          const existing = clockInLog.value.find(l => 
            l.id === row.id || 
            (Number(l.operatorId) === opId && !l.clockOut)
          )
          if (existing) {
            existing.id = row.id
            existing.clockOut = row.clock_out
            existing.status = row.status
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mes_attendance' },
        (payload) => {
          const oldRow = payload.old
          clockInLog.value = clockInLog.value.filter(l => l.id !== oldRow.id)
        }
      )
      .subscribe()
  }

  function dbRowToIso(val) {
    return val || new Date().toISOString()
  }

  return {
    clockingWindows,
    clockInLog,
    fetchAttendance,
    loadAttendanceLogs: fetchAttendance,
    validateClockTime,
    recordClockIn,
    recordClockOut,
    updateWindow,
    getDaysAttended,
    initRealtime,
  }
}, {
  persist: {
    key: 'divider-attendance-store',
    paths: ['clockingWindows', 'clockInLog']
  },
})

