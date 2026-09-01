<template>
  <div class="employee-portal">
    <!-- Modular Sidebar -->
    <EmployeeSidebar 
      :employee="employee" 
      :active-tab="activeTab" 
      :pending-submission="pendingSubmission" 
      @update:active-tab="activeTab = $event" 
      @logout="logout" 
    />

    <!-- Main Content -->
    <main class="portal-main">
      <header class="portal-header flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1>{{ tabTitles[activeTab] || 'Employee Portal' }}</h1>
          <p>Production Week: {{ currentWeek }} &bull; {{ employee?.name ?? 'Worker' }}</p>
        </div>

        <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync my portal data now">
          <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
          <span>{{ isSyncing ? 'Syncing...' : 'Sync Data' }}</span>
        </button>
      </header>

      <!-- Section Components -->
      <TabProfileSettings 
        v-if="activeTab === 'profile-settings'" 
        :employee="employee" 
      />

      <TabOverview 
        v-else-if="activeTab === 'overview'" 
        :employee="employee"
        :employee-payroll-config="employeePayrollConfig"
        :total-production="totalProduction"
        :total-hours="totalHours"
        :days-attended="daysAttended"
        :estimated-earnings="estimatedEarnings"
      />

      <TabCashLoan 
        v-else-if="activeTab === 'cash-loan'" 
        :is-clocked-in="isClockedIn"
        :loans="myLoans"
        :message="cashLoanMessage"
        @open-pin-modal="handleOpenPinModal"
      />

      <TabPaymentRequest 
        v-else-if="activeTab === 'payment-request'" 
        :is-clocked-in="isClockedIn"
        :advances="myAdvances"
        :message="paymentMessage"
        @open-pin-modal="handleOpenPinModal"
      />

      <TabAttendance 
        v-else-if="activeTab === 'attendance'" 
        :employee="employee"
        :is-clocked-in="isClockedIn"
        @clock-in="clockIn"
        @clock-out="clockOut"
      />

      <TabProduction 
        v-else-if="activeTab === 'production'" 
        :entries="myProduction"
        :current-week="currentWeek"
      />

      <TabShiftSubmit 
        v-else-if="activeTab === 'shift-submit'" 
        :is-time-worker="isTimeWorker"
        :is-piece-rate-worker="isPieceRateWorker"
        :today-attendance-record="todayAttendanceRecord"
        :today-hours="todayHours"
        :today-good="todayGood"
        :today-waste="todayWaste"
        :today-earnings="todayEarnings"
        :today-entries="todayEntries"
        :employee-payroll-config="employeePayrollConfig"
        :already-submitted-today="alreadySubmittedToday"
        :can-submit-shift="canSubmitShift"
        :is-submitting="isSubmitting"
        :submit-message="submitMessage"
        :my-submissions="mySubmissions"
        @submit-today-shift="submitTodayShift"
      />

      <TabPayrollHistory 
        v-else-if="activeTab === 'payroll-history'" 
        :payouts="myPayouts" 
      />
    </main>

    <!-- Employee PIN Modal -->
    <PinModal
      v-if="pinModal.show"
      :title="pinModal.mode === 'loan' ? 'Confirm Loan Request' : 'Confirm Payment Request'"
      :subtitle="`Enter your PIN to request ${pinModal.mode === 'loan' ? pinModal.amount + ' ETB loan' : pinModal.amount + ' ETB payment'}`"
      icon="lock"
      icon-color="#6366f1"
      confirm-label="Submit Request"
      :error-msg="pinModal.error"
      :loading="pinModal.loading"
      @confirm="handlePinConfirm"
      @cancel="pinModal.show = false"
    />

    <!-- Admin Override PIN Modal -->
    <PinModal
      v-if="adminOverrideModal.show"
      title="Admin Authorization"
      :subtitle="adminOverrideModal.action === 'clockIn' ? 'Override required for late/early Clock In' : 'Override required for late/early Clock Out'"
      icon="admin_panel_settings"
      icon-color="#f59e0b"
      confirm-label="Authorize"
      confirm-color="linear-gradient(135deg,#d97706,#f59e0b)"
      :error-msg="adminOverrideModal.error"
      :loading="adminOverrideModal.loading"
      @confirm="handleAdminOverride"
      @cancel="adminOverrideModal.show = false"
    />
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'

