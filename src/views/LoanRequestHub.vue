<template>
  <div class="tablet-layout">
    <div class="hub-header">
      <span class="material-symbols-rounded header-icon">account_balance</span>
      <div>
        <h1 class="header-title">Loan & Installment Hub</h1>
        <p class="header-sub">Approve installment-based advances · auto-deducted over multiple payroll weeks</p>
      </div>
    </div>

    <div class="content-area">
      <!-- ── Operator Sidebar ──────────────────────────────────────── -->
      <div class="sidebar">
        <h2 class="sidebar-title">Select Operator</h2>
        <ul class="operator-list">
          <li
            v-for="op in mesStore.operators"
            :key="op.id"
            @click="selectOperator(op)"
            :class="['operator-item', { active: activeOperator?.id === op.id }]"
          >
            <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="md" />
            <div class="op-info">
              <span class="op-name">{{ op.name }}</span>
              <span class="op-role">{{ op.role }}</span>
            </div>
            <!-- Active loan badge -->
            <span v-if="getActiveLoans(op.id).length" class="loan-badge">
              {{ getActiveLoans(op.id).length }} loan{{ getActiveLoans(op.id).length > 1 ? 's' : '' }}
            </span>
          </li>
        </ul>
      </div>

      <!-- ── Main Panel ────────────────────────────────────────────── -->
      <div class="main-panel" v-if="activeOperator">

        <!-- Active Loans Ledger (top) -->
        <div v-if="getActiveLoans(activeOperator.id).length" class="active-loans-section">
          <h3 class="section-heading">
            <span class="material-symbols-rounded" style="font-size:1.1rem;color:#a5b4fc">receipt_long</span>
            Active Loan Ledger — {{ activeOperator.name }}
          </h3>
          <div class="loan-ledger">
            <div
              v-for="loan in getActiveLoans(activeOperator.id)"
              :key="loan.id"
              class="loan-ledger-row"
            >
              <div class="ledger-top">
                <div class="ledger-meta">
                  <span class="ledger-label">Loan #{{ loan.id?.toString().slice(-4) ?? '—' }}</span>
                  <span class="ledger-week">Issued {{ loan.issuedAt ? new Date(loan.issuedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : loan.week }}</span>
                </div>
                <div class="ledger-amounts">
                  <span class="ledger-installment">
                    <span class="material-symbols-rounded" style="font-size:.9rem;vertical-align:middle">calendar_today</span>
                    {{ loan.weeklyInstallment.toFixed(2) }} ETB / week
                  </span>
                  <span class="ledger-remaining">
                    {{ loan.remainingBalance.toFixed(2) }} ETB remaining
                  </span>
                </div>
              </div>
              <!-- Progress bar -->
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{ width: loanProgressPct(loan) + '%' }"
                  :class="loanProgressPct(loan) >= 80 ? 'progress-fill--near' : ''"
                ></div>
              </div>
              <div class="ledger-footer">
                <span class="pay-label">
                  Payment {{ loan.totalInstallments - loan.weeksRemaining + 1 }} of {{ loan.totalInstallments }}
                </span>
                <span class="pay-pct">{{ loanProgressPct(loan).toFixed(0) }}% repaid</span>
              </div>
            </div>
          </div>
        </div>

        <!-- New Loan Form -->
        <div class="loan-container">
          <!-- Left: Summary Card -->
          <div class="calc-card">
            <h3 class="calc-title">New Loan — {{ activeOperator.name }}</h3>

            <div class="calc-row">
              <span>Principal Amount</span>
              <strong>{{ Number(amount) || 0 }} ETB</strong>
            </div>
            <div class="calc-row">
              <span>Interest Rate</span>
              <strong>{{ interestRate }}%</strong>
            </div>
            <div class="calc-row">
              <span>Interest Amount</span>
              <strong class="warn">+{{ interestAmount.toFixed(2) }} ETB</strong>
            </div>
            <div class="calc-row">
              <span>Total Debt</span>
              <strong class="total-val">{{ totalDebt.toFixed(2) }} ETB</strong>
            </div>

            <div class="calc-divider"></div>

            <!-- Installment Weeks -->
            <div class="installment-section">
              <label class="inst-label">
                <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">date_range</span>
                Repayment Period
              </label>
              <div class="inst-weeks-display">{{ installmentWeeks }} week{{ installmentWeeks > 1 ? 's' : '' }}</div>
              <input
                class="inst-slider"
                type="range"
                min="1"
                max="12"
                step="1"
                v-model.number="installmentWeeks"
              />
              <div class="inst-ticks">
                <span>1w</span><span>3w</span><span>6w</span><span>9w</span><span>12w</span>
              </div>
            </div>

            <div class="calc-divider"></div>

            <div class="calc-row weekly-row">
              <span>Weekly Deduction</span>
              <strong class="danger">{{ weeklyInstallment.toFixed(2) }} ETB</strong>
            </div>

            <!-- Affordability Warning -->
            <div v-if="isAffordabilityRisk" class="afford-warn">
              <span class="material-symbols-rounded" style="font-size:1rem">warning</span>
              Weekly deduction exceeds 50% of average weekly earnings ({{ avgWeeklyEarnings.toFixed(2) }} ETB).
              Consider extending the repayment period.
            </div>
          </div>

          <!-- Right: Numpad & Approve -->
          <div class="input-section">
            <div class="amount-display">
              <span class="currency">ETB</span>
              <span class="value">{{ amount || '0' }}</span>
            </div>

            <div class="virtual-numpad">
              <button class="num-key" v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" @click="appendNum(n)">{{ n }}</button>
              <button class="num-key fn-key" @click="clearNum()">C</button>
              <button class="num-key" @click="appendNum(0)">0</button>
              <button class="num-key fn-key" @click="backspace()">
                <span class="material-symbols-rounded">backspace</span>
              </button>
            </div>

            <button
              class="approve-btn"
              :class="{ 'approve-btn--warn': isAffordabilityRisk }"
              :disabled="!amount || Number(amount) <= 0"
              @click="approveLoanInstallment"
            >
              <span class="material-symbols-rounded">gavel</span>
              APPROVE — {{ installmentWeeks }}×{{ weeklyInstallment.toFixed(2) }} ETB/WK
            </button>
          </div>
        </div>
      </div>

      <div class="main-panel empty-state" v-else>
        <span class="material-symbols-rounded empty-icon">account_balance</span>
        <p>Select an operator to process a loan request</p>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast-msg">
        <span class="material-symbols-rounded">check_circle</span>
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore'

const mesStore   = useMesStore()
const payrollStore = usePayrollStore()

// ── Operator selection ────────────────────────────────────────────────────────
const activeOperator = ref(null)
const amount         = ref('')
const installmentWeeks = ref(4)

function selectOperator(op) {
  activeOperator.value = op
  amount.value = ''
  installmentWeeks.value = 4
}

// ── Computed math ─────────────────────────────────────────────────────────────
const interestRate = computed(() => {
  if (!activeOperator.value) return 5
  return payrollStore.getWorkerProfile(activeOperator.value.id).baseInterestRate || 5
})

const interestAmount = computed(() =>
  (Number(amount.value) || 0) * (interestRate.value / 100)
)

const totalDebt = computed(() =>
  (Number(amount.value) || 0) + interestAmount.value
)

const weeklyInstallment = computed(() => {
  if (!installmentWeeks.value || installmentWeeks.value < 1) return totalDebt.value
  return payrollStore.toDecimal2(totalDebt.value / installmentWeeks.value)
})

// Average weekly earnings estimate (gross of current week for the operator)
const avgWeeklyEarnings = computed(() => {
  if (!activeOperator.value) return 0
  const payout = payrollStore.calculateFinalPayout(
    activeOperator.value.id,
    mesStore.currentProductionWeek
  )
  return payout.grossEarnings || 1
})

const isAffordabilityRisk = computed(() =>
  weeklyInstallment.value > avgWeeklyEarnings.value * 0.5
)

// ── Active loans for an operator ──────────────────────────────────────────────
function getActiveLoans(workerId) {
  return payrollStore.loans.filter(
    l => l.workerId === workerId && l.status === 'active' && l.remainingBalance > 0
  )
}

function loanProgressPct(loan) {
  if (!loan.totalDebt || loan.totalDebt === 0) return 0
  const paid = loan.totalDebt - loan.remainingBalance
  return Math.min(100, (paid / loan.totalDebt) * 100)
}

// ── Numpad ────────────────────────────────────────────────────────────────────
function appendNum(n) {
  if (amount.value.length < 6) amount.value += String(n)
}
function clearNum()  { amount.value = '' }
function backspace() { amount.value = amount.value.slice(0, -1) }

// ── Approve ───────────────────────────────────────────────────────────────────
const toastVisible = ref(false)
const toastMsg     = ref('')
let toastTimer     = null

function showToast(msg) {
  toastMsg.value     = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3000)
}

