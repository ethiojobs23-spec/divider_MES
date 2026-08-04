<template>
  <AppLayout>
    <!-- MAIN: Input Area -->
    <main class="cash-main">
      <nav class="settings-top-nav">
        <button class="snav-item" :class="{'snav-item--active': activeTab === 'new'}" @click="activeTab = 'new'">
          <span class="material-symbols-rounded snav-icon">add_circle</span>
          <span class="snav-label">New Entry</span>
        </button>
        <button class="snav-item" :class="{'snav-item--active': activeTab === 'pending'}" @click="activeTab = 'pending'">
          <span class="material-symbols-rounded snav-icon">pending_actions</span>
          <span class="snav-label">Pending Approvals</span>
          <span class="badge" v-if="pendingCount > 0">{{ pendingCount }}</span>
        </button>
      </nav>

      <div v-if="activeTab === 'new'" class="tab-panel">
        <!-- Quick Presets -->
      <div class="presets-row">
        <p class="presets-label">Quick Amount</p>
        <div class="presets">
          <button
            v-for="preset in presets"
            :key="preset"
            class="preset-btn"
            @click="inputAmount = String(preset)"
          >{{ preset }} ETB</button>
        </div>
      </div>

      <!-- Numpad -->
      <div class="cash-numpad">
        <VirtualNumpad
          label="Amount (ETB)"
          v-model="inputAmount"
        />
      </div>

      <!-- Note input (tap to open custom numpad-style picker — uses selector)  -->
      <div class="note-row">
        <p class="note-label">Note / Description</p>
        <div class="note-chips">
          <button
            v-for="n in noteOptions"
            :key="n"
            class="note-chip"
            :class="{ 'note-chip--active': note === n }"
            @click="note = n"
          >{{ n }}</button>
        </div>
      </div>

      <!-- Submit -->
      <button
        class="submit-btn"
        :disabled="!canSubmit"
        @click="submitEntry"
      >
        <span class="material-symbols-rounded">payments</span>
        LOG {{ entryType === 'advance' ? 'ADVANCE' : 'EXPENSE' }}
        {{ inputAmount ? `– ${inputAmount} ETB` : '' }}
      </button>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>
      </div>

      <div v-if="activeTab === 'pending'" class="tab-panel approvals-panel">
        <h3 class="panel-heading">Pending Requests</h3>
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
              <button class="btn-approve" @click="handleApproveLoan(loan.id)"><span class="material-symbols-rounded">check</span></button>
              <button class="btn-reject" @click="handleRejectLoan(loan.id)"><span class="material-symbols-rounded">close</span></button>
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
              <button class="btn-approve" @click="handleApproveAdvance(adv.id)"><span class="material-symbols-rounded">check</span></button>
              <button class="btn-reject" @click="handleRejectAdvance(adv.id)"><span class="material-symbols-rounded">close</span></button>
            </div>
          </div>
          
          <div v-if="pendingCount === 0" class="empty-state">
            No pending approvals right now.
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
import AppLayout from '@/components/layout/AppLayout.vue'
import { ref, computed, reactive } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import PinModal from '@/components/ui/PinModal.vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'

const store = useMesStore()
const payrollStore = usePayrollStore()

const activeTab = ref('new')

const entryType  = ref('advance')
const selectedOp = ref(null)
const inputAmount = ref('')
const note        = ref('')

const presets     = [50, 100, 200, 500, 1000]
const noteOptions = ['Weekly Advance', 'Bonus', 'Transport', 'Materials', 'Maintenance', 'Other']

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
  const ok = await store.addCashEntry({
    type:     entryType.value,
    amount:   Number(inputAmount.value),
    operator: entryType.value === 'advance' ? (selectedOp.value?.name ?? 'Unknown') : 'Company',
    note:     note.value,
  })
  isSaving.value = false
  if (ok !== false) {
    showToast(`${entryType.value === 'advance' ? 'Advance' : 'Expense'} of ${inputAmount.value} ETB logged ✓`)
    inputAmount.value = ''
    note.value = ''
  } else {
    showToast('⚠ Failed to save. Check connection.')
  }
}

const pendingLoans = computed(() => payrollStore.loans.filter(l => l.status === 'pending'))
const pendingAdvances = computed(() => store.cashEntries.filter(e => e.type === 'pending_advance'))
const pendingCount = computed(() => pendingLoans.value.length + pendingAdvances.value.length)