// Section Sub-Components
import EmployeeSidebar from './components/EmployeeSidebar.vue'
import TabProfileSettings from './components/TabProfileSettings.vue'
import TabOverview from './components/TabOverview.vue'
import TabCashLoan from './components/TabCashLoan.vue'
import TabPaymentRequest from './components/TabPaymentRequest.vue'
import TabAttendance from './components/TabAttendance.vue'
import TabProduction from './components/TabProduction.vue'
import TabShiftSubmit from './components/TabShiftSubmit.vue'
import TabPayrollHistory from './components/TabPayrollHistory.vue'
import PinModal from '@/components/ui/PinModal.vue'

const router = useRouter()
const sysAuth = useSystemAuthStore()
const mesStore = useMesStore()
const payrollStore = usePayrollStore()
const attStore = useAttendanceStore()

const currentWeek = computed(() => mesStore.currentProductionWeek)
const activeTab = ref('overview')
const isSyncing = ref(false)
let refreshTimer = null

async function manualSync() {
  isSyncing.value = true
  try {
    await Promise.all([
      mesStore.fetchInitialData(),
      payrollStore.fetchLoans(),
      attStore.loadAttendanceLogs()
    ])
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await Promise.all([
    mesStore.fetchInitialData(),
    payrollStore.fetchLoans(),
    attStore.loadAttendanceLogs()
  ])

  refreshTimer = setInterval(async () => {
    await Promise.all([
      mesStore.fetchInitialData(),
      payrollStore.fetchLoans(),
      attStore.loadAttendanceLogs()
    ])
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const tabTitles = {
  overview: 'My Dashboard',
  'cash-loan': 'Cash Loan',
  'payment-request': 'Payment Request',
  'payroll-history': 'My Payroll History',
  attendance: 'Attendance & Shift Management',
  production: 'My Production Log',
  'shift-submit': 'Submit My Shift',
  'profile-settings': 'Profile Settings'
}

// ─── Employee Info ───────────────────────────────────────────────────────────
const employee = computed(() => {
  return mesStore.operators.find(op => op.id === sysAuth.currentEmployeeId)
})

const employeePayrollConfig = computed(() => {
  if (!employee.value) return null
  return payrollStore.getWorkerProfile(employee.value.id)
})

// ─── Overview Calculations ───────────────────────────────────────────────────
const totalProduction = computed(() => {
  if (!employee.value) return 0
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reduce((sum, e) => sum + (Number(e.goodProduction) || 0), 0)
})

const totalHours = computed(() => {
  if (!employee.value) return 0
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reduce((sum, e) => sum + (Number(e.hoursWorked) || 0), 0)
})

const daysAttended = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  return payrollStore.getDaysAttended(sysAuth.currentEmployeeId, currentWeek.value)
})

const grossPiece = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  return payrollStore.getGrossEarnings(sysAuth.currentEmployeeId, currentWeek.value)
})

const grossHourly = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  return payrollStore.getHourlyEarnings(sysAuth.currentEmployeeId, currentWeek.value)
})

const estimatedEarnings = computed(() => {
  return Number(grossPiece.value) + Number(grossHourly.value)
})

// ─── Cash Loans & Payment Requests ──────────────────────────────────────────
const cashLoanMessage = ref('')
const paymentMessage = ref('')

const myLoans = computed(() => {
  if (!employee.value) return []
  return payrollStore.loans.filter(l => l.workerId === employee.value.id).reverse()
})

const myAdvances = computed(() => {
  if (!employee.value) return []
  return mesStore.cashEntries
    .filter(e => (e.type === 'advance' || e.type === 'pending_advance' || e.type === 'rejected_advance') && (e.operator_id === employee.value.id || e.operator === employee.value.name))
    .reverse()
})

const myPayouts = computed(() => {
  if (!employee.value) return []
  return mesStore.cashEntries
    .filter(e => e.type === 'payout' && (e.operator_id === employee.value.id || e.operator === employee.value.name))
    .reverse()
})

// ─── PIN Modal Orchestration ────────────────────────────────────────────────
const pinModal = ref({ show: false, mode: '', amount: '', reason: '', error: '', loading: false, resetCallback: null })

function handleOpenPinModal({ mode, amount, reason, resetAmount }) {
  pinModal.value = {
    show: true,
    mode,
    amount,
    reason: reason || 'Weekly Advance',
    error: '',
    loading: false,
    resetCallback: resetAmount
  }
}

