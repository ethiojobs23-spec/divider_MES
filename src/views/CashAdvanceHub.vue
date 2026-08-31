<template>
  <AppLayout>
    <!-- MAIN: Input Area -->
    <main class="cash-main">
      <nav class="settings-top-nav flex justify-between items-center flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'new'}" @click="activeTab = 'new'">
            <span class="material-symbols-rounded snav-icon">add_circle</span>
            <span class="snav-label">New Entry</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'pending'}" @click="activeTab = 'pending'">
            <span class="material-symbols-rounded snav-icon">pending_actions</span>
            <span class="snav-label">Pending Approvals</span>
            <span class="badge" v-if="pendingCount > 0">{{ pendingCount }}</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'history'}" @click="activeTab = 'history'">
            <span class="material-symbols-rounded snav-icon">history</span>
            <span class="snav-label">History</span>
          </button>
        </div>

        <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync cash & loans now">
          <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
          <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
        </button>
      </nav>

      <!-- NEW ENTRY TAB -->
      <div v-if="activeTab === 'new'" class="tab-panel">
        
        <!-- Entry Type Switcher -->
        <div class="entry-type-row mb-4">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">1. Select Entry Type</label>
          <div class="flex gap-2">
            <button
              class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2"
              :class="entryType === 'advance' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-slate-900 border-white/5 text-slate-400'"
              @click="entryType = 'advance'"
            >
              <span class="material-symbols-rounded text-base">payments</span>
              Operator Advance
            </button>
            <button
              class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2"
              :class="entryType === 'expense' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-500/10' : 'bg-slate-900 border-white/5 text-slate-400'"
              @click="entryType = 'expense'"
            >
              <span class="material-symbols-rounded text-base">receipt</span>
              Company Expense
            </button>
          </div>
        </div>

        <!-- Operator Selection (if Advance) -->
        <div v-if="entryType === 'advance'" class="operator-select-row mb-4">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">2. Select Operator / Beneficiary</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-900/50 rounded-xl border border-white/5">
            <button
              v-for="op in store.operators.filter(o => o.role !== 'customer')"
              :key="op.id"
              class="flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all"
              :class="selectedOp?.id === op.id ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'"
              @click="selectedOp = op"
            >
              <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold m-0 truncate">{{ op.name }}</p>
                <p class="text-[0.65rem] text-slate-500 m-0">{{ op.role }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Quick Presets -->
        <div class="presets-row">
          <p class="presets-label">{{ entryType === 'advance' ? '3. Quick Amount' : '2. Quick Amount' }}</p>
          <div class="presets">
            <button
              v-for="preset in presets"
              :key="preset"
              class="preset-btn cursor-pointer"
              @click="inputAmount = String(preset)"
            >{{ preset }} ETB</button>
          </div>
        </div>

        <!-- Numpad -->
        <div class="cash-numpad">
          <VirtualNumpad
            label="Amount (ETB)"
            v-model="inputAmount"
            :allowDecimal="true"
          />
        </div>

        <!-- Note input -->
        <div class="note-row">
          <p class="note-label">{{ entryType === 'advance' ? '4. Reason / Note' : '3. Expense Description' }}</p>
          <div class="note-chips">
            <button
              v-for="n in (entryType === 'advance' ? advanceNoteOptions : expenseNoteOptions)"
              :key="n"
              class="note-chip cursor-pointer"
              :class="{ 'note-chip--active': note === n }"
              @click="note = n"
            >{{ n }}</button>
          </div>
          <input
            v-model="customNote"
            type="text"
            placeholder="Or type custom description..."
            class="w-full mt-2 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-400"
          />
        </div>

        <!-- Submit -->
        <button
          class="submit-btn cursor-pointer mt-4"
          :disabled="!canSubmit || isSaving"
          @click="submitEntry"
        >
          <span class="material-symbols-rounded">payments</span>
          {{ isSaving ? 'SAVING...' : `LOG ${entryType === 'advance' ? 'ADVANCE' : 'EXPENSE'}` }}
          {{ inputAmount ? `– ${Number(inputAmount).toFixed(2)} ETB` : '' }}
        </button>

        <!-- Toast -->
        <Transition name="toast">
          <div v-if="toast.visible" class="toast">
            <span class="material-symbols-rounded">check_circle</span>
            {{ toast.message }}
          </div>
        </Transition>
      </div>

      <!-- PENDING APPROVALS TAB -->
      <div v-if="activeTab === 'pending'" class="tab-panel approvals-panel">
        <h3 class="panel-heading">Pending Requests ({{ pendingCount }})</h3>
        <div class="pending-list">
          <!-- Pending Loans -->
          <div v-for="loan in pendingLoans" :key="'loan-'+loan.id" class="pending-item">
            <div class="pending-info">
              <span class="material-symbols-rounded icon-loan">account_balance</span>
              <div>
                <p class="p-title">Loan Request • <strong>{{ loan.amount }} ETB</strong></p>
                <p class="p-sub">Requested by: <strong>{{ getOperatorName(loan.workerId) }}</strong> (Efficiency: <strong :class="getEfficiencyColor(getOperatorEfficiency(loan.workerId))">{{ getOperatorEfficiency(loan.workerId) }}%</strong>)</p>
              </div>
            </div>
            <div class="pending-actions">
              <button class="btn-approve cursor-pointer" @click="handleApproveLoan(loan.id)"><span class="material-symbols-rounded">check</span></button>
              <button class="btn-reject cursor-pointer" @click="handleRejectLoan(loan.id)"><span class="material-symbols-rounded">close</span></button>
            </div>
          </div>

          <!-- Pending Payment Requests (Advances) -->
          <div v-for="adv in pendingAdvances" :key="'adv-'+adv.id" class="pending-item">
            <div class="pending-info">
              <span class="material-symbols-rounded icon-adv">payments</span>
              <div>
                <p class="p-title">Payment Request • <strong>{{ adv.amount }} ETB</strong></p>
                <p class="p-sub">Requested by: <strong>{{ adv.operator }}</strong> (Efficiency: <strong :class="getEfficiencyColor(getOperatorEfficiencyByName(adv.operator))">{{ getOperatorEfficiencyByName(adv.operator) }}%</strong>) | Reason: {{ adv.note }}</p>
              </div>
            </div>
            <div class="pending-actions">
              <button class="btn-approve cursor-pointer" @click="handleApproveAdvance(adv.id)"><span class="material-symbols-rounded">check</span></button>
              <button class="btn-reject cursor-pointer" @click="handleRejectAdvance(adv.id)"><span class="material-symbols-rounded">close</span></button>
            </div>
          </div>
          
          <div v-if="pendingCount === 0" class="empty-state">
            <span class="material-symbols-rounded text-3xl text-emerald-500 mb-2">check_circle</span>
            <p>No pending approvals right now.</p>
          </div>
        </div>
      </div>

      <!-- HISTORY PANEL TAB -->
      <div v-if="activeTab === 'history'" class="tab-panel history-panel">
        <div class="history-controls flex items-center justify-between flex-wrap gap-2 mb-4">
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-400">Select Production Week: </label>
            <select v-model="historyWeek" @change="fetchHistory" class="week-select bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none">
              <option v-for="week in availableWeeks" :key="week" :value="week">{{ week }}</option>
            </select>
          </div>
        </div>
        
        <h3 class="panel-heading mb-4">Loan & Advance History ({{ historyWeek }})</h3>
        
        <div class="chart-container mb-6" v-if="historyChartData.length">
          <h4 style="margin-bottom: 1rem; color: #a5b4fc;">Top Borrowers this Week</h4>
          <div v-for="item in historyChartData" :key="item.operator" class="chart-row">
            <div class="chart-label">{{ item.operator }} ({{ item.totalAmount.toFixed(2) }} ETB)</div>
            <div class="chart-bar-wrap">
              <div class="chart-bar" :style="{ width: item.percentage + '%' }"></div>
            </div>
          </div>
        </div>
        
        <div class="pending-list">
          <div v-for="item in historyList" :key="item.id" class="pending-item">
            <div class="pending-info">
              <span class="material-symbols-rounded" :class="item.type === 'loan' ? 'icon-loan' : 'icon-adv'">
                {{ item.type === 'loan' ? 'account_balance' : 'payments' }}
              </span>
              <div>
                <p class="p-title">{{ item.type === 'loan' ? 'Loan Request' : 'Payment Request' }} • <strong>{{ item.amount.toFixed(2) }} ETB</strong></p>
                <p class="p-sub">Requested by: <strong>{{ item.operator }}</strong> | Status: <strong :class="item.status === 'active' || item.status === 'advance' ? 'text-green-400' : (item.status === 'rejected' || item.status === 'rejected_advance' ? 'text-red-400' : 'text-yellow-400')">{{ item.status.replace('_', ' ').toUpperCase() }}</strong></p>
              </div>
            </div>
          </div>
          <div v-if="historyList.length === 0" class="empty-state">
            No loan or advance history found for this week.
          </div>
        </div>
      </div>
    </main>

    <!-- Admin PIN Modal -->
    <PinModal
      v-if="adminPin.show"
      title="Admin Authorization"
      :subtitle="adminPin.action"
      icon="admin_panel_settings"
      icon-color="#f59e0b"
      confirm-label="Authorize"
      confirm-color="linear-gradient(135deg,#d97706,#f59e0b)"
      :error-msg="adminPin.error"
      :loading="adminPin.loading"
      @confirm="executeAdminAction"
      @cancel="adminPin.show = false"
    />
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import AppLayout from '@/components/layout/AppLayout.vue'
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import PinModal from '@/components/ui/PinModal.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { supabase } from '@/lib/supabaseClient'

const store = useMesStore()
const payrollStore = usePayrollStore()
const sysAuth = useSystemAuthStore()

const activeTab = ref('new')
const isSyncing = ref(false)
let refreshTimer = null

const entryType   = ref('advance')
const selectedOp  = ref(null)
const inputAmount = ref('')
const note        = ref('Weekly Advance')
const customNote  = ref('')

const presets = [50, 100, 200, 500, 1000]
const advanceNoteOptions = ['Weekly Advance', 'Emergency / Medical', 'Transport', 'Bonus', 'Other']
const expenseNoteOptions = ['Petty Cash', 'Station Materials', 'Equipment Maintenance', 'Transport / Fuel', 'Other']

async function manualSync() {
  isSyncing.value = true
  try {
    await Promise.all([
      store.fetchInitialData(),
      payrollStore.fetchLoans()
    ])
    if (activeTab.value === 'history') await fetchHistory()
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchInitialData(),
    payrollStore.fetchLoans()
  ])
  if (activeTab.value === 'history') fetchHistory()

  refreshTimer = setInterval(async () => {
    await Promise.all([
      store.fetchInitialData(),
      payrollStore.fetchLoans()
    ])
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const canSubmit = computed(() =>
  inputAmount.value !== '' &&
  Number(inputAmount.value) > 0 &&
  (entryType.value === 'expense' || selectedOp.value !== null)
)

const toast = reactive({ visible: false, message: '' })
let toastTimer = null

function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

const isSaving = ref(false)

async function submitEntry() {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true
  const finalNote = customNote.value.trim() || note.value
  const ok = await store.addCashEntry({
    type:     entryType.value,
    amount:   Number(inputAmount.value),
    operator: entryType.value === 'advance' ? (selectedOp.value?.name ?? 'Unknown') : 'Company',
    note:     finalNote,
  })
  isSaving.value = false
  if (ok !== false) {
    showToast(`✓ ${entryType.value === 'advance' ? 'Advance' : 'Expense'} of ${inputAmount.value} ETB logged`)
    inputAmount.value = ''
    customNote.value = ''
  } else {
    showToast('⚠ Failed to save. Check connection.')
  }
}

const pendingLoans = computed(() => payrollStore.loans.filter(l => l.status === 'pending'))
const pendingAdvances = computed(() => store.cashEntries.filter(e => e.type === 'pending_advance'))
const pendingCount = computed(() => pendingLoans.value.length + pendingAdvances.value.length)

function getOperatorName(id) {
  return store.operators.find(o => Number(o.id) === Number(id))?.name || 'Unknown'
}

function getOperatorEfficiency(id) {
  const stat = store.operatorEfficiency.find(o => Number(o.id) === Number(id))
  if (!stat) return 0
  return (100 - stat.wastePercent).toFixed(1)
}

function getOperatorEfficiencyByName(name) {
  const stat = store.operatorEfficiency.find(o => o.name === name)
  if (!stat) return 0
  return (100 - stat.wastePercent).toFixed(1)
}

function getEfficiencyColor(eff) {
  const v = Number(eff)
  if (v >= 90) return 'text-green-400'
  if (v >= 80) return 'text-yellow-400'
  return 'text-red-400'
}

const adminPin = reactive({
  show: false, action: '', pendingFn: null,
  error: '', loading: false
})

function requireAdminPin(actionLabel, fn) {
  adminPin.action = actionLabel
  adminPin.pendingFn = fn
  adminPin.error = ''
  adminPin.loading = false
  adminPin.show = true
}

async function executeAdminAction(pin) {
  const adminRoles = ['admin', 'System Admin', 'manager', 'Supervisor']
  const admin = store.operators.find(o => String(o.pin_code) === String(pin) && adminRoles.includes(o.role))
  const sysAuthCheck = await sysAuth.verifyPin(pin, 'admin')

  if (!admin && !sysAuthCheck.success) {
    adminPin.error = 'Invalid Admin PIN. Try again.'
    return
  }
  adminPin.loading = true
  await adminPin.pendingFn()
  adminPin.loading = false
  adminPin.show = false
}

async function handleApproveLoan(id) {
  requireAdminPin('Approve loan request', async () => {
    await payrollStore.approveLoan(id)
    showToast('✓ Loan approved')
  })
}
async function handleRejectLoan(id) {
  requireAdminPin('Reject loan request', async () => {
    await payrollStore.rejectLoan(id)
    showToast('✓ Loan rejected')
  })
}
async function handleApproveAdvance(id) {
  requireAdminPin('Approve payment request', async () => {
    await store.approveCashEntry(id)
    showToast('✓ Payment request approved')
  })
}
async function handleRejectAdvance(id) {
  requireAdminPin('Reject payment request', async () => {
    await store.rejectCashEntry(id)
    showToast('✓ Advance rejected')
  })
}

// --- History Logic ---
const availableWeeks = computed(() => {
  const set = new Set([store.currentProductionWeek])
  store.ledgerEntries.forEach(e => { if (e.week) set.add(e.week) })
  payrollStore.loans.forEach(l => { if (l.week) set.add(l.week) })
  return Array.from(set).sort().reverse()
})

const historyWeek = ref(store.currentProductionWeek)
const historyList = ref([])
const historyChartData = ref([])

async function fetchHistory() {
  historyList.value = []
  historyChartData.value = []
  try {
    const { data: loansData } = await supabase.from('mes_loans')
      .select('*')
      .eq('production_week', historyWeek.value)
      
    const { data: ledgerData } = await supabase.from('mes_financial_ledger')
      .select('*')
      .in('transaction_type', ['advance', 'pending_advance', 'rejected_advance'])

    const combined = []
    const operatorTotals = {}

    if (loansData) {
      loansData.forEach(row => {
        const opName = getOperatorName(row.operator_id)
        const amt = Number(row.principal || 0)
        combined.push({
          id: `loan-${row.id}`,
          type: 'loan',
          amount: amt,
          operator: opName,
          status: row.status,
          date: new Date(row.created_at)
        })
        if (row.status === 'active') {
          operatorTotals[opName] = (operatorTotals[opName] || 0) + amt
        }
      })
    }

    if (ledgerData) {
      ledgerData.forEach(row => {
        const notesObj = JSON.parse(row.notes || '{}')
        const week = row.production_week || notesObj.week
        if (week === historyWeek.value) {
          const opName = row.target_name || row.operator || 'Unknown'
          const amt = Number(row.amount || 0)
          combined.push({
            id: `adv-${row.id}`,
            type: 'advance',
            amount: amt,
            operator: opName,
            status: row.transaction_type,
            date: new Date(row.transaction_date || row.created_at)
          })
          if (row.transaction_type === 'advance') {
            operatorTotals[opName] = (operatorTotals[opName] || 0) + amt
          }
        }
      })
    }

    combined.sort((a, b) => b.date - a.date)
    historyList.value = combined

    const maxTotal = Math.max(0, ...Object.values(operatorTotals))
    const chartData = Object.entries(operatorTotals).map(([name, total]) => ({
      operator: name,
      totalAmount: total,
      percentage: maxTotal > 0 ? (total / maxTotal) * 100 : 0
    }))
    chartData.sort((a, b) => b.totalAmount - a.totalAmount)
    historyChartData.value = chartData

  } catch(e) {
    console.error('Error fetching history:', e)
  }
}

watch(activeTab, (newVal) => {
  if (newVal === 'history') fetchHistory()
})
</script>

<style scoped>
.cash-main {
  width: 100%; height: 100%; overflow-y: auto;
  padding: 1.25rem 1.5rem; background: #0f172a;
  display: flex; flex-direction: column; gap: 1rem;
}

.settings-top-nav {
  border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.75rem;
}
.snav-item {
  display: flex; align-items: center; gap: 0.4rem;
  background: #1e293b; border: 1px solid rgba(255,255,255,0.08);
  color: #94a3b8; font-size: 0.75rem; font-weight: 700;
  padding: 0.45rem 0.9rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.15s;
}
.snav-item:hover { color: #f1f5f9; }
.snav-item--active { background: #6366f1; border-color: #6366f1; color: #fff; }
.snav-icon { font-size: 1rem; }
.badge {
  background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 800;
  padding: 0.1rem 0.4rem; border-radius: 999px; margin-left: 0.2rem;
}

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.tab-panel {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.25rem; max-width: 680px; margin: 0 auto; width: 100%;
}

.presets-row { margin-bottom: 1rem; }
.presets-label, .note-label {
  font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;
  letter-spacing: 0.05em; margin: 0 0 0.4rem;
}
.presets { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.preset-btn {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.08);
  color: #f1f5f9; font-size: 0.75rem; font-weight: 800; font-family: monospace;
  padding: 0.4rem 0.75rem; border-radius: 0.45rem; transition: all 0.15s;
}
.preset-btn:hover { border-color: #f59e0b; color: #fbbf24; }

.cash-numpad { margin-bottom: 1rem; display: flex; justify-content: center; }

.note-chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.note-chip {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.06);
  color: #94a3b8; font-size: 0.7rem; font-weight: 700;
  padding: 0.35rem 0.65rem; border-radius: 0.4rem; transition: all 0.15s;
}
.note-chip:hover { color: #f1f5f9; }
.note-chip--active { background: rgba(99,102,241,0.2); border-color: #6366f1; color: #a5b4fc; }

.submit-btn {
  width: 100%; height: 3.25rem; background: linear-gradient(135deg, #10b981, #059669);
  border: none; border-radius: 0.75rem; color: #fff;
  font-size: 0.95rem; font-weight: 900; letter-spacing: 0.05em;
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  transition: all 0.15s; box-shadow: 0 4px 15px rgba(16,185,129,0.25);
}
.submit-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.submit-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; box-shadow: none; transform: none; }

.panel-heading { font-size: 1rem; font-weight: 800; color: #f1f5f9; margin: 0 0 1rem; }

.pending-list { display: flex; flex-direction: column; gap: 0.5rem; }
.pending-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem; padding: 0.85rem 1rem;
}
.pending-info { display: flex; align-items: center; gap: 0.75rem; }
.icon-loan { color: #fbbf24; font-size: 1.4rem; }
.icon-adv  { color: #34d399; font-size: 1.4rem; }
.p-title { font-size: 0.82rem; color: #f1f5f9; margin: 0; }
.p-sub   { font-size: 0.68rem; color: #64748b; margin: 0.15rem 0 0; }

.pending-actions { display: flex; gap: 0.4rem; }
.btn-approve, .btn-reject {
  width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; border: none;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.btn-approve { background: #10b981; color: #fff; }
.btn-reject  { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #f87171; }
.btn-approve:hover { filter: brightness(1.1); }
.btn-reject:hover  { background: rgba(239,68,68,0.35); }

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; color: #64748b; font-size: 0.82rem;
}

.chart-container { background: #0f172a; padding: 1rem; border-radius: 0.75rem; }
.chart-row { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem; }
.chart-label { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }
.chart-bar-wrap { height: 8px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; }
.chart-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #fbbf24); border-radius: 999px; transition: width 0.4s ease; }

.toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
