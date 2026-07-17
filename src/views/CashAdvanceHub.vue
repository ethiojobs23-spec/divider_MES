<template>
  <div class="cash-layout">
    <!-- LEFT Sidebar -->
    <aside class="cash-sidebar">
      <!-- Type Selector -->
      <div class="sidebar-section">
        <p class="section-title">Entry Type</p>
        <div class="type-list">
          <button
            class="type-btn"
            :class="{ 'type-btn--active': entryType === 'advance' }"
            @click="entryType = 'advance'"
          >
            <span class="material-symbols-rounded">person</span>
            Employee Advance
          </button>
          <button
            class="type-btn"
            :class="{ 'type-btn--active type-btn--expense': entryType === 'expense' }"
            @click="entryType = 'expense'"
          >
            <span class="material-symbols-rounded">business_center</span>
            Company Expense
          </button>
        </div>
      </div>

      <!-- Operator (Advance only) -->
      <div v-if="entryType === 'advance'" class="sidebar-section">
        <p class="section-title">Recipient</p>
        <div class="op-list">
          <button
            v-for="op in store.operators"
            :key="op.id"
            class="op-btn"
            :class="{ 'op-btn--active': selectedOp?.id === op.id }"
            @click="selectedOp = op"
          >
            <div class="op-dot" :class="op.color">{{ op.avatar }}</div>
            {{ op.name }}
          </button>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="summary-card">
        <div class="summary-item">
          <span>Total Advances</span>
          <strong class="summary-val">{{ store.totalAdvances }} ETB</strong>
        </div>
        <div class="summary-item">
          <span>Total Expenses</span>
          <strong class="summary-val summary-val--exp">{{ store.totalExpenses }} ETB</strong>
        </div>
      </div>

      <!-- Recent entries -->
      <div class="sidebar-section flex-1">
        <p class="section-title">Recent Entries</p>
        <div class="entry-list">
          <div v-for="e in recentEntries" :key="e.id" class="entry-item">
            <span class="entry-type" :class="e.type === 'advance' ? 'type--adv' : 'type--exp'">
              {{ e.type === 'advance' ? 'ADV' : 'EXP' }}
            </span>
            <div class="entry-body">
              <p class="entry-who">{{ e.operator }}</p>
              <p class="entry-note">{{ e.note || '—' }}</p>
            </div>
            <span class="entry-amount">{{ e.amount }} ETB</span>
          </div>
          <p v-if="!recentEntries.length" class="empty-hint">No entries yet</p>
        </div>
      </div>
    </aside>

    <!-- MAIN: Input Area -->
    <main class="cash-main">
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
    </main>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

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

function submitEntry() {
  if (!canSubmit.value) return
  store.addCashEntry({
    type:     entryType.value,
    amount:   Number(inputAmount.value),
    operator: entryType.value === 'advance' ? (selectedOp.value?.name ?? 'Unknown') : 'Company',
    note:     note.value,
  })
  showToast(`${entryType.value === 'advance' ? 'Advance' : 'Expense'} of ${inputAmount.value} ETB logged ✓`)
  inputAmount.value = ''
  note.value = ''
}

const recentEntries = computed(() => [...store.cashEntries].reverse().slice(0, 8))
</script>

<style scoped>
.cash-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* Sidebar */
.cash-sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  border-right: 1px solid rgba(245,158,11,.2);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: 1rem;
  overflow: hidden;
}
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
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 2rem;
  gap: 1rem;
  position: relative;
  overflow: hidden;
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
</style>
