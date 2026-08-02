<template>
  <AppLayout>
    <div class="hwt-wrapper">

      <!-- ─── Header ─────────────────────────────────────────────────── -->
      <header class="hwt-header">
        <span class="material-symbols-rounded header-icon">schedule</span>
        <div class="header-text">
          <h1 class="header-title">TIME — Hourly Wage Tracker</h1>
          <p class="header-sub">1H = {{ rateRange.min }}–{{ rateRange.max }} Birr / {{ store.activeOperator?.name ?? 'No Operator' }}</p>
        </div>
        <div class="rate-display-chip">
          <span class="rate-label">Rate</span>
          <span class="rate-value">{{ hourlyRate }} Br/hr</span>
        </div>
      </header>

      <!-- ─── Body ──────────────────────────────────────────────────── -->
      <div class="hwt-body">

        <!-- LEFT: Rate Configurator + Summary -->
        <aside class="hwt-sidebar">

          <!-- Rate Slider Card -->
          <div class="card rate-card">
            <p class="card-label">
              <span class="material-symbols-rounded">tune</span>
              Hourly Rate (Birr)
            </p>
            <div class="rate-stepper">
              <button class="step-btn step-btn--down" @click="decrementRate" :disabled="hourlyRate <= rateRange.min">
                <span class="material-symbols-rounded">remove</span>
              </button>
              <div class="rate-display">
                <span class="rate-big">{{ hourlyRate }}</span>
                <span class="rate-unit">Birr/hr</span>
              </div>
              <button class="step-btn step-btn--up" @click="incrementRate" :disabled="hourlyRate >= rateRange.max">
                <span class="material-symbols-rounded">add</span>
              </button>
            </div>

            <!-- Rate Range Slider -->
            <div class="slider-wrapper">
              <span class="slider-min">{{ rateRange.min }}</span>
              <input
                type="range"
                class="rate-slider"
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
                class="preset-btn"
                :class="{ 'preset-btn--active': hourlyRate === preset }"
                @click="hourlyRate = preset"
              >{{ preset }} Br</button>
            </div>
          </div>

          <!-- Summary Card -->
          <div class="card summary-card">
            <p class="card-label">
              <span class="material-symbols-rounded">summarize</span>
              Session Summary
            </p>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="si-label">Hours</span>
                <span class="si-val">{{ totalHours }}<small>h</small></span>
              </div>
              <div class="summary-item">
                <span class="si-label">Rate</span>
                <span class="si-val">{{ hourlyRate }}<small>Br</small></span>
              </div>
              <div class="summary-item summary-item--gross">
                <span class="si-label">Gross Pay</span>
                <span class="si-val si-val--gross">{{ grossPay }}<small>Br</small></span>
              </div>
            </div>

            <!-- Entries Log -->
            <div class="log-list" v-if="logEntries.length">
              <p class="log-title">Hour Log</p>
              <div
                v-for="(entry, i) in logEntries"
                :key="i"
                class="log-entry"
              >
                <span class="log-meta">{{ entry.date }} · {{ entry.rate }}Br/hr</span>
                <span class="log-hours">{{ entry.hours }}h</span>
                <span class="log-pay">{{ (entry.rate * entry.hours).toFixed(0) }}Br</span>
                <button class="log-del" @click="removeEntry(i)">
                  <span class="material-symbols-rounded">delete</span>
                </button>
              </div>
            </div>
            <div v-else class="log-empty">No entries yet</div>
          </div>
        </aside>

        <!-- RIGHT: Hours Numpad -->
        <main class="hwt-main">
          <div class="numpad-card">
            <div class="numpad-top">
              <p class="numpad-context-label">Hours Worked</p>
              <div class="gross-preview" v-if="numpadHours">
                <span class="gp-label">Preview</span>
                <span class="gp-val">{{ (hourlyRate * parseInt(numpadHours || 0)).toFixed(0) }} Birr</span>
              </div>
            </div>

            <!-- Big hour steppers -->
            <div class="hour-quick-btns">
              <button
                v-for="q in quickHours"
                :key="q"
                class="hour-quick-btn"
                :class="{ 'hour-quick-btn--active': numpadHours === String(q) }"
                @click="numpadHours = String(q)"
              >{{ q }}h</button>
            </div>

            <VirtualNumpad
              label="Hours Worked"
              v-model="numpadHours"
              :maxLen="3"
            />

            <!-- Date input -->
            <div class="date-row">
              <label class="date-label">
                <span class="material-symbols-rounded">calendar_today</span>
                Date
              </label>
              <input type="date" class="date-input" v-model="entryDate" />
            </div>

            <button
              class="log-btn"
              :disabled="!canLog"
              @click="logHours"
            >
              <span class="material-symbols-rounded">add_circle</span>
              LOG {{ numpadHours || '0' }}h × {{ hourlyRate }}Br = {{ computedGross }} Birr
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
import { ref, reactive, computed } from 'vue'
import AppLayout  from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ─── Rate Config ───────────────────────────────────────────────────────────
const rateRange   = { min: 15, max: 30, step: 1 }
const ratePresets = [15, 18, 20, 22, 25, 28, 30]
const hourlyRate  = ref(15)

