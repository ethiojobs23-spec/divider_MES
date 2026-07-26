/**
 * payrollStore.js
 *
 * Piece-rate and hourly wage payroll engine for the Divider MES.
 *
 * Financial arithmetic rules:
 *  - All intermediate values are kept as plain JS Numbers (IEEE 754 doubles).
 *    Rounding happens ONLY at the final output boundary via toDecimal2().
 *  - toDecimal2() rounds to 2dp using Math.round(x * 100) / 100, which avoids
 *    the classic 0.1+0.2 drift that parseFloat(x.toFixed(2)) can introduce.
 *  - Loan interest is simple (non-compounding): interest = principal × rate / 100
 *  - Net payout cannot go below zero (workers are never in debt from a single week).
 *  - Hourly wage rate is constrained to [HOURLY_MIN, HOURLY_MAX] at entry time.
 *
 * Piece-rate lookup:
 *  - Rates are indexed by Amharic placement keys exactly as they appear in the
 *    mesStore pieceRates matrix and the JSON payloads: 'ብተና' | 'ውስጥ' | 'የተሰየ'
 *  - The PLACEMENT_KEYS constant acts as the single source of truth.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMesStore } from './mesStore'

// ─── Constants ─────────────────────────────────────────────────────────────

/** Amharic placement keys — must match mesStore.pieceRates and API payloads */
export const PLACEMENT_KEYS = /** @type {const} */ (['ብተና', 'ውስጥ', 'የተሰየ'])

export const HOURLY_MIN =  15  // Birr/hr — hard floor
export const HOURLY_MAX =  30  // Birr/hr — hard ceiling
export const WORK_DAYS_PER_WEEK = 6

// ─── Precision helper ─────────────────────────────────────────────────────
/**
 * Round to exactly 2 decimal places without floating-point drift.
 * Uses integer arithmetic to avoid the 0.1+0.2≠0.3 problem.
 * @param {number} n
 * @returns {number}
 */
export function toDecimal2(n) {
  if (!isFinite(n) || isNaN(n)) return 0
  return Math.round(n * 100) / 100
}