async function handlePinConfirm(pin) {
  const op = employee.value
  if (!op) return
  if (String(op.pin_code) !== String(pin)) {
    pinModal.value.error = 'Incorrect PIN. Please try again.'
    return
  }
  pinModal.value.loading = true
  if (pinModal.value.mode === 'loan') {
    payrollStore.requestLoan(op.id, currentWeek.value, Number(pinModal.value.amount))
    cashLoanMessage.value = `Cash loan of ${pinModal.value.amount} ETB requested successfully!`
    if (typeof pinModal.value.resetCallback === 'function') pinModal.value.resetCallback()
    setTimeout(() => { cashLoanMessage.value = '' }, 3000)
  } else if (pinModal.value.mode === 'payment') {
    mesStore.addCashEntry({
      type: 'pending_advance',
      amount: Number(pinModal.value.amount),
      operator: op.name,
      note: pinModal.value.reason,
    })
    paymentMessage.value = `Payment request of ${pinModal.value.amount} ETB submitted!`
    if (typeof pinModal.value.resetCallback === 'function') pinModal.value.resetCallback()
    setTimeout(() => { paymentMessage.value = '' }, 3000)
  }
  pinModal.value = { show: false, mode: '', amount: '', reason: '', error: '', loading: false, resetCallback: null }
}

// ─── Attendance & Shift ──────────────────────────────────────────────────────
const isClockedIn = computed(() => {
  if (!employee.value) return false
  return mesStore.isOperatorClockedIn(employee.value.id)
})

const adminOverrideModal = ref({ show: false, action: '', error: '', loading: false })

async function clockIn() {
  if (!employee.value) return
  const val = attStore.validateClockTime('in')
  if (!val.allowed) {
    adminOverrideModal.value = { show: true, action: 'clockIn', error: '', loading: false }
    return
  }
  await executeClockIn(false)
}

async function clockOut() {
  if (!employee.value) return
  const val = attStore.validateClockTime('out')
  if (!val.allowed) {
    adminOverrideModal.value = { show: true, action: 'clockOut', error: '', loading: false }
    return
  }
  await executeClockOut(false)
}

async function handleAdminOverride(pin) {
  const adminRoles = ['admin', 'System Admin', 'manager', 'Supervisor']
  const admin = mesStore.operators.find(o => String(o.pin_code) === String(pin) && adminRoles.includes(o.role))
  const sysAuthCheck = await sysAuth.verifyPin(pin, 'admin')

  if (!admin && !sysAuthCheck.success) {
    adminOverrideModal.value.error = 'Invalid Admin/Supervisor PIN. Try again.'
    return
  }
  
  adminOverrideModal.value.loading = true
  if (adminOverrideModal.value.action === 'clockIn') {
    await executeClockIn(true)
  } else {
    await executeClockOut(true)
  }
  adminOverrideModal.value.loading = false
  adminOverrideModal.value.show = false
}

async function executeClockIn(adminOverride = false) {
  if (employee.value) {
    mesStore.clockIn(employee.value)
    try {
      await attStore.recordClockIn(employee.value, adminOverride)
    } catch (e) {
      console.error('Clock in error:', e)
    }
  }
}

async function executeClockOut(adminOverride = false) {
  if (employee.value) {
    mesStore.clockOut(employee.value)
    try {
      const outTime = new Date().toISOString()
      await supabase.from('mes_attendance')
        .update({ clock_out: outTime })
        .eq('operator_id', employee.value.id)
        .is('clock_out', null)
        
      const logEntry = attStore.clockInLog.find(log => log.operatorId === employee.value.id && !log.clockOut)
      if (logEntry) {
        logEntry.clockOut = outTime
      }
    } catch (e) { /* ignore */ }
  }
}

// ─── Production & Shift Submissions ──────────────────────────────────────────
const myProduction = computed(() => {
  if (!employee.value) return []
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reverse()
})

const todayEntries = computed(() => {
  if (!employee.value) return []
  const today = new Date().toISOString().split('T')[0]
  return mesStore.ledgerEntries.filter(e => {
    return e.operator === employee.value.name &&
      new Date(e.timestamp).toISOString().split('T')[0] === today
  })
})