function incrementRate() { if (hourlyRate.value < rateRange.max) hourlyRate.value++ }
function decrementRate() { if (hourlyRate.value > rateRange.min) hourlyRate.value-- }

// ─── Numpad & Entry ────────────────────────────────────────────────────────
const numpadHours = ref('')
const quickHours  = [4, 6, 8, 10, 12]

const today = new Date().toISOString().split('T')[0]
const entryDate = ref(today)

const canLog = computed(() => parseInt(numpadHours.value, 10) > 0)

const computedGross = computed(() => {
  const h = parseInt(numpadHours.value, 10) || 0
  return (hourlyRate.value * h).toFixed(0)
})

// ─── Log Entries ───────────────────────────────────────────────────────────
const logEntries = ref([])

const totalHours = computed(() =>
  logEntries.value.reduce((s, e) => s + e.hours, 0)
)
const grossPay = computed(() =>
  logEntries.value.reduce((s, e) => s + e.rate * e.hours, 0).toFixed(0)
)

function logHours() {
  const h = parseInt(numpadHours.value, 10)
  if (!h) return
  logEntries.value.push({
    date:  entryDate.value,
    hours: h,
    rate:  hourlyRate.value,
    operator: store.activeOperator?.name ?? '—',
  })
  showToast(`${h}h @ ${hourlyRate.value}Br = ${(hourlyRate.value * h).toFixed(0)} Birr logged`)
  numpadHours.value = ''
}

