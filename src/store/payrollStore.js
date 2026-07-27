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
  const DEFAULT_PROFILE = { paymentMethod: 'Cash', accountInfo: '', baseInterestRate: 5, hourlyRate: HOURLY_MIN }

  function getWorkerProfile(workerId) {
    return { ...DEFAULT_PROFILE, ...workerProfiles.value[workerId] }
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
        status: 'active'
      }
      const { data, error } = await supabase.from('mes_loans').insert(payload).select().single()
      if (error) throw error

      loans.value.push({
        id: data.id,
        workerId: data.operator_id,
        week: data.production_week,
        amount: Number(data.principal),
        interestRate: Number(data.interest_rate),
        issuedAt: data.issued_at
      })
    } catch (err) {
      console.error('[PayrollStore] Error requesting loan:', err)
    }
  }

  function getLoanDeductions(workerId, week) {
    const workerLoans = loans.value.filter(l => l.workerId === workerId && l.week === week)
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

  // ── Attendance Delegate ───────────────────────────────────────────────────
  function getDaysAttended(workerId, week) {
    // We delegate attendance calculation to the attendanceStore which will query Supabase
    return attendanceStore.getDaysAttended(workerId, week)
  }

  // ── Gross Earnings (piece-rate) ────────────────────────────────────────────
  function getGrossEarnings(workerId, week) {
    const worker = mesStore.operators.find(o => o.id === workerId)
    if (!worker) return 0
    const entries = mesStore.ledgerEntries.filter(e => e.operator === worker.name && e.week === week)
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
    const worker = mesStore.operators.find(o => o.id === workerId)
    if (!worker) return 0
    const profile = getWorkerProfile(workerId)
    const rate = Math.min(HOURLY_MAX, Math.max(HOURLY_MIN, profile.hourlyRate))
    const hourlyEntries = mesStore.cashEntries.filter(e => e.operator === worker.name && e.week === week && e.type === 'hourly_wage')
    const totalHours = hourlyEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0)
    return toDecimal2(totalHours * rate)
  }

  // ── Final Payout Calculation ───────────────────────────────────────────────
  function calculateFinalPayout(workerId, week) {
    const daysAttended = getDaysAttended(workerId, week)
    const attendanceFactor = daysAttended > 0 ? toDecimal2(daysAttended / WORK_DAYS_PER_WEEK) : 0

    if (attendanceFactor === 0) {
      return { grossPieceRate: 0, grossHourly: 0, attendanceFactor: 0, grossEarnings: 0, totalDeduction: 0, netPayout: 0, daysAttended: 0 }
    }

    const grossPieceRate = getGrossEarnings(workerId, week)
    const grossHourly = getHourlyEarnings(workerId, week)
    const grossEarnings = toDecimal2((grossPieceRate + grossHourly) * attendanceFactor)
    const { totalDeduction } = getLoanDeductions(workerId, week)
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
    loans, requestLoan, getLoanDeductions,
    getDaysAttended,
    getGrossEarnings, getHourlyEarnings, calculateFinalPayout, weeklyPayrollSummary,
    payoutStatuses, getPayoutStatus, approvePayout, holdPayout,
    PLACEMENT_KEYS, HOURLY_MIN, HOURLY_MAX, toDecimal2,
  }
})