const todayAttendanceRecord = computed(() => {
  if (!employee.value) return null
  const today = new Date().toISOString().split('T')[0]
  return attStore.clockInLog.find(log =>
    String(log.operatorId) === String(employee.value.id) && log.shiftDate === today
  ) || null
})

const todayHoursFromClock = computed(() => {
  const rec = todayAttendanceRecord.value
  if (!rec || !rec.timestamp) return 0
  const end = rec.clockOut ? new Date(rec.clockOut) : new Date()
  const diffMs = end - new Date(rec.timestamp)
  return Math.max(0, Math.round((diffMs / 3600000) * 100) / 100)
})

const isTimeWorker = computed(() => {
  const cats = employee.value?.work_types?.categories || []
  return cats.includes('TIME')
})
const isPieceRateWorker = computed(() => {
  const cats = employee.value?.work_types?.categories || []
  return cats.some(c => c !== 'TIME') || cats.length === 0
})

const todayGood = computed(() => todayEntries.value.reduce((s,e) => s + (Number(e.goodProduction)||0), 0))
const todayHours = computed(() => isTimeWorker.value ? todayHoursFromClock.value : todayEntries.value.reduce((s,e) => s + (Number(e.hoursWorked)||0), 0))
const todayWaste = computed(() => todayEntries.value.reduce((s,e) => s + (Number(e.wasteMaterial)||0), 0))
const todayEarnings = computed(() => {
  let total = 0
  if (isTimeWorker.value) {
    const rate = Number(employee.value?.work_types?.hourly_rate || employeePayrollConfig.value?.hourlyRate || 0)
    total += todayHoursFromClock.value * rate
  }
  if (isPieceRateWorker.value) {
    todayEntries.value.forEach(e => {
      if ((e.workCategory || 'MFG') !== 'TIME') {
        total += mesStore.calculateEntryEarnings(e, employee.value.id)
      }
    })
  }
  return total.toFixed(2)
})

const canSubmitShift = computed(() => {
  if (isTimeWorker.value && todayAttendanceRecord.value) return true
  if (isPieceRateWorker.value && todayEntries.value.length > 0) return true
  return false
})

const mySubmissions = computed(() => {
  if (!employee.value) return []
  return mesStore.shiftSubmissions
    .filter(s => s.operator_id === employee.value.id)
    .sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date))
})

const alreadySubmittedToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return mySubmissions.value.find(s => s.transaction_date === today) || null
})

const pendingSubmission = computed(() => alreadySubmittedToday.value?.target_name === 'pending')

const isSubmitting = ref(false)
const submitMessage = ref('')

async function submitTodayShift() {
  if (!employee.value || isSubmitting.value) return
  isSubmitting.value = true
  const result = await mesStore.submitShift(employee.value.id, employee.value.name)
  isSubmitting.value = false
  if (result.ok) {
    if (result.isTimeWorker) {
      submitMessage.value = `✓ Shift submitted! ${result.hoursWorkedToday}h worked · ETB ${result.totalEarnings} est. earnings. Awaiting admin approval.`
    } else {
      submitMessage.value = `✓ Shift submitted! ${result.totalGood} pcs good · ETB ${result.totalEarnings} est. earnings. Awaiting admin approval.`
    }
    setTimeout(() => { submitMessage.value = '' }, 5000)
  } else {
    submitMessage.value = '⚠ Submission failed. Please try again.'
    setTimeout(() => { submitMessage.value = '' }, 3000)
  }
}

// ─── Logout ──────────────────────────────────────────────────────────────────
function logout() {
  sysAuth.lockSystem()
  router.push({ name: 'WelcomeAuth' })
}
</script>

<style scoped>
.employee-portal {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
}

.portal-main {
  flex: 1;
  padding: 3rem 4rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.portal-header { margin-bottom: 2.5rem; }
.portal-header h1 { font-size: 2.4rem; font-weight: 900; margin: 0 0 0.5rem 0; color: #f8fafc; }
.portal-header p { font-size: 1.05rem; color: #94a3b8; margin: 0; }

@media (max-width: 768px) {
  .employee-portal {
    flex-direction: column;
    height: auto;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    padding-bottom: 4rem;
  }
  .portal-main {
    padding: 1.25rem 1rem 4rem 1rem;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
  .portal-header { margin-bottom: 1.5rem; }
  .portal-header h1 { font-size: 1.75rem; }
}

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.5rem 0.9rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
