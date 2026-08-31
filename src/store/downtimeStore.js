// Developer: Mintesnot Abebe | Brand: dev MinteIO
/**
 * downtimeStore.js — Machine Downtime Tracking
 * Fully wired to Supabase with optimistic UI, offline sync, and Realtime subscriptions.
 * All tablets instantly see new downtime alerts via Supabase Realtime.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { syncManager } from '@/services/syncManager'
import { useMesStore } from './mesStore'

export const useDowntimeStore = defineStore('downtimeStore', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const machines = ref([
    { id: 1, name: '9cm Press Machine Alpha', hourly_capacity: 1500 },
    { id: 2, name: '9cm Press Machine Beta',  hourly_capacity: 1500 },
    { id: 3, name: '7cm Press Machine Gamma', hourly_capacity: 1200 },
    { id: 4, name: 'Raw Material Cutter',      hourly_capacity: 3000 },
  ])

  const downtime_logs = ref([])

  const categories = [
    'Mechanical Failure',
    'Power Outage',
    'Routine Maintenance',
    'Break',
  ]

  // ── Fetch from Supabase ────────────────────────────────────────────────
  async function fetchDowntime(week) {
    const mesStore = useMesStore()
    // Since mes_downtime_logs schema lacks production_week, we fetch the last 14 days
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const startDateISO = twoWeeksAgo.toISOString()

    try {
      const { data, error } = await supabase
        .from('mes_downtime_logs')
        .select('*')
        .gte('start_time', startDateISO)
        .order('start_time', { ascending: false })

      if (error) throw error
      if (data) {
        downtime_logs.value = data.map(row => ({
          id:         row.id,
          machine_id: row.operator_id,   // operator_id column is reused for machine_id in schema
          category:   row.issue_category || row.downtime_reason || '',
          start_time: row.start_time,
          end_time:   row.end_time || null,
          status:     row.end_time ? 'resolved' : 'active',
          resolution_notes: row.resolution_notes || '',
        }))
      }
    } catch (err) {
      console.error('[DowntimeStore] fetchDowntime failed:', err)
    }
  }

  // ── Report Downtime ────────────────────────────────────────────────────
  async function reportDowntime(machineId, category) {
    const mesStore = useMesStore()
    const tempId   = `temp-${Date.now()}`
    const now      = new Date().toISOString()

    // Optimistic push
    const local = {
      id:         tempId,
      machine_id: machineId,
      category,
      start_time: now,
      end_time:   null,
      status:     'active',
    }
    downtime_logs.value.unshift(local)

    const dbPayload = {
      operator_id:     machineId,  // stored in operator_id column per schema
      issue_category:  category,
      start_time:      now,
    }

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('mes_downtime_logs')
          .insert(dbPayload)
          .select()
          .single()

        if (error) throw error
        // Replace temp id with real DB id
        const idx = downtime_logs.value.findIndex(l => l.id === tempId)
        if (idx !== -1) downtime_logs.value[idx].id = data.id
      } catch (err) {
        console.error('[DowntimeStore] reportDowntime insert failed:', err)
        syncManager.enqueue({ action: 'insert', table: 'mes_downtime_logs', payload: dbPayload })
      }
    } else {
      syncManager.enqueue({ action: 'insert', table: 'mes_downtime_logs', payload: dbPayload })
    }
  }

  // ── Resolve Downtime ───────────────────────────────────────────────────
  async function resolveDowntime(logId, notes = '') {
    const log = downtime_logs.value.find(l => l.id === logId)
    if (!log || log.status !== 'active') return

    const endTime   = new Date().toISOString()
    const startMs   = new Date(log.start_time).getTime()
    const endMs     = new Date(endTime).getTime()
    const durationMinutes = Math.round((endMs - startMs) / 60_000)

    // Optimistic update
    log.status   = 'resolved'
    log.end_time = endTime
    log.resolution_notes = notes

    const updatePayload = { 
      end_time: endTime, 
      duration_minutes: durationMinutes,
      resolution_notes: notes
    }

    // Skip Supabase update for temp IDs (they'll sync via insert queue)
    if (String(logId).startsWith('temp-')) return

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('mes_downtime_logs')
          .update(updatePayload)
          .eq('id', logId)

        if (error) throw error
      } catch (err) {
        console.error('[DowntimeStore] resolveDowntime update failed:', err)
        syncManager.enqueue({
          action:  'update',
          table:   'mes_downtime_logs',
          payload: updatePayload,
          match:   { id: logId },
        })
      }
    } else {
      syncManager.enqueue({
        action:  'update',
        table:   'mes_downtime_logs',
        payload: updatePayload,
        match:   { id: logId },
      })
    }
  }

  // ── Realtime Subscription ──────────────────────────────────────────────
  let realtimeChannel = null

  function initRealtime() {
    if (realtimeChannel) return // already subscribed

    realtimeChannel = supabase
      .channel('mes_downtime_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_downtime_logs' },
        (payload) => {
          const row = payload.new
          // Avoid duplicate if we inserted locally already
          if (downtime_logs.value.some(l => l.id === row.id)) return
          downtime_logs.value.unshift({
            id:         row.id,
            machine_id: row.operator_id,
            category:   row.issue_category || '',
            start_time: row.start_time,
            end_time:   null,
            status:     'active',
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mes_downtime_logs' },
        (payload) => {
          const row = payload.new
          // If end_time is now set, resolve the local log
          if (row.end_time) {
            const log = downtime_logs.value.find(l => l.id === row.id)
            if (log) {
              log.status   = 'resolved'
              log.end_time = row.end_time
            }
          }
        }
      )
      .subscribe()
  }

  // ── Getters ────────────────────────────────────────────────────────────
  const activeIssues = computed(() =>
    downtime_logs.value
      .filter(l => l.status === 'active')
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
  )

  const resolvedIssues = computed(() =>
    downtime_logs.value
      .filter(l => l.status === 'resolved')
      .sort((a, b) => new Date(b.end_time) - new Date(a.end_time))
  )

  const weeklyLostRevenue = computed(() => {
    const STANDARD_PIECE_RATE = 2.50
    let lostRevenue = 0

    downtime_logs.value.forEach(log => {
      if (log.status === 'resolved' && log.end_time) {
        const durationHours = (new Date(log.end_time) - new Date(log.start_time)) / (1000 * 60 * 60)
        const machine = machines.value.find(m => m.id === log.machine_id)
        if (machine) {
          lostRevenue += machine.hourly_capacity * durationHours * STANDARD_PIECE_RATE
        }
      }
    })
    return lostRevenue
  })

  return {
    machines,
    downtime_logs,
    categories,
    fetchDowntime,
    reportDowntime,
    resolveDowntime,
    initRealtime,
    activeIssues,
    resolvedIssues,
    weeklyLostRevenue,
  }
})