async function approveLoanInstallment() {
  if (!activeOperator.value || !amount.value || Number(amount.value) <= 0) return

  await payrollStore.requestLoan(
    activeOperator.value.id,
    mesStore.currentProductionWeek,
    Number(amount.value),
    null,
    installmentWeeks.value
  )

  showToast(
    `Loan of ${totalDebt.value.toFixed(2)} ETB approved for ${activeOperator.value.name} — ${installmentWeeks.value}×${weeklyInstallment.value.toFixed(2)} ETB/week`
  )
  amount.value = ''
  installmentWeeks.value = 4
}
</script>

<style scoped>
.tablet-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #0f172a;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
  position: relative;
}

.hub-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(245,158,11,.2);
  flex-shrink: 0;
}
.header-icon  { font-size: 2.2rem; color: #fbbf24; }
.header-title { font-size: 1.4rem; font-weight: 800; margin: 0; }
.header-sub   { font-size: 0.82rem; color: #64748b; margin: 0; }

/* ── Layout ── */
.content-area { display: flex; flex: 1; overflow: hidden; }

.sidebar {
  width: 100%;

  max-width: 300px;
  flex-shrink: 0;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-title {
  padding: 1rem 1.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #475569;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin: 0;
}

.operator-list  { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }
.operator-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.25rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background 0.15s;
  position: relative;
}
.operator-item:hover  { background: rgba(255,255,255,0.03); }
.operator-item.active { background: rgba(245,158,11,0.1); border-left: 3px solid #f59e0b; }

.op-avatar {
  width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 800; color: #fff;
}
.op-info   { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.op-name   { font-size: 0.9rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.op-role   { font-size: 0.65rem; color: #64748b; }

.loan-badge {
  background: rgba(99,102,241,0.2);
  border: 1px solid rgba(99,102,241,0.35);
  color: #a5b4fc;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  white-space: nowrap;
}

/* ── Main panel ── */
.main-panel {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Active Loans Ledger ── */
.active-loans-section { display: flex; flex-direction: column; gap: 0.75rem; }

.section-heading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  margin: 0;
}

.loan-ledger { display: flex; flex-direction: column; gap: 0.65rem; }

.loan-ledger-row {
  background: #1e293b;
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 0.85rem;
  padding: 0.9rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.ledger-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.ledger-meta    { display: flex; flex-direction: column; gap: 0.15rem; }
.ledger-label   { font-size: 0.72rem; font-weight: 800; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.06em; }
.ledger-week    { font-size: 0.62rem; color: #475569; }
.ledger-amounts { display: flex; flex-direction: column; align-items: flex-end; gap: 0.15rem; }
.ledger-installment { font-size: 0.82rem; font-weight: 700; color: #fbbf24; }
.ledger-remaining   { font-size: 0.72rem; color: #94a3b8; }

.progress-track {
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 999px;
  transition: width 0.4s ease;
}
.progress-fill--near { background: linear-gradient(90deg, #10b981, #34d399); }

.ledger-footer {
  display: flex;
  justify-content: space-between;
}
.pay-label { font-size: 0.68rem; color: #64748b; }
.pay-pct   { font-size: 0.68rem; font-weight: 700; color: #a5b4fc; }

/* ── New Loan Form ── */
.loan-container {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.calc-card {
  flex: 1;
  width: 100%;

  max-width: 280px;
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.25rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 20px 40px rgba(0,0,0,0.25);
}

.calc-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: #94a3b8;
}
.calc-row strong  { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
.calc-row .warn   { color: #fbbf24; }
.calc-row .total-val { color: #a5b4fc; }
.calc-row.weekly-row strong { font-size: 1.3rem; }
.calc-row .danger { color: #ef4444; }

.calc-divider { height: 1px; background: rgba(255,255,255,0.07); }

/* ── Installment Slider ── */
.installment-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.inst-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}
.inst-weeks-display {
  font-size: 1.8rem;
  font-weight: 900;
  color: #a5b4fc;
  text-align: center;
  line-height: 1;
}
.inst-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  background: rgba(99,102,241,0.25);
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  accent-color: #6366f1;
}
.inst-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6366f1;
  box-shadow: 0 0 0 4px rgba(99,102,241,0.25);
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.inst-slider::-webkit-slider-thumb:hover { box-shadow: 0 0 0 6px rgba(99,102,241,0.35); }
.inst-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  color: #475569;
}

/* ── Affordability Warning ── */
.afford-warn {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 0.6rem;
  padding: 0.65rem 0.85rem;
  font-size: 0.78rem;
  color: #f87171;
  line-height: 1.4;
}
.afford-warn .material-symbols-rounded { flex-shrink: 0; font-size: 1rem; margin-top: 0.05rem; }

/* ── Numpad ── */
.input-section {
  flex: 1;
  width: 100%;

  max-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}

.amount-display {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 2px solid #334155;
  border-radius: 1rem;
  padding: 1.1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}
.amount-display .currency { font-size: 1.2rem; color: #64748b; font-weight: 700; }
.amount-display .value    { font-size: 2.8rem; color: #fff; font-weight: 800; font-variant-numeric: tabular-nums; }

.virtual-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
  width: 100%;
}

.num-key {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 0.85rem;
  padding: 1.2rem;
  font-size: 1.6rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.num-key:hover  { background: rgba(255,255,255,0.05); }
.num-key:active { transform: scale(0.94); background: #334155; }
.fn-key { background: rgba(239,68,68,0.08); color: #f87171; border-color: rgba(239,68,68,0.15); }
.fn-key:active { background: rgba(239,68,68,0.2); }

.approve-btn {
  width: 100%;
  padding: 1.4rem;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
  background: linear-gradient(135deg, #d97706, #b45309);
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  box-shadow: 0 8px 20px -4px rgba(217,119,6,0.4);
  transition: transform 0.1s, box-shadow 0.1s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-family: inherit;
}
.approve-btn--warn { background: linear-gradient(135deg, #dc2626, #b91c1c); box-shadow: 0 8px 20px -4px rgba(220,38,38,0.4); }
.approve-btn:disabled { background: #334155; color: #64748b; box-shadow: none; cursor: not-allowed; }
.approve-btn:not(:disabled):active { transform: scale(0.97); }

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.empty-icon { font-size: 5rem; margin-bottom: 1rem; opacity: 0.3; }
.empty-state p { font-size: 1.1rem; }

/* ── Toast ── */
.toast-msg {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16,185,129,0.92);
  color: #fff;
  border-radius: 0.75rem;
  padding: 0.85rem 1.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  backdrop-filter: blur(8px);
  z-index: 9999;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(1rem); }
</style>