function removeEntry(i) {
  logEntries.value.splice(i, 1)
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
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .9rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.25);
  flex-shrink: 0;
}
.header-icon { font-size: 2rem; color: #f59e0b; }
.header-text { flex: 1; }
.header-title { font-size: 1.05rem; font-weight: 800; color: #f1f5f9; line-height: 1.2; }
.header-sub   { font-size: .65rem; color: #64748b; }

.rate-display-chip {
  background: rgba(245,158,11,.1);
  border: 1px solid rgba(245,158,11,.3);
  border-radius: .65rem;
  padding: .45rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .1rem;
  flex-shrink: 0;
}
.rate-label { font-size: .55rem; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: .08em; }
.rate-value { font-size: 1rem; font-weight: 800; color: #fbbf24; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.hwt-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.hwt-sidebar {
  width: 28rem;
  flex-shrink: 0;
  background: #0f172a;
  border-right: 1px solid rgba(255,255,255,.06);
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: 1rem;
  overflow-y: auto;
}

.card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.card-label {
  display: flex;
  align-items: center;
  gap: .35rem;
  font-size: .65rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.card-label .material-symbols-rounded { font-size: 1rem; }

/* ── Rate Stepper ────────────────────────────────────────────────────────── */
.rate-stepper {
  display: flex;
  align-items: center;
  gap: .75rem;
  justify-content: center;
}
.step-btn {
  width: 3.5rem; height: 3.5rem;
  border-radius: .65rem;
  border: 1.5px solid rgba(255,255,255,.12);
  background: #0f172a;
  color: #e2e8f0;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .13s ease;
  flex-shrink: 0;
}
.step-btn:not(:disabled):hover { background: #334155; }
.step-btn:not(:disabled):active { transform: scale(.93); }
.step-btn:disabled { opacity: .3; cursor: not-allowed; }
.step-btn--up { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); color: #fbbf24; }
.step-btn--up:not(:disabled):hover { background: rgba(245,158,11,.25); }
.step-btn .material-symbols-rounded { font-size: 1.5rem; }

.rate-display { flex: 1; text-align: center; }
.rate-big { font-size: 3.5rem; font-weight: 900; color: #fbbf24; font-variant-numeric: tabular-nums; line-height: 1; }
.rate-unit { display: block; font-size: .65rem; color: #92400e; font-weight: 700; }

/* ── Slider ──────────────────────────────────────────────────────────────── */
.slider-wrapper {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.slider-min, .slider-max { font-size: .65rem; color: #64748b; font-weight: 700; flex-shrink: 0; }
.rate-slider {
  flex: 1;
  accent-color: #f59e0b;
  height: .35rem;
  cursor: pointer;
}

/* ── Presets ─────────────────────────────────────────────────────────────── */
.rate-presets { display: flex; gap: .4rem; flex-wrap: wrap; }
.preset-btn {
  flex: 1;
  min-width: 3.5rem;
  height: 2.5rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .45rem;
  color: #94a3b8;
  font-size: .78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all .13s ease;
}
.preset-btn:hover { background: #1e293b; color: #e2e8f0; }
.preset-btn--active { background: rgba(245,158,11,.15); border-color: #f59e0b; color: #fbbf24; }

/* ── Summary ─────────────────────────────────────────────────────────────── */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .5rem;
}
.summary-item {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .55rem;
  padding: .65rem;
  display: flex;
  flex-direction: column;
  gap: .1rem;
}
.summary-item--gross { grid-column: span 2; }
.si-label { font-size: .6rem; color: #475569; text-transform: uppercase; font-weight: 700; letter-spacing: .07em; }
.si-val   { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; font-variant-numeric: tabular-nums; line-height: 1.1; }
.si-val small { font-size: .6rem; color: #64748b; margin-left: .15rem; }
.si-val--gross { font-size: 1.8rem; color: #34d399; }

/* Log */
.log-title { font-size: .65rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
.log-list { display: flex; flex-direction: column; gap: .3rem; }
.log-entry {
  display: flex;
  align-items: center;
  gap: .5rem;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: .45rem;
  padding: .45rem .65rem;
}
.log-meta  { flex: 1; font-size: .65rem; color: #64748b; }
.log-hours { font-size: .85rem; font-weight: 700; color: #fbbf24; font-variant-numeric: tabular-nums; }
.log-pay   { font-size: .85rem; font-weight: 800; color: #34d399; min-width: 4rem; text-align: right; }
.log-del {
  width: 1.6rem; height: 1.6rem;
  background: rgba(239,68,68,.1);
  border: none;
  border-radius: .35rem;
  color: #f87171;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.log-del:hover { background: rgba(239,68,68,.25); }
.log-del .material-symbols-rounded { font-size: .9rem; }
.log-empty { font-size: .75rem; color: #334155; text-align: center; padding: .5rem 0; }

/* ── Main Numpad Area ────────────────────────────────────────────────────── */
.hwt-main {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 1rem 1.5rem;
  overflow: hidden;
}
.numpad-card {
  flex: 1;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.numpad-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.numpad-context-label {
  font-size: .65rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.gross-preview {
  display: flex;
  align-items: center;
  gap: .5rem;
  background: rgba(52,211,153,.1);
  border: 1px solid rgba(52,211,153,.25);
  border-radius: .5rem;
  padding: .3rem .85rem;
}
.gp-label { font-size: .6rem; color: #059669; font-weight: 700; }
.gp-val   { font-size: 1rem; font-weight: 800; color: #34d399; font-variant-numeric: tabular-nums; }

/* ── Quick Hour Buttons ──────────────────────────────────────────────────── */
.hour-quick-btns { display: flex; gap: .5rem; }
.hour-quick-btn {
  flex: 1;
  height: 3.25rem;
  background: #0f172a;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: .55rem;
  color: #94a3b8;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.hour-quick-btn:hover { background: #1e293b; color: #e2e8f0; }
.hour-quick-btn:active { transform: scale(.95); }
.hour-quick-btn--active {
  background: rgba(245,158,11,.15);
  border-color: #f59e0b;
  color: #fbbf24;
}

/* ── Date Row ────────────────────────────────────────────────────────────── */
.date-row {
  display: flex;
  align-items: center;
  gap: .75rem;
}
.date-label {
  display: flex;
  align-items: center;
  gap: .35rem;
  font-size: .7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .07em;
  flex-shrink: 0;
}
.date-label .material-symbols-rounded { font-size: 1rem; }
.date-input {
  flex: 1;
  height: 3rem;
  background: #0f172a;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: .55rem;
  color: #e2e8f0;
  font-size: .95rem;
  font-weight: 600;
  padding: 0 .85rem;
  outline: none;
  font-family: inherit;
  transition: border-color .13s;
}
.date-input:focus { border-color: #6366f1; }

/* ── Log Button ──────────────────────────────────────────────────────────── */
.log-btn {
  height: 5rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: .85rem;
  color: #1c1917;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: .06em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  transition: all .13s ease;
  flex-shrink: 0;
}
.log-btn:disabled { opacity: .35; cursor: not-allowed; }
.log-btn:not(:disabled):hover  { filter: brightness(1.1); }
.log-btn:not(:disabled):active { transform: scale(.98); }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.hwt-toast {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(245,158,11,.9);
  color: #1c1917;
  border-radius: .65rem;
  padding: .75rem 1.5rem;
  font-size: .9rem;
  font-weight: 800;
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
