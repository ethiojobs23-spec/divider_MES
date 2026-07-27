<template>
  <div class="payroll-layout">
    <!-- Header Bar -->
    <div class="payroll-header">
      <div class="header-left">
        <span class="material-symbols-rounded header-icon">account_balance_wallet</span>
        <div>
          <h1 class="header-title">Weekly Payroll Dashboard</h1>
          <p class="header-sub">{{ currentWeek }} &bull; Auto-aggregated from production & HR ledger</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-chip">
          <span>Total Production</span>
          <strong>{{ mesStore.weeklyAggregation.TOTAL }} pcs</strong>
        </div>
        <div class="stat-chip">
          <span>Total Deductions</span>
          <strong class="stat-warn">{{ totalAllDeductions.toFixed(2) }} ETB</strong>
        </div>
        <div class="stat-chip">
          <span>Total Net Payouts</span>
          <strong class="stat-success">{{ totalNetPayouts.toFixed(2) }} ETB</strong>
        </div>
      </div>
    </div>

    <div class="split-view">
      <!-- Left: Worker List -->
      <div class="worker-list">
         <div 
            v-for="worker in payrollStore.weeklyPayrollSummary" 
            :key="worker.id" 
            class="worker-card" 
            :class="{ active: selectedWorkerId === worker.id }"
            @click="selectedWorkerId = worker.id"
         >
            <div class="op-avatar-sm" :class="worker.color">{{ worker.avatar }}</div>
            <div class="worker-info">
              <p class="worker-name">{{ worker.name }}</p>
              <p class="worker-role">{{ worker.role }}</p>
            </div>
            <div class="worker-status-amount">
              <p class="worker-amount">{{ worker.netPayout.toFixed(2) }} ETB</p>
              <span class="status-badge" :class="worker.payoutStatus.status">
                {{ worker.payoutStatus.status.toUpperCase() }}
              </span>
            </div>
         </div>
      </div>

      <!-- Right: Detailed Breakdown -->
      <div class="detail-panel" v-if="selectedWorker">
         <div class="detail-header">
           <div>
             <h2>{{ selectedWorker.name }} - Payroll Breakdown</h2>
             <p v-if="selectedWorker.payoutStatus.reason" class="hold-reason-text">Reason: {{ selectedWorker.payoutStatus.reason }}</p>
           </div>
           <span class="status-stamp" :class="selectedWorker.payoutStatus.status">
             {{ selectedWorker.payoutStatus.status === 'approved' ? 'PAID ✓' : (selectedWorker.payoutStatus.status === 'held' ? 'HELD ✋' : 'PENDING ⏳') }}
           </span>
         </div>
         
         <div class="breakdown-content" :class="{ 'is-locked': selectedWorker.payoutStatus.status === 'approved' }">
            <div class="calculation-card">
              <h3>Earnings Calculation</h3>
              <div class="calc-row">
                 <span>Gross Piece-Rate</span>
                 <span>{{ selectedWorker.grossPieceRate.toFixed(2) }} ETB</span>
              </div>
              <div class="calc-row">
                 <span>Gross Hourly</span>
                 <span>{{ selectedWorker.grossHourly.toFixed(2) }} ETB</span>
              </div>
              <div class="calc-row math-op">
                 <span>Subtotal</span>
                 <span>{{ (selectedWorker.grossPieceRate + selectedWorker.grossHourly).toFixed(2) }} ETB</span>
              </div>
              <div class="calc-row">
                 <span>Attendance Factor ({{ selectedWorker.daysAttended }}/6 days)</span>
                 <span>x {{ selectedWorker.attendanceFactor.toFixed(2) }}</span>
              </div>
              <div class="calc-row math-result">
                 <span>Adjusted Gross Earnings</span>
                 <span>{{ selectedWorker.grossEarnings.toFixed(2) }} ETB</span>
              </div>
            </div>

            <div class="calculation-card deductions">
              <h3>Deductions</h3>
              <div class="calc-row">
                 <span>Advances + Interest</span>
                 <span class="deduction-val">- {{ selectedWorker.totalDeduction.toFixed(2) }} ETB</span>
              </div>
            </div>

            <div class="calculation-card net-payout">
              <h3>Net Payout</h3>
              <div class="net-amount">{{ selectedWorker.netPayout.toFixed(2) }} ETB</div>
            </div>
         </div>

         <!-- Actions -->
         <div class="action-buttons">
            <button 
              class="btn-massive btn-approve"
              :disabled="selectedWorker.payoutStatus.status === 'approved'"
              @click="confirmApprove(selectedWorker)"
            >
              {{ selectedWorker.payoutStatus.status === 'approved' ? 'PAID ✓' : 'APPROVE & LOG PAYMENT' }}
            </button>
            <button 
              class="btn-massive btn-hold"
              :disabled="selectedWorker.payoutStatus.status === 'approved'"
              @click="openHoldMenu(selectedWorker)"
            >
              HOLD / DISPUTE
            </button>
         </div>
      </div>
      <div v-else class="empty-state">
         <span class="material-symbols-rounded empty-icon">touch_app</span>
         <p>Select a worker to view breakdown</p>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-content confirm-modal">
        <h3>Confirm Payment</h3>
        <p>Are you sure you want to approve the payment of <strong>{{ selectedWorker.netPayout.toFixed(2) }} ETB</strong> for <strong>{{ selectedWorker.name }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showConfirmModal = false">CANCEL</button>
          <button class="btn-confirm" @click="executeApprove">YES, APPROVE</button>
        </div>
      </div>
    </div>

    <div v-if="showHoldModal" class="modal-overlay" @click.self="showHoldModal = false">
      <div class="modal-content hold-modal">
        <h3>Hold / Dispute Payment</h3>
        <p>Select reason for holding payment for <strong>{{ selectedWorker.name }}</strong>:</p>
        <div class="hold-reasons">
          <button v-for="reason in holdReasons" :key="reason" class="reason-btn" @click="executeHold(reason)">
            {{ reason }}
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showHoldModal = false">CANCEL</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'

const mesStore = useMesStore()
const payrollStore = usePayrollStore()

const currentWeek = computed(() => mesStore.currentProductionWeek)

const selectedWorkerId = ref(null)
const selectedWorker = computed(() => {
  return payrollStore.weeklyPayrollSummary.find(w => w.id === selectedWorkerId.value)
})

const totalAllDeductions = computed(() => {
  return payrollStore.weeklyPayrollSummary.reduce((sum, w) => sum + w.totalDeduction, 0)
})
const totalNetPayouts = computed(() => {
  return payrollStore.weeklyPayrollSummary.reduce((sum, w) => sum + w.netPayout, 0)
})

// Modals
const showConfirmModal = ref(false)
const showHoldModal = ref(false)
const holdReasons = ['Missing Tools', 'Attendance Dispute', 'Loan Discrepancy', 'Quality Penalty']

function confirmApprove(worker) {
  if (worker.payoutStatus.status === 'approved') return
  showConfirmModal.value = true
}

async function executeApprove() {
  if (selectedWorker.value) {
    await payrollStore.approvePayout(selectedWorker.value.id, currentWeek.value)
  }
  showConfirmModal.value = false
}

function openHoldMenu(worker) {
  if (worker.payoutStatus.status === 'approved') return
  showHoldModal.value = true
}

function executeHold(reason) {
  if (selectedWorker.value) {
    payrollStore.holdPayout(selectedWorker.value.id, currentWeek.value, reason)
  }
  showHoldModal.value = false
}
</script>

<style scoped>
.payroll-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* Header */
.payroll-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.2);
  flex-shrink: 0;
}
.header-left   { display: flex; align-items: center; gap: 1rem; }
.header-icon   { font-size: 2.5rem; color: #a5b4fc; }
.header-title  { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; margin:0; }
.header-sub    { font-size: .85rem; color: #64748b; margin-top: .15rem; }
.header-stats  { display: flex; gap: 1rem; }
.stat-chip {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .65rem;
  padding: .5rem 1rem;
  text-align: right;
}
.stat-chip span    { display: block; font-size: .65rem; color: #64748b; letter-spacing: .06em; text-transform: uppercase; }
.stat-chip strong  { font-size: 1.1rem; font-weight: 800; color: #34d399; }
.stat-warn         { color: #fbbf24 !important; }
.stat-success      { color: #10b981 !important; }

/* Split View Layout */
.split-view {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Left: Worker List */
.worker-list {
  width: 35%;
  max-width: 450px;
  background: #1e293b;
  border-right: 1px solid rgba(99,102,241,.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.worker-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem;
  border-bottom: 1px solid rgba(255,255,255,.05);
  cursor: pointer;
  transition: background 0.2s;
}
.worker-card:hover {
  background: rgba(255,255,255,.03);
}
.worker-card.active {
  background: rgba(99,102,241,.1);
  border-left: 4px solid #818cf8;
}

.op-avatar-sm {
  width: 3rem; height: 3rem;
  border-radius: .75rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 800; color: #fff;
  flex-shrink: 0;
}

.worker-info {
  flex: 1;
}
.worker-name { font-size: 1.1rem; font-weight: 700; color: #e2e8f0; margin:0; }
.worker-role { font-size: .85rem; color: #64748b; margin:0; }

.worker-status-amount {
  text-align: right;
}
.worker-amount {
  font-size: 1.1rem;
  font-weight: 800;
  color: #10b981;
  margin: 0 0 0.4rem 0;
}
.status-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.status-badge.pending { background: rgba(251,191,36,0.2); color: #fbbf24; }
.status-badge.approved { background: rgba(16,185,129,0.2); color: #34d399; }
.status-badge.held { background: rgba(239,68,68,0.2); color: #f87171; }

/* Right: Detail Panel */
.detail-panel {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.detail-header h2 {
  font-size: 1.8rem;
  color: #f8fafc;
  margin: 0 0 0.5rem 0;
}
.hold-reason-text {
  color: #f87171;
  font-size: 0.9rem;
  margin: 0;
  font-weight: 600;
}
.status-stamp {
  font-size: 1.5rem;
  font-weight: 900;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid transparent;
}
.status-stamp.pending { color: #fbbf24; border-color: #fbbf24; }
.status-stamp.approved { color: #10b981; border-color: #10b981; }
.status-stamp.held { color: #ef4444; border-color: #ef4444; }

.breakdown-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 3rem;
  transition: opacity 0.3s;
}
.breakdown-content.is-locked {
  opacity: 0.6;
  pointer-events: none;
}

.calculation-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.5rem;
}
.calculation-card h3 {
  color: #94a3b8;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 1.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.75rem;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  font-size: 1.1rem;
  color: #e2e8f0;
}
.calc-row.math-op {
  border-top: 1px dashed rgba(255,255,255,0.1);
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-weight: 600;
}
.calc-row.math-result {
  border-top: 2px solid rgba(255,255,255,0.1);
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-weight: 800;
  font-size: 1.2rem;
  color: #f8fafc;
}

.deduction-val {
  color: #f87171;
}

.net-payout .net-amount {
  font-size: 3rem;
  font-weight: 900;
  color: #10b981;
  text-align: right;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 1.5rem;
  margin-top: auto;
}
.btn-massive {
  flex: 1;
  padding: 1.5rem;
  font-size: 1.3rem;
  font-weight: 800;
  border-radius: 1rem;
  border: none;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.btn-massive:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-massive:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.btn-approve {
  background: #10b981;
  color: #fff;
  box-shadow: 0 8px 20px rgba(16,185,129,0.3);
}
.btn-hold {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 8px 20px rgba(239,68,68,0.3);
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}
.empty-state p {
  font-size: 1.2rem;
  font-weight: 600;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-content {
  background: #1e293b;
  border-radius: 1rem;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}
.modal-content h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #f8fafc;
}
.modal-content p {
  color: #cbd5e1;
  font-size: 1.1rem;
  line-height: 1.5;
  margin-bottom: 2rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.modal-actions button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 0.5rem;
  cursor: pointer;
  border: none;
}
.btn-cancel {
  background: transparent;
  color: #94a3b8;
  border: 1px solid #475569 !important;
}
.btn-confirm {
  background: #10b981;
  color: #fff;
}

.hold-reasons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.reason-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 1rem;
  border-radius: 0.5rem;
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}
.reason-btn:hover {
  background: rgba(239,68,68,0.2);
  border-color: #ef4444;
}
</style>
