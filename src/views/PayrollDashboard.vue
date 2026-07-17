<template>
  <div class="payroll-layout">
    <!-- Header Bar -->
    <div class="payroll-header">
      <div class="header-left">
        <span class="material-symbols-rounded header-icon">account_balance_wallet</span>
        <div>
          <h1 class="header-title">Weekly Payroll Dashboard</h1>
          <p class="header-sub">{{ store.currentProductionWeek }} &bull; Auto-aggregated from production ledger</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-chip">
          <span>Total Production</span>
          <strong>{{ store.weeklyAggregation.TOTAL }} pcs</strong>
        </div>
        <div class="stat-chip">
          <span>Advances Paid</span>
          <strong class="stat-warn">{{ store.totalAdvances }} ETB</strong>
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
            <!-- Financial Payouts -->
            <th colspan="5" class="group-header group-header--pay">Financial Payouts (ETB)</th>
          </tr>
          <tr>
            <th class="col-op"></th>
            <!-- Prod sub-headers -->
            <th v-for="ph in prodHeaders" :key="ph" class="subhead subhead--prod">{{ ph }}</th>
            <!-- Pay sub-headers -->
            <th v-for="fh in finHeaders" :key="fh" class="subhead subhead--pay">{{ fh }}</th>
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

            <!-- Financial data (stub – derived from advances) -->
            <td class="cell-num cell-pay">{{ getAdvance(op.id, 'now') }}</td>
            <td class="cell-num cell-pay">{{ getAdvance(op.id, 'withdr') }}</td>
            <td class="cell-num cell-bonus">{{ getBonus(op.id) }}</td>
            <td class="cell-num cell-pay">{{ getPrevious(op.id) }}</td>
            <td class="cell-num cell-total cell-grand">{{ getGrandTotal(op.id) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="footer-row">
            <td class="cell-op footer-label">WEEK TOTAL</td>
            <td class="cell-num footer-num">{{ store.weeklyAggregation['M&T'] }}</td>
            <td class="cell-num footer-num">{{ store.weeklyAggregation['W&T'] }}</td>
            <td class="cell-num footer-num">{{ store.weeklyAggregation['F&S'] }}</td>
            <td class="cell-num footer-num footer-grand">{{ store.weeklyAggregation.TOTAL }}</td>
            <td colspan="5" class="cell-num footer-num footer-pay">
              Total Payouts: {{ store.totalAdvances + store.totalExpenses }} ETB
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

const store = useMesStore()

const prodHeaders = ['M&T', 'W&T', 'F&S', 'TOTAL']
const finHeaders  = ['NOW', 'WITHDR', 'BONUS', 'PREVIOUS', 'TOTAL']

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

// Financial helpers – derive from cashEntries
function getAdvance(opId, type) {
  const op = store.operators.find(o => o.id === opId)
  if (!op) return 0
  if (type === 'now') {
    return store.cashEntries
      .filter(e => e.operator === op.name && e.type === 'advance')
      .slice(-1)[0]?.amount ?? 0
  }
  if (type === 'withdr') {
    return store.cashEntries
      .filter(e => e.operator === op.name && e.type === 'advance' && e.note === 'Weekly Advance')
      .reduce((s, e) => s + Number(e.amount), 0)
  }
  return 0
}

function getBonus(opId) {
  const op = store.operators.find(o => o.id === opId)
  if (!op) return 0
  return store.cashEntries
    .filter(e => e.operator === op.name && e.note === 'Bonus')
    .reduce((s, e) => s + Number(e.amount), 0)
}

function getPrevious(opId) { return 0 } // placeholder for carry-over logic

function getGrandTotal(opId) {
  return getAdvance(opId, 'now') + getAdvance(opId, 'withdr') + getBonus(opId) + getPrevious(opId)
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
.header-icon   { font-size: 2rem; color: #a5b4fc; }
.header-title  { font-size: 1.2rem; font-weight: 800; color: #f1f5f9; }
.header-sub    { font-size: .75rem; color: #64748b; margin-top: .15rem; }
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
  font-size: .85rem;
}

/* Group headers */
.group-header {
  padding: .6rem 1rem;
  text-align: center;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.group-header--prod { background: rgba(99,102,241,.15); color: #a5b4fc; border-bottom: 2px solid rgba(99,102,241,.4); }
.group-header--pay  { background: rgba(245,158,11,.1); color: #fbbf24; border-bottom: 2px solid rgba(245,158,11,.3); }

.subhead {
  padding: .55rem .75rem;
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.subhead--prod { color: #6366f1; background: rgba(99,102,241,.08); }
.subhead--pay  { color: #d97706; background: rgba(245,158,11,.07); }

.col-op { width: 14rem; }

/* Rows */
.data-row td { border-bottom: 1px solid rgba(255,255,255,.05); }
.data-row:hover td { background: rgba(255,255,255,.03); }

.cell-op { padding: .75rem 1rem; }
.op-cell { display: flex; align-items: center; gap: .65rem; }
.op-avatar-sm {
  width: 2rem; height: 2rem;
  border-radius: .4rem;
  display: flex; align-items: center; justify-content: center;
  font-size: .8rem; font-weight: 800; color: #fff;
  flex-shrink: 0;
}
.op-cell-name { font-size: .85rem; font-weight: 700; color: #e2e8f0; }
.op-cell-role { font-size: .65rem; color: #64748b; }

.cell-num { padding: .75rem .9rem; text-align: right; font-weight: 700; font-size: .9rem; color: #94a3b8; font-variant-numeric: tabular-nums; }
.cell-total { color: #e2e8f0; background: rgba(255,255,255,.03); }
.cell-pay   { color: #fbbf24; }
.cell-bonus { color: #34d399; }
.cell-grand { background: rgba(245,158,11,.08); color: #fbbf24; }

/* Footer */
.footer-row td { background: rgba(255,255,255,.04); }
.footer-label  { padding: .75rem 1rem; font-size: .75rem; font-weight: 800; color: #64748b; letter-spacing: .08em; text-transform: uppercase; }
.footer-num    { color: #a5b4fc; font-size: .9rem; font-weight: 800; padding: .75rem .9rem; text-align: right; }
.footer-grand  { color: #c7d2fe; }
.footer-pay    { text-align: right; color: #fbbf24; font-size: .82rem; }
</style>