function getOperatorName(id) {
  return store.operators.find(o => o.id === id)?.name || 'Unknown'
}

function getOperatorEfficiency(id) {
  const stat = store.operatorEfficiency.find(o => o.id === id)
  if (!stat) return 0
  // wastePercent is the waste rate, so efficiency is 100 - wastePercent
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
  if (!admin) {
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
    showToast('Loan approved ✓')
  })
}
async function handleRejectLoan(id) {
  requireAdminPin('Reject loan request', async () => {
    await payrollStore.rejectLoan(id)
    showToast('Loan rejected ✓')
  })
}
async function handleApproveAdvance(id) {
  requireAdminPin('Approve payment request', async () => {
    await store.approveCashEntry(id)
    showToast('Payment request approved ✓')
  })
}
async function handleRejectAdvance(id) {
  requireAdminPin('Reject payment request', async () => {
    await store.rejectCashEntry(id)
    showToast('Payment request rejected ✓')
  })
}

const recentEntries = computed(() => [...store.cashEntries].reverse().slice(0, 8))
</script>

<style scoped>


/* Sidebar */

.sidebar-section          { display: flex; flex-direction: column; gap: .5rem; }
.sidebar-section.flex-1   { flex: 1; overflow: hidden; }
.section-title {
  font-size: .65rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .1em;
  padding-bottom: .3rem; border-bottom: 1px solid rgba(255,255,255,.06);
}

