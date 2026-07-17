<template>
  <div class="tablet-layout">
    <div class="header">
      <span class="material-symbols-rounded header-icon">payments</span>
      <div>
        <h1 class="header-title">Loan Request Hub</h1>
        <p class="header-sub">Approve mid-week cash advances with automatic interest deductions</p>
      </div>
    </div>

    <div class="content-area">
      <!-- Operator Selection Sidebar -->
      <div class="sidebar">
        <h2 class="sidebar-title">Select Operator</h2>
        <ul class="operator-list">
          <li 
            v-for="op in mesStore.operators" 
            :key="op.id"
            @click="selectOperator(op)"
            :class="['operator-item', { active: activeOperator?.id === op.id }]"
          >
            <div class="op-avatar" :class="op.color">{{ op.avatar }}</div>
            <div class="op-info">
              <span class="op-name">{{ op.name }}</span>
              <span class="op-role">{{ op.role }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Main Loan Entry Area -->
      <div class="main-panel" v-if="activeOperator">
        <div class="loan-container">
          <!-- Live Calculation Card -->
          <div class="calc-card">
            <h3 class="calc-title">Loan Summary for {{ activeOperator.name }}</h3>
            
            <div class="calc-row">
              <span>Principal Amount:</span>
              <strong>{{ amount || 0 }} ETB</strong>
            </div>
            <div class="calc-row">
              <span>Interest Rate:</span>
              <strong>{{ interestRate }}%</strong>
            </div>
            <div class="calc-row">
              <span>Interest Amount:</span>
              <strong class="warn">+{{ interestAmount.toFixed(2) }} ETB</strong>
            </div>
            <div class="calc-divider"></div>
            <div class="calc-row total-row">
              <span>Total Deduction on Payday:</span>
              <strong class="danger">{{ totalDeduction.toFixed(2) }} ETB</strong>
            </div>
          </div>

          <!-- Numpad & Input -->
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
              :disabled="!amount || Number(amount) <= 0"
              @click="approveLoan"
            >
              <span class="material-symbols-rounded">gavel</span>
              APPROVE LOAN & BIND TO PAYROLL
            </button>
          </div>
        </div>
      </div>
      
      <div class="main-panel empty-state" v-else>
        <span class="material-symbols-rounded empty-icon">account_balance</span>
        <p>Select an operator to process a loan request</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMesStore } from '@/store/mesStore'
import { usePayrollStore } from '@/store/payrollStore'

const mesStore = useMesStore()
const payrollStore = usePayrollStore()

const activeOperator = ref(null)
const amount = ref('')

const interestRate = computed(() => {
  if (!activeOperator.value) return 5
  return payrollStore.getWorkerProfile(activeOperator.value.id).baseInterestRate || 5
})

const interestAmount = computed(() => {
  const principal = Number(amount.value) || 0
  return principal * (interestRate.value / 100)
})

const totalDeduction = computed(() => {
  return (Number(amount.value) || 0) + interestAmount.value
})

function selectOperator(op) {
  activeOperator.value = op
  amount.value = ''
}

function appendNum(n) {
  if (amount.value.length < 6) {
    amount.value += String(n)
  }
}

function clearNum() {
  amount.value = ''
}

function backspace() {
  amount.value = amount.value.slice(0, -1)
}

function approveLoan() {
  if (activeOperator.value && amount.value && Number(amount.value) > 0) {
    payrollStore.requestLoan(
      activeOperator.value.id, 
      mesStore.currentProductionWeek, 
      Number(amount.value)
    )
    alert(`Loan of ${amount.value} ETB approved for ${activeOperator.value.name}`)
    amount.value = ''
  }
}
</script>

<style scoped>
.tablet-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(245,158,11,.2);
}

.header-icon { font-size: 2.5rem; color: #fbbf24; }
.header-title { font-size: 1.5rem; font-weight: 800; margin: 0; }
.header-sub { font-size: 0.9rem; color: #64748b; margin: 0; }

.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 350px;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  padding: 1.5rem;
  font-size: 1.1rem;
  color: #94a3b8;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin: 0;
}

.operator-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.operator-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem 1.5rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.02);
  transition: all 0.2s ease;
}

.operator-item:hover { background: rgba(255,255,255,0.03); }
.operator-item.active { background: rgba(245,158,11,0.15); border-left: 4px solid #f59e0b; }

.op-avatar {
  width: 3rem; height: 3rem;
  border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 800; color: #fff;
}
.op-info { display: flex; flex-direction: column; }
.op-name { font-size: 1.1rem; font-weight: 700; }
.op-role { font-size: 0.8rem; color: #64748b; }

.main-panel {
  flex: 1;
  padding: 2rem 3rem;
  overflow-y: auto;
  display: flex;
  justify-content: center;
}

.loan-container {
  display: flex;
  gap: 4rem;
  width: 100%;
  max-width: 1000px;
}

.calc-card {
  flex: 1;
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1.5rem;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.calc-title {
  font-size: 1.4rem;
  color: #e2e8f0;
  margin: 0 0 1rem 0;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.2rem;
  color: #cbd5e1;
}

.calc-row strong { font-size: 1.4rem; font-weight: 700; color: #f1f5f9; }
.calc-row .warn { color: #fbbf24; }
.calc-row .danger { color: #ef4444; font-size: 2rem; }

.calc-divider {
  height: 2px;
  background: rgba(255,255,255,0.1);
  margin: 1rem 0;
}

.total-row {
  margin-top: auto;
}

.input-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
}

.amount-display {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 2px solid #334155;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}
.amount-display .currency { font-size: 1.5rem; color: #64748b; font-weight: 700; }
.amount-display .value { font-size: 3.5rem; color: #fff; font-weight: 800; font-variant-numeric: tabular-nums; }

.virtual-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;
}

.num-key {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1rem;
  padding: 1.5rem;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.num-key:active { transform: scale(0.95); background: #334155; }
.fn-key { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.approve-btn {
  width: 100%;
  padding: 1.8rem;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
  background: linear-gradient(135deg, #d97706, #b45309);
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  box-shadow: 0 10px 25px -5px rgba(217, 119, 6, 0.4);
  transition: transform 0.1s, box-shadow 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
}
.approve-btn:disabled {
  background: #334155;
  color: #64748b;
  box-shadow: none;
  cursor: not-allowed;
}
.approve-btn:not(:disabled):active {
  transform: scale(0.98);
  box-shadow: 0 5px 15px -5px rgba(217, 119, 6, 0.4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.empty-icon { font-size: 5rem; margin-bottom: 1rem; opacity: 0.5; }
.empty-state p { font-size: 1.2rem; }
</style>
