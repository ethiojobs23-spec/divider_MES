/**
 * payrollStore.js
 *
 * Piece-rate and hourly wage payroll engine for the Divider MES.
 * Supports installment-based loan deductions with per-week balance tracking.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMesStore } from './mesStore'
import { useAttendanceStore } from './attendanceStore'
import { supabase } from '@/lib/supabaseClient'

export const PLACEMENT_KEYS = (['ብተና', 'ውስጥ', 'የተሰየ'])
export const HOURLY_MIN =  15
export const HOURLY_MAX =  30
export const WORK_DAYS_PER_WEEK = 6

export function toDecimal2(n) {
  if (!isFinite(n) || isNaN(n)) return 0
  return Math.round(n * 100) / 100
}

export const usePayrollStore = defineStore('payroll', () => {
  // ── Profiles ────────────────────────────────────────────────────────
  const workerProfiles = ref({})
  const DEFAULT_PROFILE = {
    paymentMethod: 'Cash', accountInfo: '', baseInterestRate: 5,
    hourlyRate: HOURLY_MIN, isHourly: false, isPieceRate: true
  }

  function getWorkerProfile(workerId) {
    const mesStore = useMesStore()
    const op = mesStore.operators.find(o => o.id === workerId)
    const opConfig = op?.payroll_config || {}
    return { ...DEFAULT_PROFILE, ...opConfig, ...workerProfiles.value[workerId] }
  }
  function setWorkerProfile(workerId, profileData) {
    const incoming = { ...profileData }
    if ('hourlyRate' in incoming) {
      incoming.hourlyRate = Math.min(HOURLY_MAX, Math.max(HOURLY_MIN, Number(incoming.hourlyRate) || HOURLY_MIN))
    }
    workerProfiles.value[workerId] = { ...getWorkerProfile(workerId), ...incoming }
  }

  // ── Bonuses ────────────────────────────────────────────────────────────────
  const bonuses = ref({})

  function getBonusKey(workerId, week) { return `${workerId}::${week}` }

  function getBonus(workerId, week) {
    return bonuses.value[getBonusKey(workerId, week)] ?? { amount: 0, reason: '' }
  }

  async function fetchBonuses(week) {
    try {
      const { data } = await supabase.from('mes_bonuses').select('*').eq('production_week', week)
      if (data) {
        for (const row of data) {
          const key = getBonusKey(row.operator_id, row.production_week)
          bonuses.value[key] = { amount: Number(row.amount), reason: row.reason || '' }
        }
      }
    } catch (err) {
      console.warn('[PayrollStore] mes_bonuses table not found, bonus feature in local-only mode:', err.message)
    }
  }

  async function setBonusForWorker(workerId, week, amount, reason) {
    const safeAmount = toDecimal2(Math.max(0, Number(amount) || 0))
    const key = getBonusKey(workerId, week)
    bonuses.value = { ...bonuses.value, [key]: { amount: safeAmount, reason: reason || '' } }
    try {
      await supabase.from('mes_bonuses').upsert({
        operator_id: workerId,
        production_week: week,
        amount: safeAmount,
        reason: reason || ''
      }, { onConflict: 'operator_id,production_week' })
    } catch (err) {
      console.warn('[PayrollStore] Could not persist bonus to Supabase:', err.message)
    }
  }

  // ── Loans (installment-based) ────────────────────────────────────────────
  /**
   * Each loan object (in memory):
   * {
   *   id, workerId, week, status, issuedAt,
   *   amount          — principal
   *   interestRate    — %
   *   totalDebt       — principal + interest
   *   totalInstallments — how many weeks to repay
   *   weeklyInstallment — totalDebt / totalInstallments
   *   remainingBalance  — decremented on each payout approval
   *   weeksRemaining    — remaining installment count
   *   paidWeeks         — array of production_week strings already collected
   * }
   */
  const loans = ref([])

  /** Map a raw Supabase row to the in-memory shape */
  function _rowToLoan(row) {
    const principal   = Number(row.principal)
    const rate        = Number(row.interest_rate)
    const totalDebt   = toDecimal2(principal + principal * (rate / 100))
    const weeks       = Number(row.installment_weeks) || 1
    const weekly      = toDecimal2(totalDebt / weeks)
    const remaining   = toDecimal2(Number(row.remaining_balance ?? totalDebt))
    const paidWeeks   = row.paid_weeks ? JSON.parse(row.paid_weeks) : []

    return {
      id:                row.id,
      workerId:          row.operator_id,
      week:              row.production_week,
      amount:            principal,
      interestRate:      rate,
      status:            row.status,
      issuedAt:          row.issued_at,
      totalDebt,
      totalInstallments: weeks,
      weeklyInstallment: weekly,
      remainingBalance:  remaining,
      weeksRemaining:    Math.ceil(remaining / weekly),
      paidWeeks,
    }
  }

  async function fetchLoans() {
    try {
      const { data, error } = await supabase
        .from('mes_loans')
        .select('*')
        .in('status', ['active', 'pending'])
      if (error) throw error
      if (data) loans.value = data.map(_rowToLoan)
    } catch (err) {
      console.error('[PayrollStore] Error fetching loans:', err)
    }
  }

  /**
   * Request (and immediately approve, creating an active installment loan).
   * @param {number} installmentWeeks — number of weekly deductions (1-12)
   */
  async function requestLoan(workerId, week, amount, overrideRate = null, installmentWeeks = 1) {
    const profile      = getWorkerProfile(workerId)
    const principal    = toDecimal2(Math.max(0, Number(amount) || 0))
    const interestRate = toDecimal2(Math.max(0, Number(overrideRate ?? profile.baseInterestRate) || 0))
    const safeWeeks    = Math.max(1, Math.min(12, Number(installmentWeeks) || 1))

    if (principal <= 0) return

    const totalDebt    = toDecimal2(principal + principal * (interestRate / 100))
    const weeklyAmt    = toDecimal2(totalDebt / safeWeeks)

    try {
      const payload = {
        operator_id:        workerId,
        production_week:    week,
        principal,
        interest_rate:      interestRate,
        installment_weeks:  safeWeeks,
        remaining_balance:  totalDebt,
        paid_weeks:         JSON.stringify([]),
        status:             'active',            // approved immediately by admin
      }
      const { data, error } = await supabase.from('mes_loans').insert(payload).select().single()
      if (error) throw error

      loans.value.push(_rowToLoan(data))
    } catch (err) {
      console.error('[PayrollStore] Error requesting loan:', err)
      // Fallback: add locally if Supabase not ready
      loans.value.push({
        id:                `local-${Date.now()}`,
        workerId,
        week,
        amount:            principal,
        interestRate,
        status:            'active',
        issuedAt:          new Date().toISOString(),
        totalDebt,
        totalInstallments: safeWeeks,
        weeklyInstallment: weeklyAmt,
        remainingBalance:  totalDebt,
        weeksRemaining:    safeWeeks,
        paidWeeks:         [],
      })
    }
  }

  /**
   * Returns the installment deductions for this worker for this week.
   * - Only active loans whose remaining_balance > 0 AND this week not already collected.
   * - Deducts the minimum of (weeklyInstallment, remainingBalance) to avoid over-deduction.
   */
  function getLoanDeductions(workerId, week) {
    const activeLoans = loans.value.filter(
      l => l.workerId === workerId &&
           l.status === 'active' &&
           l.remainingBalance > 0 &&
           !l.paidWeeks.includes(week)
    )

    let totalInstallmentDeduction = 0
    const breakdown = []

    for (const loan of activeLoans) {
      const thisWeekAmt = toDecimal2(Math.min(loan.weeklyInstallment, loan.remainingBalance))
      totalInstallmentDeduction += thisWeekAmt
      breakdown.push({
        loanId:       loan.id,
        deduction:    thisWeekAmt,
        remaining:    toDecimal2(loan.remainingBalance - thisWeekAmt),
        weeklyInstallment: loan.weeklyInstallment,
        totalInstallments: loan.totalInstallments,
        weeksRemaining: loan.weeksRemaining,
        totalDebt:    loan.totalDebt,
      })
    }

    return {
      totalDeduction: toDecimal2(totalInstallmentDeduction),
      breakdown,
    }
  }

  /**
   * Called during payout approval — marks the installment as collected for this week
   * and decrements remaining_balance in Supabase.
   */
  async function collectLoanInstallments(workerId, week) {
    const activeLoans = loans.value.filter(
      l => l.workerId === workerId &&
           l.status === 'active' &&
           l.remainingBalance > 0 &&
           !l.paidWeeks.includes(week)
    )

    for (const loan of activeLoans) {
      const thisWeekAmt   = toDecimal2(Math.min(loan.weeklyInstallment, loan.remainingBalance))
      const newBalance    = toDecimal2(loan.remainingBalance - thisWeekAmt)
      const newPaidWeeks  = [...loan.paidWeeks, week]
      const newStatus     = newBalance <= 0 ? 'closed' : 'active'

      // Optimistic local update
      loan.remainingBalance = newBalance
      loan.paidWeeks        = newPaidWeeks
      loan.weeksRemaining   = newBalance <= 0 ? 0 : Math.ceil(newBalance / loan.weeklyInstallment)
      loan.status           = newStatus

      try {
        await supabase
          .from('mes_loans')
          .update({
            remaining_balance: newBalance,
            paid_weeks:        JSON.stringify(newPaidWeeks),
            status:            newStatus,
          })
          .eq('id', loan.id)
      } catch (err) {
        console.warn('[PayrollStore] Could not update loan balance in Supabase:', err.message)
      }
    }
  }

  function getAdvanceDeductions(workerId, week) {
    const mesStore = useMesStore()
    const worker = mesStore.operators.find(o => o.id === workerId)
    if (!worker) return { totalDeduction: 0 }
    const workerAdvances = mesStore.cashEntries.filter(e =>
      e.operator === worker.name && e.week === week && e.type === 'advance'
    )
    const total = workerAdvances.reduce((sum, adv) => sum + Number(adv.amount), 0)
    return { totalDeduction: toDecimal2(total) }
  }

  async function approveLoan(loanId) {
    try {
      const { error } = await supabase.from('mes_loans').update({ status: 'active' }).eq('id', loanId)
      if (error) throw error
      const loan = loans.value.find(l => l.id === loanId)
      if (loan) loan.status = 'active'
    } catch (err) {
      console.error('[PayrollStore] Error approving loan:', err)
    }
  }

  async function rejectLoan(loanId) {
    try {
      const { error } = await supabase.from('mes_loans').update({ status: 'rejected' }).eq('id', loanId)
      if (error) throw error
      const loan = loans.value.find(l => l.id === loanId)
      if (loan) loan.status = 'rejected'
    } catch (err) {
      console.error('[PayrollStore] Error rejecting loan:', err)
    }
  }

  // ── Attendance Delegate ───────────────────────────────────────────────────
  function getDaysAttended(workerId, week) {
    const attendanceStore = useAttendanceStore()
    return attendanceStore.getDaysAttended(workerId, week)
  }

  // ── Gross Earnings ────────────────────────────────────────────────────────
  function getGrossEarnings(workerId, week) {
    const mesStore = useMesStore()
    const profile = getWorkerProfile(workerId)
    if (!profile.isPieceRate) return 0
    const worker = mesStore.operators.find(o => o.id === workerId)
    if (!worker) return 0
    const entries = mesStore.ledgerEntries.filter(e =>
      e.operator === worker.name && (e.week === week || !week)
    )
    let gross = 0
    for (const entry of entries) {
      const qty = Number(entry.goodProduction) || 0
      if (qty <= 0) continue
      const rate = mesStore.pieceRates?.[entry.dividerType]?.[entry.size]?.[entry.placement] ?? 0
      gross += qty * rate
    }
    return toDecimal2(gross)
  }

  function getHourlyEarnings(workerId, week) {
    const profile = getWorkerProfile(workerId)
    if (!profile.isHourly) return 0
    const rate = Math.min(HOURLY_MAX, Math.max(HOURLY_MIN, profile.hourlyRate))
    const daysAttended = getDaysAttended(workerId, week)
    return toDecimal2(daysAttended * 8 * rate)
  }

  function getShiftBreakdown(workerId, week) {
    const mesStore = useMesStore()
    const worker = mesStore.operators.find(o => o.id === workerId)
    if (!worker) return []
    return mesStore.shiftSubmissions
      .filter(s => s.operator_id === workerId)
      .map(s => {
        const entries = (s.details?.entries || []).map(e => {
          const rate = mesStore.pieceRates?.[e.dividerType]?.[e.size]?.[e.placement] ?? 0
          const earnings = toDecimal2(rate * (Number(e.good) || 0))
          return { ...e, rate, earnings }
        })
        const shiftEarnings = entries.reduce((sum, e) => sum + e.earnings, 0)
        return {
          date: s.transaction_date,
          status: s.target_name,
          shiftGood: s.details?.totalGood ?? 0,
          shiftWaste: s.details?.totalWaste ?? 0,
          shiftEarnings: toDecimal2(shiftEarnings),
          entries
        }
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // ── Final Payout Calculation ──────────────────────────────────────────────
  function calculateFinalPayout(workerId, week) {
    const mesStore = useMesStore()
    const daysAttended = getDaysAttended(workerId, week)
    const attendanceFactor = daysAttended > 0 ? toDecimal2(daysAttended / WORK_DAYS_PER_WEEK) : 0

    if (attendanceFactor === 0) {
      return {
        grossPieceRate: 0, grossHourly: 0, attendanceFactor: 0,
        grossEarnings: 0, totalDeduction: 0, loanBreakdown: [],
        bonus: 0, netPayout: 0, daysAttended: 0
      }
    }

    // Piece-rate: prefer approved shift submissions, fallback to raw ledger
    const approvedShifts = mesStore.shiftSubmissions.filter(
      s => s.operator_id === workerId && s.target_name === 'approved'
    )
    let grossPieceRate
    if (approvedShifts.length > 0) {
      grossPieceRate = toDecimal2(approvedShifts.reduce((sum, s) => {
        const entries = s.details?.entries || []
        return sum + entries.reduce((es, e) => {
          const rate = mesStore.pieceRates?.[e.dividerType]?.[e.size]?.[e.placement] ?? 0
          return es + rate * (Number(e.good) || 0)
        }, 0)
      }, 0))
    } else {
      grossPieceRate = getGrossEarnings(workerId, week)
    }

    const grossHourly   = getHourlyEarnings(workerId, week)
    const grossEarnings = toDecimal2((grossPieceRate + grossHourly) * attendanceFactor)

    // ── INSTALLMENT DEDUCTIONS: only this week's slice ──────────────────────
    const { totalDeduction: loanDeductions, breakdown: loanBreakdown } = getLoanDeductions(workerId, week)
    const { totalDeduction: advanceDeductions } = getAdvanceDeductions(workerId, week)
    const totalDeduction = toDecimal2(loanDeductions + advanceDeductions)

    const bonus    = toDecimal2(getBonus(workerId, week).amount)
    const netPayout = toDecimal2(Math.max(0, grossEarnings - totalDeduction + bonus))

    return {
      grossPieceRate, grossHourly, attendanceFactor, grossEarnings,
      totalDeduction, loanBreakdown, bonus, netPayout, daysAttended
    }
  }

  // ── Payout Statuses ────────────────────────────────────────────────────────
  const payoutStatuses = ref({})

  function getPayoutStatus(workerId, week) {
    return payoutStatuses.value[week]?.[workerId] || { status: 'pending', reason: '' }
  }

  async function approvePayout(workerId, week) {
    const mesStore = useMesStore()
    const currentStatuses = { ...payoutStatuses.value }
    if (!currentStatuses[week]) currentStatuses[week] = {}
    currentStatuses[week] = {
      ...currentStatuses[week],
      [workerId]: { status: 'approved', reason: '' }
    }
    payoutStatuses.value = currentStatuses

    // Collect loan installments for this week (decrements balances, closes paid-off loans)
    await collectLoanInstallments(workerId, week)

    // Log payout to ledger
    const payoutDetails = calculateFinalPayout(workerId, week)
    if (payoutDetails.netPayout > 0) {
      const worker    = mesStore.operators.find(o => o.id === workerId)
      const bonusInfo = getBonus(workerId, week)
      const bonusNote = bonusInfo.amount > 0
        ? ` + Bonus: ${bonusInfo.amount} ETB (${bonusInfo.reason || 'Performance'})`
        : ''
      await mesStore.addCashEntry({
        operator: worker?.name || 'Unknown',
        type:     'payout',
        amount:   payoutDetails.netPayout,
        note:     `Weekly Payroll Settlement for ${week}${bonusNote}`
      })
    }
  }

  function holdPayout(workerId, week, reason) {
    const currentStatuses = { ...payoutStatuses.value }
    if (!currentStatuses[week]) currentStatuses[week] = {}
    currentStatuses[week] = {
      ...currentStatuses[week],
      [workerId]: { status: 'held', reason: reason || 'Disputed' }
    }
    payoutStatuses.value = currentStatuses
  }

  const weeklyPayrollSummary = computed(() => {
    const mesStore = useMesStore()
    const week = mesStore.currentProductionWeek
    return mesStore.operators.map(op => ({
      ...op,
      ...calculateFinalPayout(op.id, week),
      payoutStatus: getPayoutStatus(op.id, week),
    }))
  })

  return {
    fetchLoans, workerProfiles, getWorkerProfile, setWorkerProfile,
    loans, requestLoan, getLoanDeductions, getAdvanceDeductions,
    collectLoanInstallments, approveLoan, rejectLoan,
    getDaysAttended,
    getGrossEarnings, getHourlyEarnings, calculateFinalPayout,
    getShiftBreakdown, weeklyPayrollSummary,
    payoutStatuses, getPayoutStatus, approvePayout, holdPayout,
    bonuses, getBonus, fetchBonuses, setBonusForWorker,
    PLACEMENT_KEYS, HOURLY_MIN, HOURLY_MAX, toDecimal2,
  }
})
