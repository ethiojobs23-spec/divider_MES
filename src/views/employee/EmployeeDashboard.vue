<template>
  <div class="employee-portal">
    <!-- Sidebar -->
    <aside class="employee-sidebar">
      <div class="profile-section">
        <div class="op-avatar" :class="employee?.color">{{ employee?.avatar }}</div>
        <h2 class="op-name">{{ employee?.name }}</h2>
        <p class="op-role">{{ employee?.role }}</p>
      </div>

      <nav class="portal-nav">
        <button class="nav-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
          <span class="material-symbols-rounded">dashboard</span> My Dashboard
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'cash-loan' }" @click="activeTab = 'cash-loan'">
          <span class="material-symbols-rounded">account_balance_wallet</span> Cash Loan
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'payment-request' }" @click="activeTab = 'payment-request'">
          <span class="material-symbols-rounded">payments</span> Payment Request
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'attendance' }" @click="activeTab = 'attendance'">
          <span class="material-symbols-rounded">how_to_reg</span> Attendance & Shift
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'production' }" @click="activeTab = 'production'">
          <span class="material-symbols-rounded">precision_manufacturing</span> Production Log
        </button>
      </nav>

      <div class="sidebar-actions">
        <button class="btn-logout" @click="logout">
          <span class="material-symbols-rounded">logout</span>
          LOG OUT
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="portal-main">
      <header class="portal-header">
        <h1>{{ tabTitles[activeTab] }}</h1>
        <p>Production Week: {{ currentWeek }}</p>
      </header>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="tab-content dashboard-grid">
        <!-- Card 1: My Production -->
        <div class="stat-card">
          <div class="card-icon production">
            <span class="material-symbols-rounded">precision_manufacturing</span>
          </div>
          <div class="card-content">
            <h3>My Production</h3>
            <div class="stat-value">{{ totalProduction }} <span>pcs</span></div>
            <p class="stat-subtext">Total dividers produced this week</p>
          </div>
        </div>

        <!-- Card 2: My Attendance -->
        <div class="stat-card">
          <div class="card-icon attendance">
            <span class="material-symbols-rounded">how_to_reg</span>
          </div>
          <div class="card-content">
            <h3>My Attendance</h3>
            <div class="stat-value">{{ daysAttended }} <span>/ 6 days</span></div>
            <p class="stat-subtext">Clocked in this week</p>
          </div>
        </div>

        <!-- Card 3: Financials -->
        <div class="stat-card">
          <div class="card-icon financial">
            <span class="material-symbols-rounded">payments</span>
          </div>
          <div class="card-content">
            <h3>Est. Earnings</h3>
            <div class="stat-value">{{ estimatedEarnings.toFixed(2) }} <span>ETB</span></div>
            <p class="stat-subtext">Estimated gross before deductions</p>
          </div>
        </div>
      </div>

      <!-- Cash Loan Tab -->
      <div v-if="activeTab === 'cash-loan'" class="tab-content split-layout">
         <div class="form-card">
           <h3>Request Cash Loan</h3>
           <div class="form-group">
             <label>Amount (ETB)</label>
             <VirtualNumpad v-model="cashLoanAmount" label="" />
           </div>
           <button class="btn-submit" :disabled="!cashLoanAmount" @click="submitCashLoan">Submit Request</button>
           <p v-if="cashLoanMessage" class="success-msg">{{ cashLoanMessage }}</p>
         </div>
         
         <div class="history-card">
           <h3>My Recent Loans</h3>
           <div class="history-list">
             <div v-for="loan in myLoans" :key="loan.id" class="history-item">
               <div class="history-left">
                 <span class="material-symbols-rounded history-icon">account_balance</span>
                 <div>
                   <span class="reason">Interest: {{ loan.interestRate }}%</span>
                   <span class="date">{{ new Date(loan.issuedAt).toLocaleDateString() }}</span>
                 </div>
               </div>
               <span class="amount">{{ loan.amount }} ETB</span>
             </div>
             <p v-if="!myLoans.length" class="empty-text">No recent loans logged.</p>
           </div>
         </div>
      </div>

      <!-- Payment Request Tab -->
      <div v-if="activeTab === 'payment-request'" class="tab-content split-layout">
         <div class="form-card">
           <h3>Request Payment / Advance</h3>
           <div class="form-group">
             <label>Amount (ETB)</label>
             <VirtualNumpad v-model="paymentAmount" label="" />
           </div>
           <div class="form-group">
             <label>Reason</label>
             <select v-model="paymentReason" class="input-field">
               <option>Weekly Advance</option>
               <option>Transport</option>
               <option>Emergency</option>
             </select>
           </div>
           <button class="btn-submit" :disabled="!paymentAmount" @click="submitPaymentRequest">Submit Request</button>
           <p v-if="paymentMessage" class="success-msg">{{ paymentMessage }}</p>
         </div>
         
         <div class="history-card">
           <h3>My Recent Payment Requests</h3>
           <div class="history-list">
             <div v-for="adv in myAdvances" :key="adv.id" class="history-item">
               <div class="history-left">
                 <span class="material-symbols-rounded history-icon">receipt_long</span>
                 <div>
                   <span class="reason">{{ adv.note || 'Advance' }}</span>
                   <span class="date">{{ new Date(adv.timestamp).toLocaleDateString() }}</span>
                 </div>
               </div>
               <span class="amount">{{ adv.amount }} ETB</span>
             </div>
             <p v-if="!myAdvances.length" class="empty-text">No recent payment requests logged.</p>
           </div>
         </div>
      </div>

      <!-- Attendance & Shift Tab -->
      <div v-if="activeTab === 'attendance'" class="tab-content centered-content">
        <div class="attendance-card">
          <h3>Current Shift Status</h3>
          <div class="status-indicator" :class="isClockedIn ? 'status--in' : 'status--out'">
            <span class="status-dot"></span>
            {{ isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT' }}
          </div>
          <p class="status-desc" v-if="isClockedIn">You are currently on shift. Remember to clock out when you finish!</p>
          <p class="status-desc" v-else>You are currently clocked out. Clock in to start tracking your time and piece-rate.</p>

          <div class="attendance-actions">
            <button v-if="!isClockedIn" class="btn-clock btn-clock--in" @click="clockIn">
              <span class="material-symbols-rounded">login</span> CLOCK IN NOW
            </button>
            <button v-else class="btn-clock btn-clock--out" @click="clockOut">
              <span class="material-symbols-rounded">logout</span> CLOCK OUT NOW
            </button>
          </div>
        </div>
      </div>

      <!-- Production Log Tab -->
      <div v-if="activeTab === 'production'" class="tab-content">
        <div class="production-list-card">
          <h3>My Production Entries ({{ currentWeek }})</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Size</th>
                <th>Placement</th>
                <th class="align-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in myProduction" :key="entry.id">
                <td>{{ new Date(entry.timestamp).toLocaleString([], {weekday: 'short', hour: '2-digit', minute:'2-digit'}) }}</td>
                <td>{{ entry.dividerType }}</td>
                <td>{{ entry.size }}</td>
                <td>{{ entry.placement || '—' }}</td>
                <td class="align-right"><strong>{{ entry.goodProduction }}</strong></td>
              </tr>
              <tr v-if="!myProduction.length"><td colspan="5" class="empty-text">No production logged yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'

const router = useRouter()
const sysAuth = useSystemAuthStore()
const mesStore = useMesStore()
const payrollStore = usePayrollStore()
const attStore = useAttendanceStore()

const currentWeek = computed(() => mesStore.currentProductionWeek)
const activeTab = ref('overview')

const tabTitles = {
  overview: 'My Dashboard',
  'cash-loan': 'Cash Loan',
  'payment-request': 'Payment Request',
  attendance: 'Attendance & Shift Management',
  production: 'My Production Log',
}

// Get employee info
const employee = computed(() => {
  return mesStore.operators.find(op => op.id === sysAuth.currentEmployeeId)
})

// ── Overview ──
const totalProduction = computed(() => {
  if (!employee.value) return 0
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reduce((sum, e) => sum + (Number(e.goodProduction) || 0), 0)
})

const daysAttended = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  return payrollStore.getDaysAttended(sysAuth.currentEmployeeId, currentWeek.value)
})

