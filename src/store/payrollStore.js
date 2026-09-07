// Developer: Mintesnot Abebe | Brand: dev MinteIO
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

export const PLACEMENT_KEYS = (['ብተና', 'ውስጥ', 'የተለየ'])
export const HOURLY_MIN =  15
export const HOURLY_MAX =  30
export const WORK_DAYS_PER_WEEK = 6

export function toDecimal2(n) {
  if (!isFinite(n) || isNaN(n)) return 0
  return Math.round(n * 100) / 100
}

export const usePayrollStore = defineStore('payroll', () => {
  // ── O(1) Lookups & Memos ───────────────────────────────────────────
  const mesStore = useMesStore()
  const attStore = useAttendanceStore()
  
  const operatorsById = computed(() => {
    const map = {}
    mesStore.operators.forEach(op => { map[op.id] = op })
    return map
  })

  // Group ledger by `${operator_id}_${week}`
  const ledgerByOpWeek = computed(() => {
    const map = {}
    mesStore.ledgerEntries.forEach(e => {
      const key = `${e.operator_id}_${e.week}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  })

  // Group shift submissions
  const shiftsByOpWeek = computed(() => {
    const map = {}
    mesStore.shiftSubmissions.forEach(s => {
      const week = s.details?.week
      const key = `${s.operator_id}_${week}`
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  })

  // Group cash entries for advances
  const cashByOpWeek = computed(() => {
    const map = {}
    mesStore.cashEntries.forEach(e => {
      if (e.type !== 'advance') return
      const key = `${e.operator_id}_${e.week}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  })

  // Group payouts
  const payoutsByOpWeek = computed(() => {
    const map = {}
    mesStore.cashEntries.forEach(e => {
      if (e.type !== 'payout') return
      const week = e.week || (e.note ? JSON.parse(e.note || '{}').week : '')
      const key = `${e.operator_id}_${week}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  })

  // Group attendance
  const clockLogsByOpWeek = computed(() => {
    const map = {}
    attStore.clockInLog.forEach(e => {
      const key = `${e.operatorId}_${e.week}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  })


  // ── Profiles ────────────────────────────────────────────────────────
  const workerProfiles = ref({})
  const DEFAULT_PROFILE = {
    paymentMethod: 'Cash', accountInfo: '', baseInterestRate: 5,
    hourlyRate: HOURLY_MIN, isHourly: false, isPieceRate: true
  }

  function getWorkerProfile(workerId) {
    const op = operatorsById.value[workerId]
    const opConfig = op?.payroll_config || {}
    
    let isHourly = opConfig.isHourly || false
    let isPieceRate = opConfig.isPieceRate !== false
    let hourlyRate = opConfig.hourlyRate || HOURLY_MIN
    
    if (op?.work_types && Array.isArray(op.work_types.categories)) {
      isHourly = op.work_types.categories.includes('TIME')
      isPieceRate = op.work_types.categories.some(c => c !== 'TIME')
      if (op.work_types.hourly_rate) hourlyRate = op.work_types.hourly_rate
    }
    
    return { 
      ...DEFAULT_PROFILE, 
      ...opConfig, 
      ...workerProfiles.value[workerId],
      isHourly,
      isPieceRate,
      hourlyRate
    }
  }

  async function setWorkerProfile(workerId, profileData) {
    const incoming = { ...profileData }
    if ('hourlyRate' in incoming) {
      incoming.hourlyRate = Math.min(HOURLY_MAX, Math.max(HOURLY_MIN, Number(incoming.hourlyRate) || HOURLY_MIN))
    }
    const newProfile = { ...getWorkerProfile(workerId), ...incoming }
    workerProfiles.value[workerId] = newProfile

    try {
      const op = operatorsById.value[workerId]
      if (op) op.payroll_config = newProfile

      const { data: existing } = await supabase.from('mes_financial_ledger')
        .select('id, notes')
        .eq('operator_id', workerId)
        .eq('transaction_type', 'operator_config')
        .order('id', { ascending: true })
      
      let existingWorkTypes = op?.work_types || null
      let targetId = null
      const duplicateIds = []
      
      if (existing && existing.length > 0) {
        const latest = existing[existing.length - 1]
        targetId = latest.id
        for (let i = 0; i < existing.length - 1; i++) {
          duplicateIds.push(existing[i].id)
        }
        try {
          const parsed = JSON.parse(latest.notes)
          if (parsed.work_types) existingWorkTypes = parsed.work_types
        } catch (e) {}
      }

      const notesPayload = {
        payroll_config: newProfile,
        ...(existingWorkTypes ? { work_types: existingWorkTypes } : {})
      }
      const notes = JSON.stringify(notesPayload)

      if (targetId) {
        await supabase.from('mes_financial_ledger').update({ notes }).eq('id', targetId)
      } else {
        await supabase.from('mes_financial_ledger').insert([{
          operator_id: workerId, target_name: 'Config', transaction_type: 'operator_config',
          amount: 0, transaction_date: new Date().toISOString().split('T')[0], notes
        }])
      }

      if (duplicateIds.length > 0) {
        await supabase.from('mes_financial_ledger').delete().in('id', duplicateIds)
      }
    } catch (err) {
      console.error('[PayrollStore] setWorkerProfile failed to persist:', err)
    }
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
      console.warn('[PayrollStore] mes_bonuses disabled or not found:', err.message)
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
      console.warn('[PayrollStore] Could not persist bonus:', err.message)
    }
  }

  // ── Loans (installment-based) ────────────────────────────────────────────
  const loans = ref([])

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
      const { data, error } = await supabase.from('mes_loans').select('*').in('status', ['active', 'pending'])
      if (error) throw error
      if (data) loans.value = data.map(_rowToLoan)
    } catch (err) {
      console.error('[PayrollStore] Error fetching loans:', err)
    }
  }

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
        status:             'active',
      }
      const { data, error } = await supabase.from('mes_loans').insert(payload).select().single()
      if (error) throw error
      loans.value.push(_rowToLoan(data))
    } catch (err) {
      loans.value.push({
        id: `local-${Date.now()}`, workerId, week, amount: principal, interestRate,
        status: 'active', issuedAt: new Date().toISOString(), totalDebt,
        totalInstallments: safeWeeks, weeklyInstallment: weeklyAmt,
        remainingBalance: totalDebt, weeksRemaining: safeWeeks, paidWeeks: []
      })
    }
  }

  function getLoanDeductions(workerId, week) {
    const activeLoans = loans.value.filter(
      l => l.workerId === workerId && l.status === 'active' && l.remainingBalance > 0 && !l.paidWeeks.includes(week)
    )
    let totalInstallmentDeduction = 0
    const breakdown = []
    for (const loan of activeLoans) {
      const thisWeekAmt = toDecimal2(Math.min(loan.weeklyInstallment, loan.remainingBalance))
      totalInstallmentDeduction += thisWeekAmt
      breakdown.push({
        loanId: loan.id, deduction: thisWeekAmt, remaining: toDecimal2(loan.remainingBalance - thisWeekAmt),
        weeklyInstallment: loan.weeklyInstallment, totalInstallments: loan.totalInstallments,
        weeksRemaining: loan.weeksRemaining, totalDebt: loan.totalDebt,
      })
    }
    return { totalDeduction: toDecimal2(totalInstallmentDeduction), breakdown }
  }

  async function collectLoanInstallments(workerId, week) {
    const activeLoans = loans.value.filter(
      l => l.workerId === workerId && l.status === 'active' && l.remainingBalance > 0 && !l.paidWeeks.includes(week)
    )
    for (const loan of activeLoans) {
      const thisWeekAmt   = toDecimal2(Math.min(loan.weeklyInstallment, loan.remainingBalance))
      const newBalance    = toDecimal2(loan.remainingBalance - thisWeekAmt)
      const newPaidWeeks  = [...loan.paidWeeks, week]
      const newStatus     = newBalance <= 0 ? 'closed' : 'active'

      loan.remainingBalance = newBalance
      loan.paidWeeks        = newPaidWeeks
      loan.weeksRemaining   = newBalance <= 0 ? 0 : Math.ceil(newBalance / loan.weeklyInstallment)
      loan.status           = newStatus

      try {
        await supabase.from('mes_loans').update({
          remaining_balance: newBalance, paid_weeks: JSON.stringify(newPaidWeeks), status: newStatus
        }).eq('id', loan.id)
      } catch (err) {}
    }
  }

  function getAdvanceDeductions(workerId, week) {
    const entries = cashByOpWeek.value[`${workerId}_${week}`] || []
    const total = entries.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0)
    return { totalDeduction: toDecimal2(total) }
  }

  async function approveLoan(loanId) {
    try {
      const { error } = await supabase.from('mes_loans').update({ status: 'active' }).eq('id', loanId)
      if (error) throw error
      const loan = loans.value.find(l => l.id === loanId)
      if (loan) loan.status = 'active'
    } catch (err) {}
  }

  async function rejectLoan(loanId) {
    try {
      const { error } = await supabase.from('mes_loans').update({ status: 'rejected' }).eq('id', loanId)
      if (error) throw error
      const loan = loans.value.find(l => l.id === loanId)
      if (loan) loan.status = 'rejected'
    } catch (err) {}
  }

  // ── Gross Earnings ────────────────────────────────────────────────────────
  function getGrossEarnings(workerId, week) {
    const profile = getWorkerProfile(workerId)
    if (!profile.isPieceRate) return 0
    const entries = ledgerByOpWeek.value[`${workerId}_${week}`] || []
    
    let gross = 0
    for (const entry of entries) {
      // Skip TIME category to avoid double paying piece-rate + hourly for the same entry
      if (entry.workCategory === 'TIME') continue 
      const qty = Number(entry.goodProduction) || 0
      if (qty <= 0) continue
      gross += mesStore.calculateEntryEarnings(entry, workerId)
    }
    return toDecimal2(gross)
  }

  function getExactHoursWorked(workerId, week) {
    const entries = clockLogsByOpWeek.value[`${workerId}_${week}`] || []
    let totalMinutes = 0
    for (const entry of entries) {
      if (entry.timestamp && entry.clockOut) {
        const start = new Date(entry.timestamp).getTime()
        const end = new Date(entry.clockOut).getTime()
        const diffMins = (end - start) / 60000
        if (diffMins > 0 && diffMins < 1440) totalMinutes += diffMins
      }
    }
    return totalMinutes / 60
  }

  function getHourlyEarnings(workerId, week) {
    const profile = getWorkerProfile(workerId)
    if (!profile.isHourly) return 0
    const rate = Math.min(HOURLY_MAX, Math.max(HOURLY_MIN, profile.hourlyRate))
    const exactHours = getExactHoursWorked(workerId, week)
    return toDecimal2(exactHours * rate)
  }
  
  function getDaysAttended(workerId, week) {
    const entries = clockLogsByOpWeek.value[`${workerId}_${week}`] || []
    const uniqueDays = new Set(entries.map(e => e.shiftDate))
    return uniqueDays.size
  }

  function getShiftBreakdown(workerId, week) {
    // 1. Shift Submissions
    const shifts = (shiftsByOpWeek.value[`${workerId}_${week}`] || []).map(s => {
      const entries = (s.details?.entries || []).map(e => {
        const rate = mesStore.getEntryRate(e)
        const earnings = mesStore.calculateEntryEarnings(e, workerId)
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
    }).sort((a, b) => new Date(a.date) - new Date(b.date))
      
    if (shifts.length > 0) return shifts

    // 2. Fallback to raw ledger entries
    const rawEntries = ledgerByOpWeek.value[`${workerId}_${week}`] || []
    if (rawEntries.length === 0) return []
    
    const byDate = {}
    for (const entry of rawEntries) {
      const date = entry.productionDate ? entry.productionDate.split('T')[0] : entry.timestamp.split('T')[0]
      if (!byDate[date]) byDate[date] = []
      byDate[date].push(entry)
    }
    
    const fallbackShifts = []
    for (const date in byDate) {
      const entries = byDate[date].map(e => {
        const rate = mesStore.getEntryRate(e)
        const good = Number(e.goodProduction) || 0
        const earnings = mesStore.calculateEntryEarnings(e, workerId)
        return {
          workCategory: e.workCategory,
          dividerType: e.dividerType,
          placement: e.placement,
          size: e.size,
          good,
          hoursWorked: e.hoursWorked,
          rate,
          earnings
        }
      })
      const shiftGood = entries.reduce((sum, e) => sum + (e.workCategory !== 'TIME' ? e.good : 0), 0)
      const shiftEarnings = entries.reduce((sum, e) => sum + e.earnings, 0)
      
      fallbackShifts.push({
        date, status: 'raw-ledger', shiftGood, shiftWaste: 0, shiftEarnings: toDecimal2(shiftEarnings), entries
      })
    }
    
    return fallbackShifts.sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  function calculateFinalPayout(workerId, week) {
    const daysAttended = getDaysAttended(workerId, week)
    const attendanceFactor = WORK_DAYS_PER_WEEK > 0 ? toDecimal2(daysAttended / WORK_DAYS_PER_WEEK) : 0

    // Piece-rate
    const approvedShifts = (shiftsByOpWeek.value[`${workerId}_${week}`] || []).filter(s => s.target_name === 'approved')
    let grossPieceRate = 0
    if (approvedShifts.length > 0) {
      grossPieceRate = toDecimal2(approvedShifts.reduce((sum, s) => {
        const entries = s.details?.entries || []
        return sum + entries.reduce((es, e) => es + mesStore.calculateEntryEarnings(e, workerId), 0)
      }, 0))
    } else {
      grossPieceRate = getGrossEarnings(workerId, week)
    }

    const grossHourly   = getHourlyEarnings(workerId, week)
    const grossEarnings = toDecimal2(grossPieceRate + grossHourly)

    // Deductions
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
    if (payoutStatuses.value[week]?.[workerId]) return payoutStatuses.value[week][workerId]
    
    const existingPayouts = payoutsByOpWeek.value[`${workerId}_${week}`] || []
    if (existingPayouts.length > 0) {
      const p = existingPayouts[0]
      return { status: 'approved', reason: 'Paid on ' + (p.timestamp ? p.timestamp.split('T')[0] : 'Ledger') }
    }
    return { status: 'pending', reason: '' }
  }

  async function approvePayout(workerId, week) {
    const currentStatuses = { ...payoutStatuses.value }
    if (!currentStatuses[week]) currentStatuses[week] = {}
    currentStatuses[week] = { ...currentStatuses[week], [workerId]: { status: 'approved', reason: '' } }
    payoutStatuses.value = currentStatuses

    await collectLoanInstallments(workerId, week)

    const payoutDetails = calculateFinalPayout(workerId, week)
    if (payoutDetails.netPayout > 0) {
      const worker    = operatorsById.value[workerId]
      const profile   = getWorkerProfile(workerId)
      const bonusInfo = getBonus(workerId, week)

      const payloadNote = JSON.stringify({
        week, paymentMethod: profile.paymentMethod || 'Cash', accountInfo: profile.accountInfo || '',
        grossPieceRate: payoutDetails.grossPieceRate || 0, grossHourly: payoutDetails.grossHourly || 0,
        grossEarnings: payoutDetails.grossEarnings || 0, totalDeduction: payoutDetails.totalDeduction || 0,
        bonus: bonusInfo.amount || 0, bonusReason: bonusInfo.reason || '', netPayout: payoutDetails.netPayout,
        purpose: `Weekly Production Settlement (${week})`
      })

      await mesStore.addCashEntry({
        operator_id: workerId, operator: worker?.name || 'Unknown', type: 'payout',
        amount: payoutDetails.netPayout, note: payloadNote
      })
    }
  }

  function holdPayout(workerId, week, reason) {
    const currentStatuses = { ...payoutStatuses.value }
    if (!currentStatuses[week]) currentStatuses[week] = {}
    currentStatuses[week] = { ...currentStatuses[week], [workerId]: { status: 'held', reason: reason || 'Disputed' } }
    payoutStatuses.value = currentStatuses
  }

  const weeklyPayrollSummary = computed(() => {
    const week = mesStore.currentProductionWeek
    return mesStore.operators.map(op => {
      const profile = getWorkerProfile(op.id)
      return {
        ...op,
        paymentMethod: profile.paymentMethod || op.payment_preference || 'Cash',
        payment_preference: profile.paymentMethod || op.payment_preference || 'Cash',
        accountInfo: profile.accountInfo || op.account_number || '',
        account_number: profile.accountInfo || op.account_number || '',
        ...calculateFinalPayout(op.id, week),
        payoutStatus: getPayoutStatus(op.id, week),
      }
    })
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
}, {
  persist: {
    key: 'divider-payroll-store',
    pick: ['workerProfiles', 'bonuses', 'loans', 'payoutStatuses'],
  },
})
