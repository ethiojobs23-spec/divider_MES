<template>
  <div class="login-page">
    <!-- Header -->
    <div class="login-header">
      <button class="back-btn" @click="router.push('/hub')" title="Back to Module Hub">
        <span class="material-symbols-rounded">arrow_back</span>
      </button>
      <div class="header-logo">⚡</div>
      <div>
        <h1 class="header-title">Divider Manufacturing System</h1>
        <p class="header-sub">Select your operator profile and enter PIN to clock in/out</p>
      </div>

      <!-- Live Network Status Pill -->
      <div class="header-network-pill" :class="syncState.isOnline ? 'net--online' : 'net--offline'">
        <span class="material-symbols-rounded net-icon">{{ syncState.isOnline ? 'wifi' : 'wifi_off' }}</span>
        <span>{{ syncState.isOnline ? (syncState.isSyncing ? 'Syncing...' : 'Live Connected') : 'No Internet (Offline)' }}</span>
      </div>

      <!-- Live Headcount Badge -->
      <div class="header-headcount">
        <span class="gate-label">Floor Status</span>
        <span class="gate-value">{{ onShiftCount }} / {{ employeeOperators.length }} On Shift</span>
      </div>

      <!-- Time Gate Window -->
      <div class="header-time-gate">
        <span class="gate-label">Shift Window</span>
        <span class="gate-value">{{ activeWindowText }}</span>
      </div>

      <!-- Production Week -->
      <div class="header-week">
        <span class="week-label">Production Week</span>
        <span class="week-value">{{ store.currentProductionWeek }}</span>
      </div>
    </div>

    <!-- Search bar for operators -->
    <div class="search-bar-wrap mb-4" v-if="employeeOperators.length > 6">
      <span class="material-symbols-rounded search-icon">search</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search operator by name..."
        class="search-input"
      />
    </div>

    <!-- Operator Grid -->
    <div class="operator-grid">
      <button
        v-for="op in filteredEmployeeOperators"
        :key="op.id"
        class="operator-card cursor-pointer"
        :class="{ 'operator-card--active': store.isOperatorClockedIn(op.id) }"
        @click="openModal(op)"
      >
        <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="lg" customClass="mx-auto mb-3" />
        <p class="card-name">{{ op.name }}</p>
        <p class="card-role">{{ op.role }}</p>
        <div class="card-status" :class="store.isOperatorClockedIn(op.id) ? 'status--in' : 'status--out'">
          <span class="status-dot" />
          {{ store.isOperatorClockedIn(op.id) ? 'CLOCKED IN' : 'CLOCKED OUT' }}
        </div>
      </button>

      <div v-if="filteredEmployeeOperators.length === 0" class="col-span-full py-12 text-center text-slate-500">
        <span class="material-symbols-rounded text-3xl mb-2 block text-slate-600">person_off</span>
        <p>No operators found.</p>
      </div>
    </div>

    <!-- Modal Overlay -->
    <Transition name="fade">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card">
          <OperatorAvatar :avatar="modal.operator?.avatar" :name="modal.operator?.name" :color="modal.operator?.color" size="lg" />
          <h2 class="modal-name">{{ modal.operator?.name }}</h2>
          <p class="modal-role">{{ modal.operator?.role }}</p>

          <div class="modal-time">{{ currentTime }}</div>

          <!-- STEP 1: Operator PIN Verification (Required for Security) -->
          <div v-if="!isOperatorPinVerified" class="override-numpad-section">
            <h3 class="numpad-title">Enter Your 4-Digit PIN</h3>
            <p class="numpad-sub">
              {{ store.isOperatorClockedIn(modal.operator?.id) ? 'Enter PIN to Clock Out' : 'Enter PIN to Clock In' }}
            </p>

            <div class="pin-display" :class="{ 'pin-display--error': pinError }">
              <span v-for="i in 4" :key="i" class="pin-dot" :class="{ filled: i <= enteredPin.length }"></span>
            </div>

            <p v-if="pinError" class="text-rose-400 text-xs font-bold mb-2 animate-pulse">
              Incorrect PIN. Please try again.
            </p>

            <div class="virtual-numpad">
              <button class="num-key" v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" @click="appendPin(n)">{{ n }}</button>
              <button class="num-key fn-key" @click="clearPin()">C</button>
              <button class="num-key" @click="appendPin(0)">0</button>
              <button class="num-key fn-key" @click="backspacePin()">
                <span class="material-symbols-rounded">backspace</span>
              </button>
            </div>

            <button class="modal-btn modal-btn--cancel" @click="closeModal">Cancel</button>
          </div>

          <!-- STEP 2: Authenticated Clock In / Clock Out Actions -->
          <div v-else-if="!showOverride" class="modal-actions-container">
            <!-- Operator is already CLOCKED IN -> Prompt to CLOCK OUT -->
            <div v-if="store.isOperatorClockedIn(modal.operator?.id)" class="flex flex-col items-center gap-3 w-full">
              <div class="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <span class="material-symbols-rounded text-base">check_circle</span>
                Currently On Shift (Clocked In)
              </div>
              <button
                class="modal-btn modal-btn--out w-full cursor-pointer"
                @click="handleClockOut"
              >
                <span class="material-symbols-rounded">logout</span>
                CONFIRM CLOCK OUT
              </button>
            </div>

            <!-- Operator is CLOCKED OUT -> Check Time Gate -->
            <div v-else class="flex flex-col items-center gap-3 w-full">
              <!-- Allowed in Shift Window or Manager Override Authorized -->
              <button
                v-if="validation.allowed || isOverrideAuthorized"
                class="modal-btn modal-btn--in w-full cursor-pointer"
                @click="handleClockIn"
              >
                <span class="material-symbols-rounded">login</span>
                CONFIRM CLOCK IN
              </button>

              <!-- Denied: Outside Allowed Shift Window -->
              <div v-else class="denied-container w-full">
                <div class="denied-block w-full">
                  <span class="material-symbols-rounded text-rose-400">schedule</span>
                  <div>
                    <p class="font-extrabold text-xs">Outside Shift Window</p>
                    <p class="text-[0.7rem] opacity-90">{{ validation.message }}</p>
                  </div>
                </div>
                <button class="override-link mt-2" @click.prevent="showOverride = true">
                  <span class="material-symbols-rounded text-sm align-middle">lock_open</span>
                  Manager Override Required
                </button>
              </div>
            </div>
          </div>

          <!-- STEP 3: Virtual Numpad for Manager Override -->
          <div v-else class="override-numpad-section">
            <h3 class="numpad-title text-amber-400 flex items-center gap-1">
              <span class="material-symbols-rounded text-lg">admin_panel_settings</span>
              Manager Override
            </h3>
            <p class="numpad-sub">Enter Admin / Supervisor PIN to authorize clock-in</p>

            <div class="pin-display">
              <span v-for="i in 4" :key="i" class="pin-dot" :class="{ filled: i <= overridePin.length }"></span>
            </div>

            <div class="virtual-numpad">
              <button class="num-key" v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" @click="appendOverrideNum(n)">{{ n }}</button>
              <button class="num-key fn-key" @click="clearOverrideNum()">C</button>
              <button class="num-key" @click="appendOverrideNum(0)">0</button>
              <button class="num-key fn-key" @click="backspaceOverride()">
                <span class="material-symbols-rounded">backspace</span>
              </button>
            </div>
            <button class="modal-btn modal-btn--cancel" @click="showOverride = false">Back</button>
          </div>

          <button class="modal-close" @click="closeModal">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast-msg">
        <span class="material-symbols-rounded">check_circle</span>
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useMesStore } from '@/store/mesStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { syncState, syncManager } from '@/services/syncManager.js'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'

