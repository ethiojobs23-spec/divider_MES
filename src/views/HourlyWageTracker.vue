<template>
  <AppLayout>
    <div class="hwt-wrapper">

      <!-- ─── Header ─────────────────────────────────────────────────── -->
      <header class="hwt-header flex justify-between items-center flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <span class="material-symbols-rounded header-icon">schedule</span>
          <div class="header-text">
            <h1 class="header-title">TIME — Hourly Wage Tracker</h1>
            <p class="header-sub">
              {{ currentOperator ? currentOperator.name : 'Select Worker' }} &bull; Rate: {{ hourlyRate }} ETB/hr &bull; {{ store.currentProductionWeek }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync hourly data now">
            <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
            <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
          </button>

          <div class="rate-display-chip">
            <span class="rate-label">Active Rate</span>
            <span class="rate-value">{{ hourlyRate }} Br/hr</span>
          </div>
        </div>
      </header>

      <!-- ─── Body ──────────────────────────────────────────────────── -->
      <div class="hwt-body flex-1 overflow-y-auto">

        <!-- LEFT: Operator Picker + Rate Configurator + Summary -->
        <aside class="hwt-sidebar">

          <!-- Operator Selector Card -->
          <div class="card operator-card">
            <p class="card-label">
              <span class="material-symbols-rounded">person</span>
              Select Worker
            </p>
            <div class="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-900/50 rounded-lg border border-white/5">
              <button
                v-for="op in store.operators.filter(o => o.role !== 'customer')"
                :key="op.id"
                class="flex items-center gap-2 p-1.5 rounded-lg border text-left cursor-pointer transition-all"
                :class="selectedOperatorId === op.id ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'"
                @click="selectOperator(op)"
              >
                <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="sm" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold m-0 truncate">{{ op.name }}</p>
                  <p class="text-[0.65rem] text-slate-500 m-0">{{ op.role }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Rate Slider Card -->
          <div class="card rate-card">
            <p class="card-label">
              <span class="material-symbols-rounded">tune</span>
              Hourly Rate (Birr / hr)
            </p>
            <div class="rate-stepper">
              <button class="step-btn step-btn--down cursor-pointer" @click="decrementRate" :disabled="hourlyRate <= rateRange.min">
                <span class="material-symbols-rounded">remove</span>
              </button>
              <div class="rate-display">
                <span class="rate-big">{{ hourlyRate }}</span>
                <span class="rate-unit">Birr/hr</span>
              </div>
              <button class="step-btn step-btn--up cursor-pointer" @click="incrementRate" :disabled="hourlyRate >= rateRange.max">
                <span class="material-symbols-rounded">add</span>
              </button>
            </div>

            <!-- Rate Range Slider -->
            <div class="slider-wrapper">
              <span class="slider-min">{{ rateRange.min }}</span>
              <input
                type="range"
                class="rate-slider cursor-pointer"
                :min="rateRange.min"
                :max="rateRange.max"
                :step="rateRange.step"
                v-model.number="hourlyRate"
              />
              <span class="slider-max">{{ rateRange.max }}</span>
            </div>

            <div class="rate-presets">
              <button
                v-for="preset in ratePresets"
                :key="preset"
                class="preset-btn cursor-pointer"
                :class="{ 'preset-btn--active': hourlyRate === preset }"
                @click="hourlyRate = preset"
              >{{ preset }} Br</button>
            </div>
          </div>

          <!-- Summary Card -->
          <div class="card summary-card flex-1">
            <p class="card-label">
              <span class="material-symbols-rounded">summarize</span>
              Week Hourly Summary
            </p>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="si-label">Total Hours</span>
                <span class="si-val">{{ totalWeeklyHours.toFixed(1) }}<small>h</small></span>
              </div>
              <div class="summary-item">
                <span class="si-label">Entries</span>
                <span class="si-val">{{ weeklyHourlyEntries.length }}</span>
              </div>
              <div class="summary-item summary-item--gross">
                <span class="si-label">Est. Earnings</span>
                <span class="si-val si-val--gross">{{ totalWeeklyEarnings.toFixed(2) }}<small>Br</small></span>
              </div>
            </div>

            <!-- Entries Log -->
            <div class="log-list mt-3 flex-1 overflow-y-auto max-h-60" v-if="weeklyHourlyEntries.length">
              <p class="log-title">Recent Hourly Logs</p>
              <div
                v-for="entry in weeklyHourlyEntries.slice(0, 10)"
                :key="entry.id"
                class="log-entry"
              >
                <div class="flex-1 min-w-0">
                  <p class="log-meta font-bold text-slate-200">{{ entry.operator }}</p>
                  <p class="text-[0.65rem] text-slate-400">{{ entry.productionDate || entry.timestamp.split('T')[0] }}</p>
                </div>
                <span class="log-hours">{{ entry.hoursWorked }}h</span>
                <span class="log-pay">{{ (Number(entry.hoursWorked) * hourlyRate).toFixed(0) }}Br</span>
              </div>
            </div>
            <div v-else class="log-empty">No hourly entries logged this week</div>
          </div>
        </aside>

        <!-- RIGHT: Hours Numpad -->
        <main class="hwt-main">
          <div class="numpad-card">
            <div class="numpad-top">
              <p class="numpad-context-label">Log Hours Worked</p>
              <div class="gross-preview" v-if="numpadHours">
                <span class="gp-label">Pay Preview</span>
                <span class="gp-val">{{ (hourlyRate * parseFloat(numpadHours || 0)).toFixed(2) }} Birr</span>
              </div>
            </div>

            <!-- Big hour steppers -->
            <div class="hour-quick-btns">
              <button
                v-for="q in quickHours"
                :key="q"
                class="hour-quick-btn cursor-pointer"
                :class="{ 'hour-quick-btn--active': numpadHours === String(q) }"
                @click="numpadHours = String(q)"
              >{{ q }}h</button>
            </div>

            <VirtualNumpad
              label="Hours (e.g. 4 or 7.5)"
              v-model="numpadHours"
              :allowDecimal="true"
              :maxLen="5"
            />

            <!-- Date input -->
            <div class="date-row">
              <label class="date-label">
                <span class="material-symbols-rounded">calendar_today</span>
                Work Date
              </label>
              <input type="date" class="date-input" v-model="entryDate" />
            </div>

            <button
              class="log-btn cursor-pointer"
              :disabled="!canLog || isLogging"
              @click="logHours"
            >
              <span class="material-symbols-rounded">add_circle</span>
              {{ isLogging ? 'LOGGING...' : `LOG ${numpadHours || '0'}h × ${hourlyRate}Br = ${computedGross} Birr` }}
            </button>
          </div>
        </main>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="hwt-toast">
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
import AppLayout from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'

const store = useMesStore()
const payrollStore = usePayrollStore()

const isSyncing = ref(false)
const isLogging = ref(false)
let refreshTimer = null

const selectedOperatorId = ref(null)

const currentOperator = computed(() => {
  if (selectedOperatorId.value) {
    return store.operators.find(o => o.id === selectedOperatorId.value) || null
  }
  return store.activeOperator || null
})

function selectOperator(op) {
  selectedOperatorId.value = op.id
  // If operator has a configured hourly rate in work_types or payroll profile, adopt it
  const opConfig = store.getOperatorWorkConfig(op.id)
  if (opConfig?.hourly_rate) {
    hourlyRate.value = Number(opConfig.hourly_rate)
  }
}

async function manualSync() {
  isSyncing.value = true
  try {
    await Promise.all([
      store.fetchInitialData(),
      payrollStore.fetchLoans()
    ])
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchInitialData(),
    payrollStore.fetchLoans()
  ])
  if (store.activeOperator) {
    selectedOperatorId.value = store.activeOperator.id
  } else if (store.operators.length > 0) {
    selectedOperatorId.value = store.operators[0].id
  }

  refreshTimer = setInterval(async () => {
    await store.fetchInitialData()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// ─── Rate Config ───────────────────────────────────────────────────────────
const rateRange   = { min: 15, max: 100, step: 1 }
const ratePresets = [15, 20, 25, 30, 35, 45, 50]
const hourlyRate  = ref(30)

function incrementRate() { if (hourlyRate.value < rateRange.max) hourlyRate.value++ }
function decrementRate() { if (hourlyRate.value > rateRange.min) hourlyRate.value-- }

// ─── Numpad & Entry ────────────────────────────────────────────────────────
const numpadHours = ref('')
const quickHours  = [4, 6, 8, 10, 12]

const today = new Date().toISOString().split('T')[0]
const entryDate = ref(today)

const canLog = computed(() => {
  const h = parseFloat(numpadHours.value)
  return !isNaN(h) && h > 0 && selectedOperatorId.value !== null
})

const computedGross = computed(() => {
  const h = parseFloat(numpadHours.value) || 0
  return (hourlyRate.value * h).toFixed(2)
})

// ─── Log Entries From Store ────────────────────────────────────────────────
const weeklyHourlyEntries = computed(() => {
  return (store.ledgerEntries || [])
    .filter(e => e.workCategory === 'TIME')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

const totalWeeklyHours = computed(() => {
  return weeklyHourlyEntries.value.reduce((s, e) => s + (Number(e.hoursWorked) || 0), 0)
})

const totalWeeklyEarnings = computed(() => {
  return weeklyHourlyEntries.value.reduce((s, e) => s + (Number(e.hoursWorked || 0) * hourlyRate.value), 0)
})

async function logHours() {
  const h = parseFloat(numpadHours.value)
  if (isNaN(h) || h <= 0 || !currentOperator.value) return

  isLogging.value = true
  const targetTimestamp = new Date(entryDate.value + 'T12:00:00.000Z').toISOString()
  
  const result = await store.submitProductionLog({
    workCategory: 'TIME',
    hoursWorked: h,
    goodProduction: 0,
    wasteMaterial: 0,
    operator_id: currentOperator.value.id,
    production_date: entryDate.value,
    timestamp_override: targetTimestamp,
    hourly_rate: hourlyRate.value
  })

  isLogging.value = false

  if (result && result.ok !== false) {
    showToast(`✓ Logged ${h}h @ ${hourlyRate.value} Br/hr for ${currentOperator.value.name}`)
    numpadHours.value = ''
  } else {
    showToast('⚠ Failed to save hourly log')
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
.hwt-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f172a;
  position: relative;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.hwt-header {
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.25);
  flex-shrink: 0;
}
.header-icon { font-size: 2rem; color: #6366f1; }
.header-title { font-size: 1.25rem; font-weight: 800; color: #f1f5f9; margin: 0; }
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

.rate-display-chip {
  display: flex; align-items: center; gap: 0.5rem;
  background: rgba(99,102,241,0.15); border: 1px solid #6366f1;
  padding: 0.4rem 0.85rem; border-radius: 0.6rem;
}
.rate-label { font-size: 0.65rem; font-weight: 700; color: #a5b4fc; text-transform: uppercase; }
.rate-value { font-size: 1.1rem; font-weight: 900; color: #fff; font-family: monospace; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.hwt-body {
  display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.25rem; padding: 1.25rem;
}
@media (max-width: 1024px) {
  .hwt-body { grid-template-columns: 1fr; }
}

.hwt-sidebar { display: flex; flex-direction: column; gap: 1rem; }
.card {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.1rem;
}
.card-label {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.7rem; font-weight: 800; color: #a5b4fc;
  text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.65rem;
}

/* Rate stepper */
.rate-stepper {
  display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-bottom: 0.75rem;
}
.step-btn {
  width: 2.75rem; height: 2.75rem; border-radius: 50%;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.step-btn:hover { background: #6366f1; }
.step-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.rate-display { text-align: center; }
.rate-big { font-size: 2.5rem; font-weight: 900; color: #f1f5f9; font-family: monospace; }
.rate-unit { font-size: 0.75rem; color: #64748b; margin-left: 0.25rem; }

.slider-wrapper { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem; }
.slider-min, .slider-max { font-size: 0.7rem; color: #64748b; font-family: monospace; }
.rate-slider { flex: 1; accent-color: #6366f1; }

.rate-presets { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.preset-btn {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.08);
  color: #94a3b8; font-size: 0.75rem; font-weight: 700;
  padding: 0.35rem 0.65rem; border-radius: 0.4rem; transition: all 0.15s;
}
.preset-btn:hover { color: #fff; }
.preset-btn--active { background: #6366f1; border-color: #6366f1; color: #fff; }

/* Summary */
.summary-grid { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 0.6rem; }
.summary-item {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.6rem; padding: 0.6rem; text-align: center;
}
.si-label { font-size: 0.62rem; color: #64748b; font-weight: 700; text-transform: uppercase; display: block; }
.si-val   { font-size: 1.1rem; font-weight: 900; color: #f1f5f9; font-family: monospace; }
.si-val--gross { color: #34d399; }

.log-title { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 0.4rem; }
.log-entry {
  display: flex; align-items: center; justify-content: space-between;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.04);
  border-radius: 0.5rem; padding: 0.5rem 0.75rem; margin-bottom: 0.35rem;
}
.log-hours { font-size: 0.85rem; font-weight: 800; color: #a5b4fc; font-family: monospace; margin: 0 0.75rem; }
.log-pay   { font-size: 0.85rem; font-weight: 900; color: #34d399; font-family: monospace; }
.log-empty { font-size: 0.75rem; color: #475569; text-align: center; padding: 1.5rem 0; }

/* Numpad Main */
.hwt-main { display: flex; flex-direction: column; }
.numpad-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
}
.numpad-top { display: flex; justify-content: space-between; align-items: center; }
.numpad-context-label { font-size: 0.75rem; font-weight: 800; color: #a5b4fc; text-transform: uppercase; margin: 0; }
.gross-preview { font-size: 0.85rem; font-weight: 800; color: #34d399; }
.gp-label { font-size: 0.65rem; color: #64748b; margin-right: 0.35rem; }

.hour-quick-btns { display: flex; gap: 0.4rem; }
.hour-quick-btn {
  flex: 1; padding: 0.5rem; background: #0f172a;
  border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;
  border-radius: 0.5rem; font-size: 0.85rem; font-weight: 800;
  transition: all 0.15s;
}
.hour-quick-btn:hover { background: rgba(99,102,241,0.15); color: #fff; }
.hour-quick-btn--active { background: #6366f1; border-color: #6366f1; color: #fff; }

.date-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.date-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; display: flex; align-items: center; gap: 0.3rem; }
.date-input {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.1);
  color: #fff; border-radius: 0.5rem; padding: 0.4rem 0.75rem; font-size: 0.8rem; outline: none;
}

.log-btn {
  width: 100%; height: 3.25rem; background: linear-gradient(135deg, #10b981, #059669);
  border: none; border-radius: 0.75rem; color: #fff;
  font-size: 0.95rem; font-weight: 900; letter-spacing: 0.05em;
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  transition: all 0.15s; box-shadow: 0 4px 15px rgba(16,185,129,0.25);
}
.log-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.log-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; box-shadow: none; transform: none; }

.hwt-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
