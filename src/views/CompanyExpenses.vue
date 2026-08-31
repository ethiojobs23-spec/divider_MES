<template>
  <AppLayout>
    <div class="cex-wrapper">

      <!-- ─── Header ─────────────────────────────────────────────────── -->
      <header class="cex-header flex justify-between items-center flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <span class="material-symbols-rounded header-icon">receipt_long</span>
          <div class="header-text">
            <h1 class="header-title">አጠቃላይ ለድርጅቱ ሰራተኛ የምወጣው የወጭ ዝርዝር መያዣ</h1>
            <p class="header-sub">Company Employee & Operations Expense Tracker &bull; {{ store.currentProductionWeek }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync expenses now">
            <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
            <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
          </button>

          <div class="header-stats flex items-center gap-2">
            <div class="stat-chip">
              <span class="stat-label">Entries</span>
              <span class="stat-val">{{ filteredExpenses.length }}</span>
            </div>
            <div class="stat-chip stat-chip--total">
              <span class="stat-label">Total</span>
              <span class="stat-val">{{ grandTotal }} Br</span>
            </div>
          </div>
        </div>
      </header>

      <!-- ─── Body ──────────────────────────────────────────────────── -->
      <div class="cex-body flex-1 overflow-y-auto">

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
                Expense Date
              </label>
              <input
                id="expense-date"
                type="date"
                class="form-input"
                v-model="form.date"
              />
            </div>

            <!-- Employee / Payee Name -->
            <div class="form-group">
              <label class="form-label">
                <span class="material-symbols-rounded">person</span>
                Employee / Payee
              </label>
              <div class="quick-names max-h-24 overflow-y-auto">
                <button
                  v-for="op in operators"
                  :key="op.id"
                  class="qname-btn cursor-pointer"
                  :class="{ 'qname-btn--active': form.employeeName === op.name }"
                  @click="form.employeeName = op.name"
                >{{ op.name }}</button>
              </div>
              <input
                id="expense-employee"
                type="text"
                class="form-input mt-2"
                v-model="form.employeeName"
                placeholder="Or type payee / vendor name..."
              />
            </div>

            <!-- Expense Category & Description -->
            <div class="form-group">
              <label class="form-label">
                <span class="material-symbols-rounded">description</span>
                Expense Category & Description
              </label>
              <div class="quick-descs">
                <button
                  v-for="desc in commonDescriptions"
                  :key="desc"
                  class="qdesc-btn cursor-pointer"
                  :class="{ 'qdesc-btn--active': form.category === desc }"
                  @click="form.category = desc"
                >{{ desc }}</button>
              </div>
              <textarea
                id="expense-description"
                class="form-textarea mt-2"
                v-model="form.description"
                rows="2"
                placeholder="Additional notes / receipt / vendor details…"
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
                :allowDecimal="true"
                :maxLen="8"
              />
            </div>

            <!-- Preview -->
            <div class="entry-preview" v-if="canSubmit">
              <div class="preview-row">
                <span class="prev-key">Payee</span>
                <span class="prev-val">{{ form.employeeName }}</span>
              </div>
              <div class="preview-row">
                <span class="prev-key">Category</span>
                <span class="prev-val">{{ form.category || 'General' }}</span>
              </div>
              <div class="preview-row">
                <span class="prev-key">Date</span>
                <span class="prev-val">{{ form.date }}</span>
              </div>
              <div class="preview-row">
                <span class="prev-key">Amount</span>
                <span class="prev-val prev-amount">{{ Number(form.amount).toFixed(2) }} Birr</span>
              </div>
            </div>

            <!-- LOG EXPENSE Button -->
            <button
              id="btn-log-expense"
              class="log-expense-btn cursor-pointer"
              :disabled="!canSubmit || isSaving"
              @click="logExpense"
            >
              <span class="material-symbols-rounded">add_circle</span>
              {{ isSaving ? 'SAVING EXPENSE...' : `LOG EXPENSE – ${form.amount ? Number(form.amount).toFixed(2) + ' Br' : ''}` }}
            </button>
          </div>
        </aside>

        <!-- RIGHT: Expense Ledger -->
        <main class="cex-ledger">
          <div class="ledger-header flex justify-between items-center flex-wrap gap-2">
            <p class="ledger-title flex items-center gap-2">
              <span class="material-symbols-rounded text-indigo-400">list_alt</span>
              Company Expense Ledger
            </p>
            <div class="ledger-controls flex items-center gap-2">
              <input
                class="search-input"
                type="text"
                v-model="searchQuery"
                placeholder="Search by payee, category, or note…"
              />
            </div>
          </div>

          <!-- Table -->
          <div class="ledger-scroll w-full overflow-x-auto">
            <table class="expense-table" v-if="filteredExpenses.length">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Payee / Employee</th>
                  <th>Category / Note</th>
                  <th class="text-right">Amount</th>
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
                  <td class="col-amount text-right font-mono font-bold text-emerald-400">
                    {{ Number(exp.amount).toFixed(2) }} <span class="unit-br text-slate-400">Br</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="4" class="totals-label">TOTAL EXPENSES</td>
                  <td class="totals-amount text-right font-mono font-bold text-emerald-400">
                    {{ filteredTotal }} <span class="unit-br text-slate-400">Br</span>
                  </td>
                </tr>
              </tfoot>
            </table>

            <!-- Empty State -->
            <div v-else class="ledger-empty">
              <span class="material-symbols-rounded empty-icon">receipt_long</span>
              <p class="empty-title">No expenses logged yet</p>
              <p class="empty-sub">Use the form on the left to record company petty cash or employee expenses</p>
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
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import AppLayout  from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const isSyncing = ref(false)
const isSaving = ref(false)
let refreshTimer = null

// ─── Operators from store ──────────────────────────────────────────────────
const operators = computed(() => store.operators.filter(o => o.role !== 'customer'))

// ─── Common descriptions ───────────────────────────────────────────────────
const commonDescriptions = [
  'Transport / Fuel', 'Lunch / Meals', 'Medical / Clinic',
  'Materials / Packaging', 'Machine Maintenance', 'Factory Utilities', 'Allowance', 'Other'
]

// ─── Form ──────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]
const form = reactive({
  date:         today,
  employeeName: '',
  category:     'Transport / Fuel',
  description:  '',
  amount:       '',
})

const canSubmit = computed(() =>
  form.date && form.employeeName.trim() && Number(form.amount) > 0
)

async function manualSync() {
  isSyncing.value = true
  try {
    await store.fetchInitialData()
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await store.fetchInitialData()
  refreshTimer = setInterval(async () => {
    await store.fetchInitialData()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// ─── Expense List from Store ────────────────────────────────────────────────
const expenses = computed(() => {
  return (store.cashEntries || [])
    .filter(e => e.type === 'expense')
    .map(e => {
      const dateVal = e.timestamp ? e.timestamp.split('T')[0] : (e.transaction_date || today)
      return {
        id: e.id,
        date: dateVal,
        employeeName: e.operator || 'Company',
        description: e.note || 'General Expense',
        amount: Number(e.amount || 0),
        raw: e
      }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

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

async function logExpense() {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true

  const fullNote = form.description.trim() 
    ? `${form.category}: ${form.description.trim()}`
    : form.category

  const ok = await store.addCashEntry({
    type:     'expense',
    amount:   Number(form.amount),
    operator: form.employeeName.trim(),
    note:     fullNote,
  })

  isSaving.value = false

  if (ok !== false) {
    showToast(`✓ Expense of ${Number(form.amount).toFixed(2)} Br logged for ${form.employeeName}`)
    form.amount = ''
    form.description = ''
  } else {
    showToast('⚠ Failed to save expense. Check connection.')
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
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.25);
  flex-shrink: 0;
}
.header-icon { font-size: 2rem; color: #a855f7; }
.header-title { font-size: 1.15rem; font-weight: 800; color: #f1f5f9; margin: 0; }
.header-sub   { font-size: 0.72rem; color: #64748b; margin: 0.15rem 0 0; }

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.stat-chip {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.06);
  padding: 0.35rem 0.75rem; border-radius: 0.5rem; text-align: center;
}
.stat-chip--total { border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.1); }
.stat-label { font-size: 0.6rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; }
.stat-val   { font-size: 0.95rem; font-weight: 900; color: #f1f5f9; font-family: monospace; }
.stat-chip--total .stat-val { color: #c084fc; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.cex-body {
  display: grid; grid-template-columns: 380px 1fr; gap: 1.25rem; padding: 1.25rem;
}
@media (max-width: 1024px) {
  .cex-body { grid-template-columns: 1fr; }
}

.cex-form-panel { display: flex; flex-direction: column; }
.form-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;
}
.form-section-title {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.75rem; font-weight: 800; color: #c084fc;
  text-transform: uppercase; letter-spacing: 0.05em; margin: 0;
}

.form-group { display: flex; flex-direction: column; gap: 0.35rem; }
.form-label {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;
}
.form-input, .form-textarea {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.1);
  color: #fff; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.8rem; outline: none;
}
.form-input:focus, .form-textarea:focus { border-color: #a855f7; }

.quick-names, .quick-descs { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.qname-btn, .qdesc-btn {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.06);
  color: #94a3b8; font-size: 0.68rem; font-weight: 700;
  padding: 0.3rem 0.6rem; border-radius: 0.4rem; transition: all 0.15s;
}
.qname-btn:hover, .qdesc-btn:hover { color: #fff; }
.qname-btn--active, .qdesc-btn--active { background: rgba(168,85,247,0.2); border-color: #a855f7; color: #c084fc; }

.entry-preview {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.6rem; padding: 0.6rem 0.85rem;
}
.preview-row { display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.2rem; }
.prev-key { color: #64748b; }
.prev-val { color: #f1f5f9; font-weight: 700; }
.prev-amount { color: #34d399; font-family: monospace; font-weight: 900; }

.log-expense-btn {
  width: 100%; height: 3rem; background: linear-gradient(135deg, #a855f7, #7e22ce);
  border: none; border-radius: 0.75rem; color: #fff;
  font-size: 0.88rem; font-weight: 900; letter-spacing: 0.05em;
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  transition: all 0.15s; box-shadow: 0 4px 15px rgba(168,85,247,0.25);
}
.log-expense-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.log-expense-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; box-shadow: none; transform: none; }

/* Ledger Main */
.cex-ledger {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
}
.ledger-title { font-size: 0.85rem; font-weight: 800; color: #f1f5f9; text-transform: uppercase; margin: 0; }
.search-input {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.1);
  color: #fff; border-radius: 0.5rem; padding: 0.4rem 0.75rem; font-size: 0.75rem; outline: none; width: 220px;
}

.expense-table { width: 100%; border-collapse: collapse; text-align: left; }
.expense-table th {
  padding: 0.6rem 0.75rem; font-size: 0.68rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.08);
}
.expense-table td {
  padding: 0.65rem 0.75rem; font-size: 0.75rem; color: #cbd5e1;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.expense-row:hover { background: rgba(255,255,255,0.02); }
.emp-badge {
  background: rgba(99,102,241,0.15); color: #a5b4fc;
  padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 700;
}
.totals-row td {
  padding: 0.85rem 0.75rem; font-weight: 800; border-top: 2px solid rgba(255,255,255,0.1);
  color: #fff; font-size: 0.85rem;
}

.ledger-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 4rem 1rem; color: #64748b; text-align: center;
}
.empty-icon { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.6; }
.empty-title { font-size: 0.95rem; font-weight: 700; color: #94a3b8; margin: 0 0 0.25rem; }
.empty-sub { font-size: 0.75rem; margin: 0; }

.cex-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
