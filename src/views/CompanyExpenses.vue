<template>
  <AppLayout>
    <div class="cex-wrapper">

      <!-- ─── Header ─────────────────────────────────────────────────── -->
      <header class="cex-header">
        <span class="material-symbols-rounded header-icon">receipt_long</span>
        <div class="header-text">
          <h1 class="header-title">አጠቃላይ ለድርጅቱ ሰራተኛ የምወጣው የወጭ ዝርዝር መያዣ</h1>
          <p class="header-sub">Company Employee General Expense Tracker</p>
        </div>
        <div class="header-stats">
          <div class="stat-chip">
            <span class="stat-label">Entries</span>
            <span class="stat-val">{{ expenses.length }}</span>
          </div>
          <div class="stat-chip stat-chip--total">
            <span class="stat-label">Total</span>
            <span class="stat-val">{{ grandTotal }} Br</span>
          </div>
        </div>
      </header>

      <!-- ─── Body ──────────────────────────────────────────────────── -->
      <div class="cex-body">

        <!-- LEFT: Entry Form -->
        <aside class="cex-form-panel">
          <div class="form-card">
            <p class="form-section-title">
              <span class="material-symbols-rounded">add_circle</span>
              New Expense Entry
            </p>

            <!-- Date -->
            <div class="form-group">
              <label class="form-label">
                <span class="material-symbols-rounded">calendar_today</span>
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                class="form-input"
                v-model="form.date"
              />
            </div>

            <!-- Employee Name -->
            <div class="form-group">
              <label class="form-label">
                <span class="material-symbols-rounded">person</span>
                Employee Name
              </label>
              <div class="quick-names">
                <button
                  v-for="op in operators"
                  :key="op.id"
                  class="qname-btn"
                  :class="{ 'qname-btn--active': form.employeeName === op.name }"
                  @click="form.employeeName = op.name"
                >{{ op.name }}</button>
              </div>
              <input
                id="expense-employee"
                type="text"
                class="form-input"
                v-model="form.employeeName"
                placeholder="Employee name…"
              />
            </div>

            <!-- Expense Description -->
            <div class="form-group">
              <label class="form-label">
                <span class="material-symbols-rounded">description</span>
                Expense Description
              </label>
              <div class="quick-descs">
                <button
                  v-for="desc in commonDescriptions"
                  :key="desc"
                  class="qdesc-btn"
                  :class="{ 'qdesc-btn--active': form.description === desc }"
                  @click="form.description = desc"
                >{{ desc }}</button>
              </div>
              <textarea
                id="expense-description"
                class="form-textarea"
                v-model="form.description"
                rows="2"
                placeholder="Expense description…"
              ></textarea>
            </div>

            <!-- Amount -->
            <div class="form-group">
              <label class="form-label">
                <span class="material-symbols-rounded">payments</span>
                Amount (Birr)
              </label>
              <VirtualNumpad
                label="Amount in Birr"
                v-model="form.amount"
                :maxLen="8"
              />
            </div>

            <!-- Preview -->
            <div class="entry-preview" v-if="canSubmit">
              <div class="preview-row">
                <span class="prev-key">Employee</span>
                <span class="prev-val">{{ form.employeeName }}</span>
              </div>
              <div class="preview-row">
                <span class="prev-key">Date</span>
                <span class="prev-val">{{ form.date }}</span>
              </div>
              <div class="preview-row">
                <span class="prev-key">Amount</span>
                <span class="prev-val prev-amount">{{ form.amount }} Birr</span>
              </div>
            </div>

            <!-- LOG EXPENSE Button -->
            <button
              id="btn-log-expense"
              class="log-expense-btn"
              :disabled="!canSubmit"
              @click="logExpense"
            >
              <span class="material-symbols-rounded">add_circle</span>
              LOG EXPENSE
            </button>
          </div>
        </aside>

        <!-- RIGHT: Expense Ledger -->
        <main class="cex-ledger">
          <div class="ledger-header">
            <p class="ledger-title">
              <span class="material-symbols-rounded">list_alt</span>
              Expense Ledger
            </p>
            <div class="ledger-controls">
              <input
                class="search-input"
                type="text"
                v-model="searchQuery"
                placeholder="Search by name or description…"
              />
              <button class="clear-btn" v-if="expenses.length" @click="confirmClear">
                <span class="material-symbols-rounded">delete_sweep</span>
                Clear All
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="ledger-scroll w-full overflow-x-auto">
            <table class="expense-table" v-if="filteredExpenses.length">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(exp, i) in filteredExpenses"
                  :key="exp.id"
                  class="expense-row"
                  :class="{ 'row--even': i % 2 === 0 }"
                >
                  <td class="col-num">{{ i + 1 }}</td>
                  <td class="col-date">{{ exp.date }}</td>
                  <td class="col-emp">
                    <span class="emp-badge">{{ exp.employeeName }}</span>
                  </td>
                  <td class="col-desc">{{ exp.description }}</td>
                  <td class="col-amount">{{ exp.amount }} <span class="unit-br">Br</span></td>
                  <td class="col-action">
                    <button class="del-btn" @click="deleteExpense(exp.id)">
                      <span class="material-symbols-rounded">delete</span>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="4" class="totals-label">TOTAL</td>
                  <td class="totals-amount">{{ filteredTotal }} <span class="unit-br">Br</span></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <!-- Empty State -->
            <div v-else class="ledger-empty">
              <span class="material-symbols-rounded empty-icon">receipt_long</span>
              <p class="empty-title">No expenses logged yet</p>
              <p class="empty-sub">Use the form on the left to add expense entries</p>
            </div>
          </div>
        </main>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="cex-toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import AppLayout  from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ─── Operators from store ──────────────────────────────────────────────────