const estimatedEarnings = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  const grossPiece = payrollStore.getGrossEarnings(sysAuth.currentEmployeeId, currentWeek.value)
  const grossHourly = payrollStore.getHourlyEarnings(sysAuth.currentEmployeeId, currentWeek.value)
  return grossPiece + grossHourly
})

// ── Cash Loan ──
const cashLoanAmount = ref('')
const cashLoanMessage = ref('')

const myLoans = computed(() => {
  if (!employee.value) return []
  return payrollStore.loans.filter(l => l.workerId === employee.value.id).reverse()
})

function submitCashLoan() {
  if (!cashLoanAmount.value || !employee.value) return
  payrollStore.requestLoan(employee.value.id, currentWeek.value, Number(cashLoanAmount.value))
  cashLoanMessage.value = `Cash loan of ${cashLoanAmount.value} ETB requested successfully!`
  cashLoanAmount.value = ''
  setTimeout(() => { cashLoanMessage.value = '' }, 3000)
}

// ── Payment Request ──
const paymentAmount = ref('')
const paymentReason = ref('Weekly Advance')
const paymentMessage = ref('')

const myAdvances = computed(() => {
  if (!employee.value) return []
  return mesStore.cashEntries
    .filter(e => e.type === 'advance' && e.operator === employee.value.name)
    .reverse()
})