.type-list { display: flex; flex-direction: column; gap: .4rem; }
.type-btn {
  display: flex; align-items: center; gap: .6rem;
  padding: .85rem .9rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  color: #94a3b8;
  border-radius: .65rem;
  font-size: .9rem; font-weight: 700;
  cursor: pointer;
  transition: all .13s ease;
}
.type-btn:hover         { background: #1e293b; color: #e2e8f0; }
.type-btn--active       { background: rgba(245,158,11,.15); border-color: #f59e0b; color: #fcd34d; }
.type-btn--expense.type-btn--active { background: rgba(239,68,68,.12); border-color: #ef4444; color: #fca5a5; }

.op-list { display: flex; flex-direction: column; gap: .35rem; }
.op-btn {
  display: flex; align-items: center; gap: .6rem;
  padding: .65rem .75rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.07);
  color: #94a3b8;
  border-radius: .55rem;
  font-size: .85rem; font-weight: 600;
  cursor: pointer;
  transition: all .12s ease;
}
.op-btn--active { background: rgba(99,102,241,.15); border-color: #6366f1; color: #a5b4fc; }
.op-dot {
  width: 1.8rem; height: 1.8rem;
  border-radius: .35rem;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .75rem; color: #fff;
}

.summary-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: .75rem; padding: .8rem 1rem; }
.summary-item { display: flex; justify-content: space-between; align-items: center; padding: .25rem 0; font-size: .8rem; color: #64748b; }
.summary-val  { color: #fbbf24; font-weight: 800; font-size: .95rem; }
.summary-val--exp { color: #f87171; }

.entry-list { display: flex; flex-direction: column; gap: .35rem; overflow-y: auto; flex: 1; }
.entry-item {
  display: flex; align-items: center; gap: .6rem;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .5rem;
  padding: .45rem .65rem;
}
.entry-type   { font-size: .6rem; font-weight: 800; padding: .15rem .4rem; border-radius: .25rem; flex-shrink: 0; }
.type--adv    { background: rgba(245,158,11,.2); color: #fbbf24; }
.type--exp    { background: rgba(239,68,68,.15); color: #fca5a5; }
.entry-body   { flex: 1; }
.entry-who    { font-size: .8rem; font-weight: 700; color: #e2e8f0; }
.entry-note   { font-size: .65rem; color: #64748b; }
.entry-amount { font-size: .85rem; font-weight: 800; color: #34d399; flex-shrink: 0; }
.empty-hint   { font-size: .75rem; color: #334155; text-align: center; padding: .75rem 0; }

/* Main */
.cash-main {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

.presets-row { display: flex; align-items: center; gap: 1rem; }
.presets-label { font-size: .65rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; flex-shrink: 0; }
.presets { display: flex; gap: .5rem; }
.preset-btn {
  height: 3rem;
  min-width: 5.5rem;
  background: rgba(245,158,11,.12);
  border: 1px solid rgba(245,158,11,.3);
  color: #fbbf24;
  border-radius: .6rem;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all .13s ease;
}
.preset-btn:hover  { background: rgba(245,158,11,.22); }
.preset-btn:active { transform: scale(.96); }

.cash-numpad { flex: 1; }

.note-row   { display: flex; flex-direction: column; gap: .4rem; }
.note-label { font-size: .65rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
.note-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.note-chip {
  padding: .35rem .9rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.08);
  color: #94a3b8;
  border-radius: 999px;
  font-size: .78rem; font-weight: 600;
  cursor: pointer;
  transition: all .12s ease;
}
.note-chip--active { background: rgba(99,102,241,.2); border-color: #6366f1; color: #a5b4fc; }

.submit-btn {
  height: 4.5rem;
  background: linear-gradient(135deg,#d97706,#f59e0b);
  border: none;
  border-radius: .85rem;
  color: #fff;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: .08em;
  display: flex; align-items: center; justify-content: center; gap: .6rem;
  cursor: pointer;
  transition: all .15s ease;
}
.submit-btn:disabled       { opacity: .35; cursor: not-allowed; }
.submit-btn:not(:disabled):hover  { filter: brightness(1.1); }
.submit-btn:not(:disabled):active { transform: scale(.98); }

.toast {
  position: absolute;
  bottom: 1.25rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,.9);
  color: #fff;
  border-radius: .65rem;
  padding: .75rem 1.5rem;
  font-size: .9rem; font-weight: 700;
  display: flex; align-items: center; gap: .4rem;
  backdrop-filter: blur(8px);
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }

/* Navigation & Tabs */
.settings-top-nav {
  display: flex; gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.snav-item {
  display: flex; align-items: center; gap: .5rem;
  padding: .6rem 1rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .5rem;
  color: #64748b;
  cursor: pointer;
  transition: all .15s ease;
  position: relative;
}
.snav-item:hover        { background: rgba(255,255,255,.05); color: #cbd5e1; }
.snav-item--active      { background: rgba(16,185,129,.12); border-color: #10b981; color: #34d399; }
.snav-icon              { font-size: 1.1rem !important; }
.snav-label             { font-size: .85rem; font-weight: 700; }
.badge {
  background: #ef4444; color: #fff;
  font-size: 0.7rem; font-weight: 800;
  padding: 0.15rem 0.4rem; border-radius: 99px;
  margin-left: 0.25rem;
}

.tab-panel {
  display: flex; flex-direction: column; gap: 1.25rem; padding: 1.5rem; flex: 1; overflow-y: auto;
}

/* Approvals Panel */
.panel-heading { font-size: 1.2rem; font-weight: 800; color: #f8fafc; margin: 0 0 1rem 0; }
.pending-list { display: flex; flex-direction: column; gap: 1rem; }
.pending-item {
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.25rem;
}
.pending-info { display: flex; align-items: center; gap: 1rem; }
.icon-loan { font-size: 2rem; color: #a855f7; background: rgba(168,85,247,0.15); padding: 0.5rem; border-radius: 0.75rem; }
.icon-adv { font-size: 2rem; color: #3b82f6; background: rgba(59,130,246,0.15); padding: 0.5rem; border-radius: 0.75rem; }
.p-title { font-size: 1.1rem; color: #e2e8f0; margin: 0 0 0.25rem 0; }
.p-sub { font-size: 0.85rem; color: #94a3b8; margin: 0; }
.text-green-400 { color: #4ade80 !important; }
.text-yellow-400 { color: #facc15 !important; }
.text-red-400 { color: #f87171 !important; }

.pending-actions { display: flex; gap: 0.75rem; }
.btn-approve, .btn-reject {
  width: 3rem; height: 3rem;
  border-radius: 50%;
  border: none;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; cursor: pointer; transition: all 0.2s;
}
.btn-approve { background: rgba(16,185,129,0.15); color: #10b981; }
.btn-approve:hover { background: #10b981; color: #fff; }
.btn-reject { background: rgba(239,68,68,0.15); color: #ef4444; }
.btn-reject:hover { background: #ef4444; color: #fff; }

.empty-state {
  text-align: center; padding: 4rem 1rem; color: #64748b; font-size: 1.1rem; font-weight: 600;
}
</style>