const operators = computed(() => store.operators)

// ─── Common descriptions ───────────────────────────────────────────────────
const commonDescriptions = [
  'Transport', 'Lunch', 'Medical', 'Overtime Bonus',
  'Materials', 'Maintenance', 'Advance', 'Allowance',
]

// ─── Form ──────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]
const form = reactive({
  date:         today,
  employeeName: '',
  description:  '',
  amount:       '',
})

const canSubmit = computed(() =>
  form.date && form.employeeName.trim() && form.description.trim() && Number(form.amount) > 0
)

// ─── Expense List ──────────────────────────────────────────────────────────
const expenses = ref([])
const searchQuery = ref('')

const filteredExpenses = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return expenses.value
  return expenses.value.filter(e =>
    e.employeeName.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q)
  )
})

const grandTotal = computed(() =>
  expenses.value.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)
)
const filteredTotal = computed(() =>
  filteredExpenses.value.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)
)

function logExpense() {
  if (!canSubmit.value) return
  expenses.value.unshift({
    id:           Date.now(),
    date:         form.date,
    employeeName: form.employeeName.trim(),
    description:  form.description.trim(),
    amount:       Number(form.amount),
    timestamp:    new Date().toISOString(),
  })
  showToast(`Expense logged — ${form.employeeName}: ${form.amount} Birr`)
  // Reset amount and description; keep name and date
  form.amount      = ''
  form.description = ''
}

function deleteExpense(id) {
  expenses.value = expenses.value.filter(e => e.id !== id)
}

function confirmClear() {
  if (confirm(`Clear all ${expenses.value.length} expense entries?`)) {
    expenses.value = []
  }
}