function submitPaymentRequest() {
  if (!paymentAmount.value || !employee.value) return
  mesStore.addCashEntry({
    type: 'pending_advance',
    amount: Number(paymentAmount.value),
    operator: employee.value.name,
    note: paymentReason.value,
  })
  paymentMessage.value = `Payment request of ${paymentAmount.value} ETB logged successfully!`
  paymentAmount.value = ''
  setTimeout(() => { paymentMessage.value = '' }, 3000)
}

// ── Attendance ──
const isClockedIn = computed(() => {
  if (!employee.value) return false
  return mesStore.isOperatorClockedIn(employee.value.id)
})

async function clockIn() {
  if (employee.value) {
    mesStore.clockIn(employee.value)
    await attStore.recordClockIn(employee.value)
  }
}

async function clockOut() {
  if (employee.value) {
    mesStore.clockOut(employee.value)
    try {
      const { supabase } = await import('@/lib/supabaseClient')
      await supabase.from('mes_attendance')
        .update({ clock_out: new Date().toISOString() })
        .eq('operator_id', employee.value.id)
        .is('clock_out', null)
    } catch (e) { /* ignore */ }
  }
}

// ── Production ──
const myProduction = computed(() => {
  if (!employee.value) return []
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reverse()
})

// ── Logout ──
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

/* Sidebar */
.employee-sidebar {
  width: 340px;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  padding: 3rem 2rem;
}

.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 3rem;
}