// ─── Store ────────────────────────────────────────────────────────────────
export const usePayrollStore = defineStore('payroll', () => {
  const mesStore = useMesStore()

  // ── Worker Profiles ──────────────────────────────────────────────────────
  // { [workerId]: { paymentMethod: 'Cash'|'Transfer', accountInfo: string,
  //                 baseInterestRate: number (%), hourlyRate: number (Birr/hr) } }
  const workerProfiles = ref({})

  const DEFAULT_PROFILE = {
    paymentMethod:    'Cash',
    accountInfo:      '',
    baseInterestRate: 5,         // 5% simple interest on loans
    hourlyRate:       HOURLY_MIN, // default floor rate
  }

  function getWorkerProfile(workerId) {
    return { ...DEFAULT_PROFILE, ...workerProfiles.value[workerId] }
  }

  function setWorkerProfile(workerId, profileData) {
    // Clamp hourlyRate to legal range before persisting
    const incoming = { ...profileData }
    if ('hourlyRate' in incoming) {
      incoming.hourlyRate = Math.min(
        HOURLY_MAX,
        Math.max(HOURLY_MIN, Number(incoming.hourlyRate) || HOURLY_MIN),
      )
    }
    workerProfiles.value[workerId] = {
      ...getWorkerProfile(workerId),
      ...incoming,
    }
  }

  // ── Loans ────────────────────────────────────────────────────────────────
  // [{ id, workerId, week, amount: number, interestRate: number }]
  const loans = ref([])

  /**
   * Record a loan for a worker in a given production week.
   * Amount and interestRate are sanitised to finite positive numbers.
   *
   * @param {number} workerId
   * @param {string} week      - production week label e.g. "W30-2026"
   * @param {number} amount    - principal in Birr
   * @param {number|null} overrideRate - if null, uses worker's profile rate
   */
  function requestLoan(workerId, week, amount, overrideRate = null) {
    const profile = getWorkerProfile(workerId)
    const principal    = toDecimal2(Math.max(0, Number(amount) || 0))
    const interestRate = toDecimal2(
      Math.max(0, Number(overrideRate ?? profile.baseInterestRate) || 0),
    )

    if (principal <= 0) {
      console.warn('[PayrollStore] requestLoan: amount must be > 0')
      return
    }

    loans.value.push({
      id:           `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workerId,
      week,
      amount:       principal,
      interestRate, // stored as %, e.g. 5 means 5%
      issuedAt:     new Date().toISOString(),
    })
  }

  /**
   * Compute the total loan principal + simple interest for a worker/week.
   *
   * @param {number} workerId
   * @param {string} week
   * @returns {{ principal: number, interest: number, totalDeduction: number }}
   */
  function getLoanDeductions(workerId, week) {
    const workerLoans = loans.value.filter(
      (l) => l.workerId === workerId && l.week === week,
    )

    let principal = 0
    let interest  = 0

    for (const loan of workerLoans) {
      // Keep accumulation in full precision; round only at end
      principal += loan.amount
      interest  += loan.amount * (loan.interestRate / 100)
    }

    return {
      principal:       toDecimal2(principal),
      interest:        toDecimal2(interest),
      totalDeduction:  toDecimal2(principal + interest),
    }
  }

  // ── Attendance ────────────────────────────────────────────────────────────
  // { [week]: { [workerId]: daysAttended } }
  const attendanceRecords = ref({})

  function setAttendance(workerId, week, days) {
    if (!attendanceRecords.value[week]) attendanceRecords.value[week] = {}
    attendanceRecords.value[week][workerId] = Math.min(
      WORK_DAYS_PER_WEEK,
      Math.max(0, Math.round(Number(days) || 0)),
    )
  }

  function getDaysAttended(workerId, week) {
    return attendanceRecords.value[week]?.[workerId] ?? 0
  }

  // ── Gross Earnings (piece-rate) ────────────────────────────────────────────
  /**
   * Calculate gross earnings using actual piece-rates from the mesStore matrix.
   * Falls back to a safe 0 rather than an estimated flat rate.
   *
   * Each ledger entry must carry:
   *   { operator, week, dividerType, size, placement, goodProduction }
   * where `placement` is one of the PLACEMENT_KEYS Amharic values.
   *
   * @param {number} workerId
   * @param {string} week
   * @returns {number} gross earnings in Birr (2dp)
   */
  function getGrossEarnings(workerId, week) {
    const worker = mesStore.operators.find((o) => o.id === workerId)
    if (!worker) return 0

    const entries = mesStore.ledgerEntries.filter(
      (e) => e.operator === worker.name && e.week === week,
    )

    let gross = 0
    for (const entry of entries) {
      const qty = Number(entry.goodProduction) || 0
      if (qty <= 0) continue

      // Look up the exact piece rate from the rates matrix
      const rate = mesStore.pieceRates
        ?.[entry.dividerType]
        ?.[entry.size]
        ?.[entry.placement]  // Amharic key: 'ብተና' | 'ውስጥ' | 'የተሰየ'
        ?? 0

      if (rate <= 0) {
        console.warn(
          `[PayrollStore] No piece rate for type=${entry.dividerType} ` +
          `size=${entry.size} placement=${entry.placement} — entry skipped`,
        )
        continue
      }

      // Accumulate in full precision
      gross += qty * rate
    }

    return toDecimal2(gross)
  }

  /**
   * Calculate gross hourly earnings for entries that carry paymentMethod='hourly'.
   * HourlyWageTracker entries are stored in mesStore.cashEntries with type='hourly_wage'.
   *
   * @param {number} workerId
   * @param {string} week
   * @returns {number}
   */
  function getHourlyEarnings(workerId, week) {
    const worker = mesStore.operators.find((o) => o.id === workerId)
    if (!worker) return 0

    const profile = getWorkerProfile(workerId)
    const rate    = Math.min(HOURLY_MAX, Math.max(HOURLY_MIN, profile.hourlyRate))

    const hourlyEntries = mesStore.cashEntries.filter(
      (e) =>
        e.operator === worker.name &&
        e.week     === week &&
        e.type     === 'hourly_wage',
    )

    const totalHours = hourlyEntries.reduce(
      (sum, e) => sum + (Number(e.hours) || 0),
      0,
    )

    return toDecimal2(totalHours * rate)
  }

  // ── Final Payout Calculation ───────────────────────────────────────────────
  /**
   * Compute the final net payout:
   *   Net = (GrossPieceRate + GrossHourly) × attendanceFactor − (Loans + Interest)
   *
   * attendanceFactor is proportional: daysWorked / WORK_DAYS_PER_WEEK
   * so a worker who comes 3/6 days gets 50% of their piece earnings.
   * Net is clamped at 0 — workers cannot be in a negative payout state.
   *
   * @param {number} workerId
   * @param {string} week
   * @returns {{ grossPieceRate: number, grossHourly: number, attendanceFactor: number,
   *             grossEarnings: number, totalDeduction: number, netPayout: number,
   *             daysAttended: number }}
   */
  function calculateFinalPayout(workerId, week) {
    const daysAttended     = getDaysAttended(workerId, week)
    const attendanceFactor = daysAttended > 0
      ? toDecimal2(daysAttended / WORK_DAYS_PER_WEEK)
      : 0

    if (attendanceFactor === 0) {
      return {
        grossPieceRate:  0, grossHourly: 0, attendanceFactor: 0,
        grossEarnings:   0, totalDeduction: 0, netPayout: 0,
        daysAttended:    0,
      }
    }

    const grossPieceRate  = getGrossEarnings(workerId, week)
    const grossHourly     = getHourlyEarnings(workerId, week)
    const grossEarnings   = toDecimal2((grossPieceRate + grossHourly) * attendanceFactor)
    const { totalDeduction } = getLoanDeductions(workerId, week)

    const netPayout = toDecimal2(Math.max(0, grossEarnings - totalDeduction))

    return {
      grossPieceRate,
      grossHourly,
      attendanceFactor,
      grossEarnings,
      totalDeduction,
      netPayout,
      daysAttended,
    }
  }

  // ── All-operators weekly summary ──────────────────────────────────────────
  const weeklyPayrollSummary = computed(() => {
    const week = mesStore.currentProductionWeek
    return mesStore.operators.map((op) => ({
      ...op,
      ...calculateFinalPayout(op.id, week),
    }))
  })

  return {
    // Profiles
    workerProfiles,
    getWorkerProfile,
    setWorkerProfile,
    // Loans
    loans,
    requestLoan,
    getLoanDeductions,
    // Attendance
    attendanceRecords,
    setAttendance,
    getDaysAttended,
    // Earnings
    getGrossEarnings,
    getHourlyEarnings,
    calculateFinalPayout,
    weeklyPayrollSummary,
    // Constants (re-exported for consumers)
    PLACEMENT_KEYS,
    HOURLY_MIN,
    HOURLY_MAX,
    toDecimal2,
  }
})
