<template>
  <div class="employee-portal">
    <!-- Sidebar -->
    <aside class="employee-sidebar">
      <div class="profile-section">
        <div class="op-avatar" :class="employee?.color">{{ employee?.avatar }}</div>
        <h2 class="op-name">{{ employee?.name }}</h2>
        <p class="op-role">{{ employee?.role }}</p>
      </div>

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
        <h1>My Dashboard</h1>
        <p>Production Week: {{ currentWeek }}</p>
      </header>

      <div class="dashboard-grid">
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

      <div class="action-section">
        <button class="btn-massive-action" @click="requestAdvance">
          <span class="material-symbols-rounded">account_balance_wallet</span>
          REQUEST CASH ADVANCE
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'

const router = useRouter()
const sysAuth = useSystemAuthStore()
const mesStore = useMesStore()
const payrollStore = usePayrollStore()

const currentWeek = computed(() => mesStore.currentProductionWeek)

// Get employee info
const employee = computed(() => {
  return mesStore.operators.find(op => op.id === sysAuth.currentEmployeeId)
})

// Calculate stats
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

function logout() {
  sysAuth.lockSystem()
  router.push({ name: 'WelcomeAuth' })
}

function requestAdvance() {
  router.push({ 
    name: 'CashAdvanceHub', 
    query: { requesterId: sysAuth.currentEmployeeId } 
  })
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

.employee-sidebar {
  width: 320px;
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
  margin-bottom: auto;
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

/* Base avatar colors matching operators */
.bg-rose-500 { background-color: #f43f5e; color: #fff; }
.bg-indigo-500 { background-color: #6366f1; color: #fff; }
.bg-emerald-500 { background-color: #10b981; color: #fff; }
.bg-amber-500 { background-color: #f59e0b; color: #fff; }
.bg-cyan-500 { background-color: #06b6d4; color: #fff; }
.bg-purple-500 { background-color: #a855f7; color: #fff; }
.bg-sky-500 { background-color: #0ea5e9; color: #fff; }
.bg-orange-500 { background-color: #f97316; color: #fff; }
.bg-teal-500 { background-color: #14b8a6; color: #fff; }

.op-name {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
}

.op-role {
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
}

.sidebar-actions {
  margin-top: 3rem;
}

.btn-logout {
  width: 100%;
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 2px solid #ef4444;
  border-radius: 1rem;
  font-size: 1.2rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: #ef4444;
  color: #fff;
}

.portal-main {
  flex: 1;
  padding: 3rem 4rem;
  overflow-y: auto;
}

.portal-header {
  margin-bottom: 3rem;
}

.portal-header h1 {
  font-size: 2.5rem;
  font-weight: 900;
  margin: 0 0 0.5rem 0;
}

.portal-header p {
  font-size: 1.1rem;
  color: #94a3b8;
  margin: 0;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
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
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon span {
  font-size: 2rem;
}

.card-icon.production { background: rgba(99,102,241,0.1); color: #818cf8; }
.card-icon.attendance { background: rgba(16,185,129,0.1); color: #34d399; }
.card-icon.financial { background: rgba(245,158,11,0.1); color: #fbbf24; }

.card-content h3 {
  font-size: 1rem;
  color: #94a3b8;
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 0.25rem;
}

.stat-value span {
  font-size: 1rem;
  color: #64748b;
  font-weight: 600;
}

.stat-subtext {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
}

.action-section {
  display: flex;
  justify-content: center;
}

.btn-massive-action {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border: none;
  padding: 2rem 4rem;
  font-size: 1.5rem;
  font-weight: 800;
  border-radius: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(16,185,129,0.3);
  transition: transform 0.1s;
}

.btn-massive-action:active {
  transform: scale(0.98);
}

.btn-massive-action span {
  font-size: 2rem;
}
</style>