.op-avatar {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  font-size: 3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.op-name { font-size: 1.8rem; font-weight: 800; margin: 0 0 0.5rem 0; }
.op-role { font-size: 1rem; color: #94a3b8; margin: 0; }

.portal-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: transparent;
  color: #94a3b8;
  border: 1px solid transparent;
  border-radius: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.nav-btn span { font-size: 1.5rem; }
.nav-btn:hover {
  background: rgba(255,255,255,0.05);
  color: #e2e8f0;
}
.nav-btn.active {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.3);
  color: #818cf8;
}

.sidebar-actions { margin-top: auto; }

.btn-logout {
  width: 100%;
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 2px solid #ef4444;
  border-radius: 1rem;
  font-size: 1.1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-logout:hover { background: #ef4444; color: #fff; }

/* Main Content */
.portal-main {
  flex: 1;
  padding: 3rem 4rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.portal-header { margin-bottom: 3rem; }
.portal-header h1 { font-size: 2.5rem; font-weight: 900; margin: 0 0 0.5rem 0; color: #f8fafc; }
.portal-header p { font-size: 1.1rem; color: #94a3b8; margin: 0; }

.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}
.stat-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
}
.card-icon {
  width: 4rem; height: 4rem;
  border-radius: 1rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.card-icon span { font-size: 2rem; }
.card-icon.production { background: rgba(99,102,241,0.1); color: #818cf8; }
.card-icon.attendance { background: rgba(16,185,129,0.1); color: #34d399; }
.card-icon.financial { background: rgba(245,158,11,0.1); color: #fbbf24; }

.card-content h3 { font-size: 1rem; color: #94a3b8; margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 2.2rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.25rem; }
.stat-value span { font-size: 1rem; color: #64748b; font-weight: 600; }
.stat-subtext { font-size: 0.85rem; color: #64748b; margin: 0; }

/* Split Layout (Loans) */
.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
.form-card, .history-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2.5rem;
}
.form-card h3, .history-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-size: 0.9rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem; }
.input-field {
  width: 100%;
  padding: 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  color: #f1f5f9;
  font-size: 1.1rem;
  font-family: inherit;
}
.input-field:focus { outline: none; border-color: #6366f1; }

.btn-submit {
  width: 100%;
  padding: 1.25rem;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-submit:not(:disabled):hover { background: #059669; }

.success-msg { color: #34d399; font-weight: 600; margin-top: 1rem; text-align: center; }

.history-list { display: flex; flex-direction: column; gap: 1rem; }
.history-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem;
  background: rgba(255,255,255,0.03);
  border-radius: 0.75rem;
}
.history-left { display: flex; align-items: center; gap: 1rem; }
.history-icon { color: #fbbf24; background: rgba(245,158,11,0.1); padding: 0.5rem; border-radius: 0.5rem; }
.reason { display: block; font-weight: 600; color: #e2e8f0; font-size: 1.05rem; }
.date { display: block; font-size: 0.85rem; color: #64748b; }
.amount { font-weight: 800; color: #34d399; font-size: 1.1rem; }

/* Attendance Centered Content */
.centered-content {
  display: flex;
  justify-content: center;
}
.attendance-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 4rem;
  text-align: center;
  width: 100%;
  max-width: 600px;
}
.attendance-card h3 { font-size: 1.5rem; margin: 0 0 2rem 0; color: #f8fafc; }

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  border-radius: 999px;
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
}
.status-dot { width: 1rem; height: 1rem; border-radius: 50%; background: currentColor; }
.status--in { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
.status--out { background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }

.status-desc { font-size: 1.2rem; color: #cbd5e1; margin-bottom: 3rem; line-height: 1.5; }

.attendance-actions { display: flex; justify-content: center; }
.btn-clock {
  padding: 1.5rem 3rem;
  font-size: 1.25rem;
  font-weight: 800;
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s;
}
.btn-clock--in { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 10px 25px rgba(16,185,129,0.3); }
.btn-clock--in:active { transform: scale(0.95); }
.btn-clock--out { background: linear-gradient(135deg, #f43f5e, #e11d48); color: #fff; box-shadow: 0 10px 25px rgba(244,63,94,0.3); }
.btn-clock--out:active { transform: scale(0.95); }

/* Production Log Table */
.production-list-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2rem;
}
.production-list-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th, .data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.data-table th { color: #64748b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { color: #e2e8f0; font-size: 1.05rem; }
.align-right { text-align: right !important; }
.empty-text { text-align: center !important; color: #64748b !important; padding: 3rem !important; }

/* Colors */
.bg-rose-500 { background-color: #f43f5e; color: #fff; }
.bg-indigo-500 { background-color: #6366f1; color: #fff; }
.bg-emerald-500 { background-color: #10b981; color: #fff; }
.bg-amber-500 { background-color: #f59e0b; color: #fff; }
.bg-cyan-500 { background-color: #06b6d4; color: #fff; }
.bg-purple-500 { background-color: #a855f7; color: #fff; }
.bg-sky-500 { background-color: #0ea5e9; color: #fff; }
.bg-orange-500 { background-color: #f97316; color: #fff; }
.bg-teal-500 { background-color: #14b8a6; color: #fff; }
</style>
