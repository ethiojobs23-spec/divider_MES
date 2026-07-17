<template>
  <div class="payroll-layout">
    <!-- Header Bar -->
    <div class="payroll-header">
      <div class="header-left">
        <span class="material-symbols-rounded header-icon">account_balance_wallet</span>
        <div>
          <h1 class="header-title">Weekly Payroll Dashboard</h1>
          <p class="header-sub">{{ store.currentProductionWeek }} &bull; Auto-aggregated from production & HR ledger</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-chip">
          <span>Total Production</span>
          <strong>{{ store.weeklyAggregation.TOTAL }} pcs</strong>
        </div>
        <div class="stat-chip">
          <span>Total Deductions</span>
          <strong class="stat-warn">{{ totalAllDeductions.toFixed(2) }} ETB</strong>
        </div>
      </div>
    </div>

    <!-- Table Scroll Area -->
    <div class="table-wrapper">
      <table class="payroll-table">
        <thead>
          <tr>
            <th class="col-op">Operator</th>
            <!-- Production Blocks -->
            <th colspan="4" class="group-header group-header--prod">Production Blocks (pcs)</th>
            <!-- HR & Financial Payouts -->
            <th colspan="4" class="group-header group-header--pay">Financial Payouts (ETB)</th>
          </tr>
          <tr>
            <th class="col-op"></th>
            <!-- Prod sub-headers -->
            <th v-for="ph in prodHeaders" :key="ph" class="subhead subhead--prod">{{ ph }}</th>
            <!-- Pay sub-headers -->
            <th class="subhead subhead--pay">Days Attended</th>
            <th class="subhead subhead--pay">Gross Earnings</th>
            <th class="subhead subhead--pay">Loan Deductions</th>
            <th class="subhead subhead--pay">Net Final Payout</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="op in store.operators" :key="op.id" class="data-row">
            <!-- Operator -->
            <td class="cell-op">
              <div class="op-cell">
                <div class="op-avatar-sm" :class="op.color">{{ op.avatar }}</div>
                <div>
                  <p class="op-cell-name">{{ op.name }}</p>
                  <p class="op-cell-role">{{ op.role }}</p>
                </div>
              </div>
            </td>
            <!-- Production data (from ledger) -->
            <td
              v-for="period in ['M&T','W&T','F&S']"
              :key="period"
              class="cell-num"
            >
              {{ getOpProduction(op.id, period) }}
            </td>
            <td class="cell-num cell-total">{{ getOpTotal(op.id) }}</td>

            <!-- HR & Financial data -->
            <td class="cell-num cell-attendance">
              {{ getDays(op.id) }}/6
            </td>
            <td class="cell-num cell-gross">{{ getGross(op.id).toFixed(2) }}</td>
            <td class="cell-num cell-deduction">{{ getDeductions(op.id).toFixed(2) }}</td>
            <td class="cell-num cell-net">
              <div class="net-payout-wrapper">
                <span v-if="getDays(op.id) === 0" class="material-symbols-rounded lock-icon">lock</span>
                <span :class="{ 'frozen': getDays(op.id) === 0 }">{{ getNet(op.id).toFixed(2) }}</span>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="footer-row">
            <td class="cell-op footer-label">WEEK TOTAL</td>
            <td class="cell-num footer-num">{{ store.weeklyAggregation['M&T'] }}</td>
            <td class="cell-num footer-num">{{ store.weeklyAggregation['W&T'] }}</td>
            <td class="cell-num footer-num">{{ store.weeklyAggregation['F&S'] }}</td>
            <td class="cell-num footer-num footer-grand">{{ store.weeklyAggregation.TOTAL }}</td>
            <td colspan="4" class="cell-num footer-num footer-pay">
              Total Net Payouts: {{ totalNetPayouts.toFixed(2) }} ETB
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'

const store = useMesStore()
const payrollStore = usePayrollStore()

const prodHeaders = ['M&T', 'W&T', 'F&S', 'TOTAL']

