import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMesStore } from './mesStore'

export const usePayrollStore = defineStore('payroll', () => {
  const mesStore = useMesStore()

  // Worker Profiles: { workerId: { paymentMethod, accountInfo, baseInterestRate } }
  const workerProfiles = ref({})
  
  // Loans: [{ id, workerId, week, amount, interestRate }]
  const loans = ref([])
  
  // Attendance: { week: { workerId: daysAttended } }
  const attendanceRecords = ref({})

  function setWorkerProfile(workerId, profileData) {
    workerProfiles.value[workerId] = { 
      ...workerProfiles.value[workerId], 
      ...profileData 
    }
  }

  function getWorkerProfile(workerId) {
    return workerProfiles.value[workerId] || { paymentMethod: 'Cash', accountInfo: '', baseInterestRate: 5 }
  }

  function requestLoan(workerId, week, amount) {
    const profile = getWorkerProfile(workerId)
    const interestRate = profile.baseInterestRate || 5
    loans.value.push({
      id: Date.now(),
      workerId,
      week,
      amount: Number(amount),
      interestRate: Number(interestRate)
    })
  }

  function setAttendance(workerId, week, days) {
    if (!attendanceRecords.value[week]) {
      attendanceRecords.value[week] = {}
    }
    attendanceRecords.value[week][workerId] = Number(days)
  }

  function getDaysAttended(workerId, week) {
    return attendanceRecords.value[week]?.[workerId] || 0
  }

  function getLoanDeductions(workerId, week) {
    const workerLoans = loans.value.filter(l => l.workerId === workerId && l.week === week)
    let principal = 0
    let interest = 0
    workerLoans.forEach(loan => {
      const loanInterest = loan.amount * (loan.interestRate / 100)
      principal += loan.amount
      interest += loanInterest
    })
    return { principal, interest, totalDeduction: principal + interest }
  }

  function getGrossEarnings(workerId, week) {
    const worker = mesStore.operators.find(o => o.id === workerId)
    if (!worker) return 0
    
    // In a real scenario we'd use the matrix pieceRates, but here we estimate
    // based on total good production of that operator in that week.
    const entries = mesStore.ledgerEntries.filter(e => e.operator === worker.name && e.week === week)
    const totalPcs = entries.reduce((sum, e) => sum + (Number(e.goodProduction) || 0), 0)
    
    // Assume average 2.5 ETB per piece
    return totalPcs * 2.50
  }

  function calculateFinalPayout(workerId, week) {
    const daysAttended = getDaysAttended(workerId, week)
    const attendanceBoolean = daysAttended > 0 ? 1 : 0
    
    if (attendanceBoolean === 0) {
      return 0
    }

    const grossEarnings = getGrossEarnings(workerId, week)
    const { totalDeduction } = getLoanDeductions(workerId, week)

    const netPayout = (grossEarnings * attendanceBoolean) - totalDeduction
    return Math.max(0, netPayout)
  }

  return {
    workerProfiles,
    loans,
    attendanceRecords,
    setWorkerProfile,
    getWorkerProfile,
    requestLoan,
    setAttendance,
    getDaysAttended,
    getLoanDeductions,
    getGrossEarnings,
    calculateFinalPayout
  }
})