const router = useRouter()
const store = useMesStore()
const mesStore = store
const attendanceStore = useAttendanceStore()
const sysAuth = useSystemAuthStore()

// Filter all active floor operators (exclude system admin / manager / customer accounts)
const employeeOperators = computed(() => {
  const excludedRoles = ['admin', 'System Admin', 'manager', 'Supervisor', 'customer']
  return (store.operators || []).filter(o => {
    if (!o.name || o.is_active === false) return false
    return !excludedRoles.includes(o.role)
  })
})

const searchQuery = ref('')
const filteredEmployeeOperators = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return employeeOperators.value
  return employeeOperators.value.filter(o => (o.name || '').toLowerCase().includes(q))
})

const onShiftCount = computed(() => {
  return employeeOperators.value.filter(o => store.isOperatorClockedIn(o.id)).length
})

const modal = ref({ open: false, operator: null })

// PIN Verification state
const enteredPin = ref('')
const isOperatorPinVerified = ref(false)
const pinError = ref(false)

const validation = ref({ allowed: true, message: '' })
const showOverride = ref(false)
const overridePin = ref('')
const isOverrideAuthorized = ref(false)

// Toast
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2500)
}

const pad = (n) => String(n).padStart(2, '0')
const currentTime = computed(() => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const activeWindowText = computed(() => {
  const current = new Date().getHours() * 60 + new Date().getMinutes()
  const w = attendanceStore.clockingWindows.find(win => {
    const s = parseInt(win.start.split(':')[0]) * 60 + parseInt(win.start.split(':')[1])
    const e = parseInt(win.end.split(':')[0]) * 60 + parseInt(win.end.split(':')[1])
    return current >= s && current <= e
  })
  return w ? `${w.name} (${w.start} - ${w.end})` : 'Outside Shift Windows'
})

let pollInterval = null

onMounted(async () => {
  await store.fetchInitialData()
  await attendanceStore.fetchAttendance()

  // Live polling for guaranteed multi-device synchronization every 10s
  pollInterval = setInterval(async () => {
    if (navigator.onLine) {
      await attendanceStore.fetchAttendance()
    }
  }, 10000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

function openModal(op) { 
  modal.value = { open: true, operator: op } 
  const isOut = store.isOperatorClockedIn(op.id)
  validation.value = attendanceStore.validateClockTime(isOut ? 'out' : 'in')
  showOverride.value = false
  overridePin.value = ''
  isOverrideAuthorized.value = false
  enteredPin.value = ''
  isOperatorPinVerified.value = false
  pinError.value = false
}

function closeModal() {
  modal.value = { open: false, operator: null }
  enteredPin.value = ''
  isOperatorPinVerified.value = false
  pinError.value = false
}

// ── Operator PIN Handling ──────────────────────────────────────────────────
async function appendPin(n) {
  if (enteredPin.value.length < 4) {
    enteredPin.value += String(n)
    pinError.value = false
    
    if (enteredPin.value.length === 4) {
      const targetOp = modal.value.operator
      if (!targetOp) return
      
      // Verify against operator's PIN code
      if (targetOp.pin_code && targetOp.pin_code === enteredPin.value) {
        isOperatorPinVerified.value = true
        pinError.value = false
      } else {
        // Fallback: check against Supabase
        try {
          const { data } = await supabase
            .from('mes_operators')
            .select('pin_code')
            .eq('id', targetOp.id)
            .single()
            
          if (data && data.pin_code === enteredPin.value) {
            isOperatorPinVerified.value = true
            pinError.value = false
            return
          }
        } catch (e) {
          console.error('PIN verification error:', e)
        }

        pinError.value = true
        setTimeout(() => {
          enteredPin.value = ''
          pinError.value = false
        }, 1200)
      }
    }
  }
}

function backspacePin() {
  enteredPin.value = enteredPin.value.slice(0, -1)
  pinError.value = false
}

function clearPin() {
  enteredPin.value = ''
  pinError.value = false
}

// ── Clock Actions ──────────────────────────────────────────────────────────
async function handleClockIn() {
  const op = modal.value.operator
  if (!op) return
  
  mesStore.clockIn(op)
  mesStore.setOperator(op) // Set active operator for line workstation
  
  try {
    await attendanceStore.recordClockIn(op, isOverrideAuthorized.value)
    showToast(`${op.name} clocked in successfully!`)
  } catch (err) {
    console.error('Clock-in failed:', err)
    showToast('Failed to record clock-in')
  }
  
  closeModal()
  router.push('/production')
}

async function handleClockOut() {
  const op = modal.value.operator
  if (!op) return
  
  mesStore.clockOut(op)
  try {
    await attendanceStore.recordClockOut(op.id, true)
    showToast(`${op.name} clocked out successfully!`)
  } catch (err) {
    console.error('Clock-out error:', err)
    showToast(`${op.name} clocked out (queued offline)`)
  }

  closeModal()
}

// ── Manager Override ───────────────────────────────────────────────────────
async function appendOverrideNum(n) {
  if (overridePin.value.length < 4) {
    overridePin.value += String(n)
    if (overridePin.value.length === 4) {
      const result = await sysAuth.verifyPin(overridePin.value, 'admin')
      if (result.success) {
        isOverrideAuthorized.value = true
        showOverride.value = false
        validation.value.allowed = true
        showToast('Manager Override Authorized')
      } else {
        alert('Invalid Manager PIN')
        overridePin.value = ''
      }
    }
  }
}

function backspaceOverride() {
  overridePin.value = overridePin.value.slice(0, -1)
}

function clearOverrideNum() {
  overridePin.value = ''
}
</script>

<style scoped>
/* ── Root ────────────────────────────────────────────────────────────────── */
.login-page {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  font-family: 'Inter', sans-serif;
  box-sizing: border-box;
}

/* Header */
.login-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.back-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-radius: 50%;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  touch-action: pan-y;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}
.header-logo {
  font-size: 2rem;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  border-radius: .75rem;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.header-title { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; margin: 0; }
.header-sub   { font-size: .8rem;  color: #64748b; margin-top: .2rem; }

.header-network-pill {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  transition: all 0.3s ease;
}
.net--online {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.net--offline {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
  animation: pulse-border 1.5s infinite;
}
.net-icon {
  font-size: 1rem !important;
}
@keyframes pulse-border {
  0%, 100% { border-color: rgba(239, 68, 68, 0.4); }
  50% { border-color: rgba(239, 68, 68, 0.9); }
}

.header-headcount {
  text-align: right;
  background: rgba(99, 102, 241, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.header-time-gate {
  text-align: right;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.gate-label { display: block; font-size: .62rem; color: #94a3b8; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
.gate-value { font-size: 1rem; font-weight: 800; color: #34d399; }

.header-week  { text-align: right; }
.week-label   { display: block; font-size: .62rem; color: #64748b; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
.week-value   { font-size: 1rem; font-weight: 700; color: #a5b4fc; }

/* Search bar */
.search-bar-wrap {
  position: relative;
  max-width: 400px;
  width: 100%;
}
.search-icon {
  position: absolute; left: 0.75rem; top: 50%;
  transform: translateY(-50%); font-size: 1.1rem; color: #64748b;
}
.search-input {
  width: 100%; background: #1e293b;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem;
  padding: 0.65rem 1rem 0.65rem 2.5rem;
  font-size: 0.85rem; color: #fff; outline: none; font-family: inherit;
  box-sizing: border-box;
}
.search-input:focus { border-color: #6366f1; }

/* Operator Grid */
.operator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
  width: 100%;
}

.operator-card {
  background: #1e293b;
  border: 2px solid rgba(255,255,255,.07);
  border-radius: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: all .18s ease;
  -webkit-tap-highlight-color: transparent;
}
.operator-card:hover        { background: #253347; border-color: rgba(99,102,241,.4); transform: translateY(-2px); }
.operator-card:active       { transform: scale(.97); }
.operator-card--active      { border-color: rgba(16,185,129,.5); background: rgba(16,185,129,.07); }

.card-name   { font-size: 1.15rem; font-weight: 800; color: #f1f5f9; margin: 0; }
.card-role   { font-size: .7rem;   color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin: 0; }
.card-status {
  display: flex;
  align-items: center;
  gap: .3rem;
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .08em;
  padding: .2rem .65rem;
  border-radius: 999px;
}
.status--in  { background: rgba(16,185,129,.15);  color: #34d399; }
.status--out { background: rgba(100,116,139,.15); color: #64748b; }
.status-dot  { width: .45rem; height: .45rem; border-radius: 50%; background: currentColor; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 1rem;
}
.modal-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 1.5rem;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .75rem;
  width: 100%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
}

.modal-name { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; margin: 0; }
.modal-role { font-size: .72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
.modal-time { font-size: 2.2rem; font-weight: 800; color: #e2e8f0; letter-spacing: .06em; font-variant-numeric: tabular-nums; margin: 0.5rem 0; }

.modal-actions-container { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
.modal-btn {
  height: 3.75rem;
  width: 100%;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: .06em;
  border: none;
  border-radius: .75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  cursor: pointer;
  transition: all .15s ease;
}
.modal-btn:disabled { opacity: .3; cursor: not-allowed; }
.modal-btn--in  { background: linear-gradient(135deg,#059669,#10b981); color: #fff; }
.modal-btn--out { background: linear-gradient(135deg,#e11d48,#f43f5e); color: #fff; }
.modal-btn:not(:disabled):hover  { filter: brightness(1.1); transform: translateY(-1px); }
.modal-btn:not(:disabled):active { transform: scale(.97); }

/* Denied State */
.denied-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
}
.denied-block {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.override-link {
  color: #fbbf24;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.25);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}
.override-link:hover {
  background: rgba(245,158,11,0.2);
}

/* Numpad section */
.override-numpad-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}
.numpad-title {
  font-size: 1rem;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
}
.numpad-sub {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0 0 0.5rem 0;
}

.pin-display {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 0.75rem;
  transition: transform 0.15s;
}
.pin-display--error {
  transform: translateX(-4px);
}
.pin-dot {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  border: 2px solid #475569;
}
.pin-dot.filled {
  background: #6366f1;
  border-color: #6366f1;
  box-shadow: 0 0 8px rgba(99,102,241,0.5);
}
.pin-display--error .pin-dot.filled {
  background: #ef4444;
  border-color: #ef4444;
  box-shadow: 0 0 8px rgba(239,68,68,0.5);
}

.virtual-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  width: 100%;
  max-width: 240px;
}
.num-key {
  background: #334155;
  border: none;
  border-radius: 0.6rem;
  padding: 0.85rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s;
}
.num-key:active { transform: scale(0.93); background: #475569; }
.fn-key { color: #ef4444; background: rgba(239,68,68,0.1); }

.modal-btn--cancel {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8;
  margin-top: 0.5rem;
  height: 2.75rem;
  font-size: 0.85rem;
}
.modal-btn--cancel:hover {
  background: rgba(255,255,255,0.05);
  color: #fff;
}

.modal-close {
  position: absolute;
  top: .75rem; right: .75rem;
  background: rgba(255,255,255,.07);
  border: none;
  color: #94a3b8;
  border-radius: .5rem;
  width: 2rem; height: 2rem;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: .85rem;
}
.modal-close:hover { background: rgba(255,255,255,.12); color: #f1f5f9; }

/* ══ Toast ═══════════════════════════════════════════════════════════════════ */
.toast-msg {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,.95); color: #fff;
  border-radius: .75rem; padding: .75rem 1.5rem;
  font-size: .9rem; font-weight: 700;
  display: flex; align-items: center; gap: .5rem;
  backdrop-filter: blur(8px); z-index: 1000;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

/* ── Mobile Responsive ────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .login-page {
    padding: 1rem 1rem 3rem 1rem;
    height: auto;
    min-height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .login-header {
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .header-headcount, .header-time-gate, .header-week {
    margin-left: 0;
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .operator-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .operator-card {
    padding: 1.25rem 1rem;
  }
  .modal-card {
    padding: 1.5rem;
    margin: 1rem;
    max-width: calc(100vw - 2rem);
    max-height: 90vh;
    overflow-y: auto;
  }
}
</style>