// Production per operator
function getOpProduction(opId, period) {
  const op = store.operators.find(o => o.id === opId)
  if (!op) return 0
  const dayMap = { 'M&T': [1,2], 'W&T': [3,4], 'F&S': [5,6] }
  return store.ledgerEntries
    .filter(e => e.operator === op.name && dayMap[period].includes(new Date(e.timestamp).getDay()))
    .reduce((s, e) => s + (Number(e.goodProduction) || 0), 0)
}

function getOpTotal(opId) {
  const op = store.operators.find(o => o.id === opId)
  if (!op) return 0
  return store.ledgerEntries
    .filter(e => e.operator === op.name)
    .reduce((s, e) => s + (Number(e.goodProduction) || 0), 0)
}

// Financial functions from payrollStore
const currentWeek = computed(() => store.currentProductionWeek)

function getDays(opId) {
  return payrollStore.getDaysAttended(opId, currentWeek.value)
}

function getGross(opId) {
  return payrollStore.getGrossEarnings(opId, currentWeek.value)
}

function getDeductions(opId) {
  return payrollStore.getLoanDeductions(opId, currentWeek.value).totalDeduction
}

function getNet(opId) {
  return payrollStore.calculateFinalPayout(opId, currentWeek.value)
}

const totalAllDeductions = computed(() => {
  return store.operators.reduce((sum, op) => sum + getDeductions(op.id), 0)
})

const totalNetPayouts = computed(() => {
  return store.operators.reduce((sum, op) => sum + getNet(op.id), 0)
})

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

/* Table */
.table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 1.5rem 2rem;
}

.payroll-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: .9rem;
}

/* Group headers */
.group-header {
  padding: .8rem 1rem;
  text-align: center;
  font-size: .8rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.group-header--prod { background: rgba(99,102,241,.15); color: #a5b4fc; border-bottom: 2px solid rgba(99,102,241,.4); }
.group-header--pay  { background: rgba(16,185,129,.1); color: #34d399; border-bottom: 2px solid rgba(16,185,129,.3); }

.subhead {
  padding: .75rem .75rem;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.subhead--prod { color: #818cf8; background: rgba(99,102,241,.08); }
.subhead--pay  { color: #10b981; background: rgba(16,185,129,.07); }

.col-op { width: 16rem; }

/* Rows */
.data-row td { border-bottom: 1px solid rgba(255,255,255,.05); }
.data-row:hover td { background: rgba(255,255,255,.03); }

.cell-op { padding: 1rem; }
.op-cell { display: flex; align-items: center; gap: .8rem; }
.op-avatar-sm {
  width: 2.5rem; height: 2.5rem;
  border-radius: .5rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 800; color: #fff;
  flex-shrink: 0;
}
.op-cell-name { font-size: .95rem; font-weight: 700; color: #e2e8f0; margin:0; }
.op-cell-role { font-size: .75rem; color: #64748b; margin:0; }

.cell-num { padding: 1rem; text-align: right; font-weight: 700; font-size: 1rem; color: #94a3b8; font-variant-numeric: tabular-nums; }
.cell-total { color: #e2e8f0; background: rgba(255,255,255,.03); }

.cell-attendance { color: #38bdf8; }
.cell-gross { color: #f1f5f9; }
.cell-deduction { color: #fbbf24; }
.cell-net { 
  background: rgba(16,185,129,.08); 
  color: #10b981;
  font-size: 1.1rem;
}

.net-payout-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.lock-icon {
  font-size: 1.2rem;
  color: #ef4444;
}

.frozen {
  color: #64748b;
  text-decoration: line-through;
}

/* Footer */
.footer-row td { background: rgba(255,255,255,.04); border-top: 2px solid rgba(255,255,255,0.1); }
.footer-label  { padding: 1rem; font-size: .85rem; font-weight: 800; color: #64748b; letter-spacing: .08em; text-transform: uppercase; }
.footer-num    { color: #a5b4fc; font-size: 1.1rem; font-weight: 800; padding: 1rem; text-align: right; }
.footer-grand  { color: #c7d2fe; }
.footer-pay    { text-align: right; color: #10b981; font-size: 1rem; }
</style>