// ─── Toast ─────────────────────────────────────────────────────────────────
const toast = reactive({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────────────────────────── */
.cex-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f172a;
  position: relative;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.cex-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .9rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.25);
  flex-shrink: 0;
}
.header-icon { font-size: 2rem; color: #10b981; flex-shrink: 0; }
.header-text { flex: 1; min-width: 0; }
.header-title {
  font-size: .95rem;
  font-weight: 800;
  color: #f1f5f9;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-sub { font-size: .62rem; color: #64748b; letter-spacing: .05em; }

.header-stats { display: flex; gap: .65rem; flex-shrink: 0; }
.stat-chip {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .6rem;
  padding: .35rem .85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .1rem;
}
.stat-chip--total { background: rgba(16,185,129,.1); border-color: rgba(16,185,129,.3); }
.stat-label { font-size: .55rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .08em; }
.stat-val   { font-size: 1rem; font-weight: 800; color: #e2e8f0; font-variant-numeric: tabular-nums; }
.stat-chip--total .stat-val { color: #34d399; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.cex-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── Form Panel ──────────────────────────────────────────────────────────── */
.cex-form-panel {
  width: 26rem;
  flex-shrink: 0;
  background: #0f172a;
  border-right: 1px solid rgba(255,255,255,.06);
  overflow-y: auto;
  padding: 1rem;
}
.form-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .9rem;
}
.form-section-title {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .65rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .1em;
  padding-bottom: .6rem;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.form-section-title .material-symbols-rounded { font-size: 1rem; color: #10b981; }

.form-group { display: flex; flex-direction: column; gap: .4rem; }
.form-label {
  display: flex;
  align-items: center;
  gap: .35rem;
  font-size: .65rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.form-label .material-symbols-rounded { font-size: .9rem; }

.form-input {
  width: 100%;
  height: 3.25rem;
  background: #0f172a;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: .6rem;
  color: #e2e8f0;
  font-size: .95rem;
  font-weight: 600;
  padding: 0 1rem;
  outline: none;
  font-family: inherit;
  transition: border-color .13s;
  box-sizing: border-box;
}
.form-input:focus { border-color: #10b981; }

.form-textarea {
  width: 100%;
  background: #0f172a;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: .6rem;
  color: #e2e8f0;
  font-size: .9rem;
  font-weight: 600;
  padding: .75rem 1rem;
  outline: none;
  font-family: inherit;
  resize: none;
  transition: border-color .13s;
  box-sizing: border-box;
}
.form-textarea:focus { border-color: #10b981; }

/* Quick Names */
.quick-names, .quick-descs { display: flex; gap: .35rem; flex-wrap: wrap; }
.qname-btn, .qdesc-btn {
  height: 2.2rem;
  padding: 0 .65rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .4rem;
  color: #94a3b8;
  font-size: .7rem;
  font-weight: 700;
  cursor: pointer;
  transition: all .13s ease;
  white-space: nowrap;
}
.qname-btn:hover, .qdesc-btn:hover { background: #1e293b; color: #e2e8f0; }
.qname-btn--active, .qdesc-btn--active {
  background: rgba(16,185,129,.15);
  border-color: #10b981;
  color: #34d399;
}

/* Entry Preview */
.entry-preview {
  background: rgba(16,185,129,.06);
  border: 1px solid rgba(16,185,129,.2);
  border-radius: .65rem;
  padding: .75rem .9rem;
  display: flex;
  flex-direction: column;
  gap: .3rem;
}
.preview-row { display: flex; justify-content: space-between; align-items: center; }
.prev-key  { font-size: .6rem; font-weight: 700; color: #475569; text-transform: uppercase; }
.prev-val  { font-size: .82rem; font-weight: 700; color: #94a3b8; }
.prev-amount { font-size: 1.1rem; color: #34d399; font-variant-numeric: tabular-nums; }

/* ── LOG EXPENSE Button ───────────────────────────────────────────────────── */
.log-expense-btn {
  height: 5.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: .9rem;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: .12em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  transition: all .13s ease;
  box-shadow: 0 8px 24px rgba(16,185,129,.25);
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.log-expense-btn:disabled { opacity: .3; cursor: not-allowed; box-shadow: none; }
.log-expense-btn:not(:disabled):hover  { filter: brightness(1.1); box-shadow: 0 12px 32px rgba(16,185,129,.35); }
.log-expense-btn:not(:disabled):active { transform: scale(.98); }
.log-expense-btn .material-symbols-rounded { font-size: 1.5rem; }

/* ── Ledger Panel ────────────────────────────────────────────────────────── */
.cex-ledger {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1rem 1.25rem;
  gap: .75rem;
}
.ledger-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
}
.ledger-title {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .85rem;
  font-weight: 700;
  color: #94a3b8;
  flex-shrink: 0;
}
.ledger-title .material-symbols-rounded { font-size: 1.1rem; color: #10b981; }

.ledger-controls { display: flex; gap: .65rem; flex: 1; justify-content: flex-end; }
.search-input {
  height: 2.6rem;
  min-width: 14rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .55rem;
  color: #e2e8f0;
  font-size: .85rem;
  padding: 0 .85rem;
  outline: none;
  font-family: inherit;
  transition: border-color .13s;
}
.search-input:focus { border-color: #10b981; }
.clear-btn {
  height: 2.6rem;
  padding: 0 1rem;
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.25);
  border-radius: .55rem;
  color: #f87171;
  font-size: .75rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .35rem;
  transition: all .13s ease;
}
.clear-btn:hover { background: rgba(239,68,68,.2); }

/* ── Expense Table ───────────────────────────────────────────────────────── */
.ledger-scroll { flex: 1; overflow-y: auto; }
.expense-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 3px;
}
.expense-table thead th {
  padding: .55rem .75rem;
  background: #1e293b;
  color: #64748b;
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  text-align: left;
}
.expense-table thead th:first-child { border-radius: .45rem 0 0 .45rem; }
.expense-table thead th:last-child  { border-radius: 0 .45rem .45rem 0; }

.expense-row td {
  padding: .65rem .75rem;
  background: rgba(255,255,255,.02);
  border-top: 1px solid rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.04);
  vertical-align: middle;
  transition: background .1s;
}
.expense-row:hover td { background: rgba(255,255,255,.05); }
.row--even td { background: rgba(255,255,255,.03); }
.expense-row td:first-child { border-radius: .45rem 0 0 .45rem; border-left: 1px solid rgba(255,255,255,.06); }
.expense-row td:last-child  { border-radius: 0 .45rem .45rem 0; border-right: 1px solid rgba(255,255,255,.06); }

.col-num    { color: #475569; font-size: .7rem; font-weight: 700; width: 2.5rem; }
.col-date   { color: #94a3b8; font-size: .78rem; font-weight: 600; white-space: nowrap; }
.col-emp    { }
.emp-badge  {
  display: inline-block;
  background: rgba(99,102,241,.15);
  color: #a5b4fc;
  border-radius: .35rem;
  padding: .2rem .55rem;
  font-size: .75rem;
  font-weight: 700;
}
.col-desc  { color: #94a3b8; font-size: .8rem; max-width: 16rem; }
.col-amount {
  font-size: 1rem;
  font-weight: 800;
  color: #34d399;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.unit-br { font-size: .65rem; color: #059669; font-weight: 600; }
.col-action { width: 3rem; }
.del-btn {
  width: 2.1rem; height: 2.1rem;
  background: rgba(239,68,68,.1);
  border: none;
  border-radius: .4rem;
  color: #f87171;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .13s ease;
}
.del-btn:hover { background: rgba(239,68,68,.25); }
.del-btn .material-symbols-rounded { font-size: .95rem; }

/* Totals Footer */
.totals-row td {
  padding: .65rem .75rem;
  background: rgba(16,185,129,.08);
  border-top: 1px solid rgba(16,185,129,.2);
}
.totals-label {
  color: #64748b;
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.totals-amount {
  font-size: 1.1rem;
  font-weight: 900;
  color: #34d399;
  font-variant-numeric: tabular-nums;
}

/* Empty State */
.ledger-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: .65rem;
  color: #334155;
  padding: 3rem;
}
.empty-icon  { font-size: 4rem; display: block; }
.empty-title { font-size: 1rem; font-weight: 700; }
.empty-sub   { font-size: .78rem; color: #475569; text-align: center; }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.cex-toast {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16,185,129,.9);
  color: #fff;
  border-radius: .65rem;
  padding: .75rem 1.5rem;
  font-size: .9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: .4rem;
  backdrop-filter: blur(8px);
  z-index: 10;
  white-space: nowrap;
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>
