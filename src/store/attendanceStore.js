/**
 * attendanceStore.js
 *
 * Manages shift-window clock-in validation.
 *
 * Design decisions:
 *  - Time comparison is done entirely in minutes-since-midnight using
 *    Date.getHours() / Date.getMinutes() — no string parsing, no AM/PM
 *    ambiguity regardless of the tablet's locale or 12h/24h display setting.
 *  - shiftWindowStart / shiftWindowEnd are stored as "HH:MM" 24h strings
 *    (admin-configured) and parsed once per call, not cached, so a midnight
 *    DST boundary doesn't corrupt the comparison.
 *  - A grace period (default 0 min) can extend the end of the window for
 *    late-arrival tolerance without touching the core window definition.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ─── Parse a "HH:MM" 24h string → minutes since midnight ────────────────────
// Throws if format is invalid so misconfiguration surfaces immediately.
function parseWindowTime(hhMM) {
  const match = String(hhMM).match(/^(\d{1,2}):(\d{2})$/)
  if (!match) throw new Error(`[AttendanceStore] Invalid time format: "${hhMM}" — expected HH:MM`)
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h > 23 || m > 59) throw new Error(`[AttendanceStore] Out-of-range time: "${hhMM}"`)
  return h * 60 + m
}

// ─── Current wall-clock in minutes since midnight (always 24h) ──────────────
function nowInMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export const useAttendanceStore = defineStore('attendance', () => {
  // Shift window: 24h "HH:MM" strings, admin-configurable
  const shiftWindowStart  = ref('07:30')
  const shiftWindowEnd    = ref('08:15')
  // Extra minutes beyond shiftWindowEnd that still count as on-time
  const gracePeriodMin    = ref(0)

  // Derived window in minutes (recomputed any time the strings change)
  const windowStartMin = computed(() => parseWindowTime(shiftWindowStart.value))
  const windowEndMin   = computed(() =>
    parseWindowTime(shiftWindowEnd.value) + gracePeriodMin.value
  )

  // Clock-in log: [{ operatorId, operatorName, timestamp, withinWindow }]
  const clockInLog = ref([])

  /**
   * Validate whether the current wall-clock time is inside the shift window.
   * Returns a structured result — never throws to the caller.
   *
   * @returns {{ allowed: boolean, message: string, currentMin: number,
   *             windowStartMin: number, windowEndMin: number }}
   */
  function validateClockInTime() {
    try {
      const current = nowInMinutes()
      const start   = windowStartMin.value
      const end     = windowEndMin.value

      const allowed = current >= start && current <= end

      return {
        allowed,
        currentMin:    current,
        windowStartMin: start,
        windowEndMin:  end,
        message: allowed
          ? ''
          : `CHECK-IN DENIED: Current time is outside the designated shift window ` +
            `(${shiftWindowStart.value}–${shiftWindowEnd.value}).`,
      }
    } catch (err) {
      // Misconfigured window — fail safe by DENYING clock-in
      console.error('[AttendanceStore] Window validation error:', err.message)
      return {
        allowed:        false,
        currentMin:     nowInMinutes(),
        windowStartMin: 0,
        windowEndMin:   0,
        message:        `System Error: Shift window is misconfigured. Contact admin.`,
      }
    }
  }

  /**
   * Record a successful clock-in for audit purposes.
   * Called AFTER the consuming component confirms the operator identity.
   *
   * @param {{ id: number, name: string }} operator
   */
  function recordClockIn(operator) {
    clockInLog.value.push({
      operatorId:   operator.id,
      operatorName: operator.name,
      timestamp:    new Date().toISOString(), // UTC ISO — timezone-safe
      withinWindow: validateClockInTime().allowed,
    })
  }

  /**
   * Admin: update shift window. Validates format before accepting.
   * @param {string} start - "HH:MM"
   * @param {string} end   - "HH:MM"
   */
  function setShiftWindow(start, end) {
    // Validate before committing — throws on bad format
    parseWindowTime(start)
    parseWindowTime(end)
    if (parseWindowTime(start) >= parseWindowTime(end)) {
      throw new Error('[AttendanceStore] Start time must be before end time')
    }
    shiftWindowStart.value = start
    shiftWindowEnd.value   = end
  }

  return {
    shiftWindowStart,
    shiftWindowEnd,
    gracePeriodMin,
    windowStartMin,
    windowEndMin,
    clockInLog,
    validateClockInTime,
    recordClockIn,
    setShiftWindow,
  }
})
