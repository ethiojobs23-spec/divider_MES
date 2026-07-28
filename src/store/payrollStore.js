/**
 * payrollStore.js
 *
 * Piece-rate and hourly wage payroll engine for the Divider MES.
 * Integrates with Supabase to fetch and store loans and payout statuses.
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
  const mesStore = useMesStore()
  const attendanceStore = useAttendanceStore()

  // ── Profiles ────────────────────────────────────────────────────────
  const workerProfiles = ref({})
  const DEFAULT_PROFILE = { 
    paymentMethod: 'Cash', accountInfo: '', baseInterestRate: 5, 
    hourlyRate: HOURLY_MIN, isHourly: false, isPieceRate: true 
  }

  function getWorkerProfile(workerId) {
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

  // ── Loans ────────────────────────────────────────────────────────────────
  const loans = ref([])

  async function fetchLoans() {
    try {
      const { data, error } = await supabase.from('mes_loans').select('*').eq('production_week', mesStore.currentProductionWeek)
      if (data) {
        loans.value = data.map(dbRow => ({
          id: dbRow.id,
          workerId: dbRow.operator_id,
          week: dbRow.production_week,
          amount: Number(dbRow.principal),
          interestRate: Number(dbRow.interest_rate),
          status: dbRow.status,
          issuedAt: dbRow.issued_at
        }))
      }
    } catch (err) {
      console.error('[PayrollStore] Error fetching loans:', err)
    }
  }

  async function requestLoan(workerId, week, amount, overrideRate = null) {
    const profile = getWorkerProfile(workerId)
    const principal = toDecimal2(Math.max(0, Number(amount) || 0))
    const interestRate = toDecimal2(Math.max(0, Number(overrideRate ?? profile.baseInterestRate) || 0))

    if (principal <= 0) return

    try {
      const payload = {
        operator_id: workerId,
        production_week: week,
        principal: principal,
        interest_rate: interestRate,
        status: 'pending'
      }
      const { data, error } = await supabase.from('mes_loans').insert(payload).select().single()
      if (error) throw error

      loans.value.push({
        id: data.id,
        workerId: data.operator_id,
        week: data.production_week,
        amount: Number(data.principal),
        interestRate: Number(data.interest_rate),
        status: data.status,
        issuedAt: data.issued_at
      })
    } catch (err) {
      console.error('[PayrollStore] Error requesting loan:', err)
    }
  }

  function getLoanDeductions(workerId, week) {
    const workerLoans = loans.value.filter(l => l.workerId === workerId && l.week === week && l.status === 'active')
    let principal = 0
    let interest  = 0
    for (const loan of workerLoans) {
      principal += loan.amount
      interest  += loan.amount * (loan.interestRate / 100)
    }
    return {
      principal: toDecimal2(principal),
      interest: toDecimal2(interest),
      totalDeduction: toDecimal2(principal + interest),
    }
  }

  function getAdvanceDeductions(workerId, week) {
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
    // We delegate attendance calculation to the attendanceStore which will query Supabase
    return attendanceStore.getDaysAttended(workerId, week)
  }

  // ── Gross Earnings (piece-rate) ────────────────────────────────────────────
  function getGrossEarnings(workerId, week) {
    const profile = getWorkerProfile(workerId)
    if (!profile.isPieceRate) return 0
    
    const worker = mesStore.operators.find(o => o.id === workerId)
    if (!worker) return 0
    // Filter by both operator name AND week
    const entries = mesStore.ledgerEntries.filter(e =>
      e.operator === worker.name && (e.week === week || !week)
    )
    let gross = 0
    for (const entry of entries) {
      const qty = Number(entry.goodProduction) || 0
      if (qty <= 0) continue
      // Size stored as '9cm' in ledger, pieceRates key is '9cm'
      const rate = mesStore.pieceRates?.[entry.dividerType]?.[entry.size]?.[entry.placement] ?? 0
      gross += qty * rate
    }
    return toDecimal2(gross)
  }

  function getHourlyEarnings(workerId, week) {
    const profile = getWorkerProfile(workerId)
    if (!profile.isHourly) return 0
    const rate = Math.min(HOURLY_MAX, Math.max(HOURLY_MIN, profile.hourlyRate))
    // 8 hours per shift day, prorated by attendance
    const daysAttended = getDaysAttended(workerId, week)
    const totalHours = daysAttended * 8
    return toDecimal2(totalHours * rate)
  }

  // ── Shift-based earnings breakdown ─────────────────────────────────────────────────
  /** Returns an array of {date, entries[], shiftGood, shiftWaste, shiftEarnings, status} for this worker's shift submissions */
  function getShiftBreakdown(workerId, week) {
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

  // ── Final Payout Calculation ─────────────────────────────────────────────────
  function calculateFinalPayout(workerId, week) {
    const daysAttended = getDaysAttended(workerId, week)
    const attendanceFactor = daysAttended > 0 ? toDecimal2(daysAttended / WORK_DAYS_PER_WEEK) : 0

    if (attendanceFactor === 0) {
      return { grossPieceRate: 0, grossHourly: 0, attendanceFactor: 0, grossEarnings: 0, totalDeduction: 0, netPayout: 0, daysAttended: 0 }
    }

    // Use approved shift submissions for piece-rate if available; fallback to raw ledger
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

    const grossHourly = getHourlyEarnings(workerId, week)
    const grossEarnings = toDecimal2((grossPieceRate + grossHourly) * attendanceFactor)
    const { totalDeduction: loanDeductions } = getLoanDeductions(workerId, week)
    const { totalDeduction: advanceDeductions } = getAdvanceDeductions(workerId, week)
    const totalDeduction = toDecimal2(loanDeductions + advanceDeductions)
    const netPayout = toDecimal2(Math.max(0, grossEarnings - totalDeduction))

    return { grossPieceRate, grossHourly, attendanceFactor, grossEarnings, totalDeduction, netPayout, daysAttended }
  }

  // ── Payout Statuses ────────────────────────────────────────────────────────
  const payoutStatuses = ref({})

  function getPayoutStatus(workerId, week) {
    return payoutStatuses.value[week]?.[workerId] || { status: 'pending', reason: '' }
  }
  async function approvePayout(workerId, week) {
    const currentStatuses = { ...payoutStatuses.value }
    if (!currentStatuses[week]) currentStatuses[week] = {}
    currentStatuses[week] = { 
      ...currentStatuses[week], 
      [workerId]: { status: 'approved', reason: '' } 
    }
    payoutStatuses.value = currentStatuses

    // Log the payout to the database ledger natively
    const payoutDetails = calculateFinalPayout(workerId, week)
    if (payoutDetails.netPayout > 0) {
      const worker = mesStore.operators.find(o => o.id === workerId)
      await mesStore.addCashEntry({
        operator: worker?.name || 'Unknown',
        type: 'payout',
        amount: payoutDetails.netPayout,
        note: `Weekly Payroll Settlement for ${week}`
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
    const week = mesStore.currentProductionWeek
    return mesStore.operators.map(op => ({
      ...op,
      ...calculateFinalPayout(op.id, week),
      payoutStatus: getPayoutStatus(op.id, week),
    }))
  })

  return {
    fetchLoans, workerProfiles, getWorkerProfile, setWorkerProfile,
    loans, requestLoan, getLoanDeductions, getAdvanceDeductions, approveLoan, rejectLoan,
    getDaysAttended,
    getGrossEarnings, getHourlyEarnings, calculateFinalPayout, getShiftBreakdown, weeklyPayrollSummary,
    payoutStatuses, getPayoutStatus, approvePayout, holdPayout,
    PLACEMENT_KEYS, HOURLY_MIN, HOURLY_MAX, toDecimal2,
  }
})
